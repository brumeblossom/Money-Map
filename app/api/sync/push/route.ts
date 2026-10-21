import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  syncPushSchema,
  type SyncableTableName,
} from "@/lib/schemas";
import { checkSyncRateLimit } from "@/lib/sync/rate-limit";

// Upsert tables in foreign key dependency order
const TABLE_ORDER: SyncableTableName[] = [
  "profiles",
  "categories",
  "loans",
  "entries",
  "loan_payments",
  "recurring_rules",
];

export async function POST(req: NextRequest) {
  // 1. Session Authentication (PRD section 7: 401 without a session)
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user || authError) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. Rate Limiting (PRD section 7: 60 requests per minute per user -> 429)
  if (!checkSyncRateLimit(user.id)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  // 3. Request Body Parsing & Validation (PRD section 7: 422 on invalid input)
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid", issues: [{ message: "Invalid JSON body" }] },
      { status: 422 },
    );
  }

  const parsed = syncPushSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const { changes } = parsed.data;
  const applied: string[] = [];
  const skipped: string[] = [];
  const remappedCategoryIds = new Map<string, string>();

  if (changes.length === 0) {
    return NextResponse.json({ applied, skipped }, { status: 200 });
  }

  // 4. Process changes by table in dependency order (Last-write-wins by updated_at)
  for (const table of TABLE_ORDER) {
    const tableChanges = changes.filter((c) => c.table === table);
    if (tableChanges.length === 0) continue;

    // Fetch existing server copies for these rows
    const existingMap = new Map<string, { id?: string; user_id?: string; updated_at: string }>();

    if (table === "profiles") {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, updated_at")
        .eq("user_id", user.id);

      if (!error && data) {
        for (const row of data) {
          existingMap.set(row.user_id, row);
        }
      }
    } else {
      const ids = tableChanges.map((c) => (c.row as { id: string }).id);
      const { data, error } = await supabase
        .from(table)
        .select("id, updated_at")
        .in("id", ids)
        .eq("user_id", user.id);

      if (!error && data) {
        for (const row of data as { id: string; updated_at: string }[]) {
          existingMap.set(row.id, row);
        }
      }
    }

    // For categories, also fetch user categories by scope/name to merge duplicates
    let existingUserCategories: {
      id: string;
      scope: string;
      name: string;
      slug: string | null;
      updated_at: string;
    }[] = [];

    if (table === "categories") {
      const { data } = await supabase
        .from("categories")
        .select("id, scope, name, slug, updated_at")
        .eq("user_id", user.id);

      if (data) {
        existingUserCategories = data;
      }
    }

    // Determine applied vs skipped per row
    const toUpsert: Record<string, unknown>[] = [];

    for (const change of tableChanges) {
      // Re-point category_id if remapped
      if (remappedCategoryIds.size > 0 && "category_id" in change.row) {
        const oldCatId = (change.row as { category_id: string }).category_id;
        const remapped = remappedCategoryIds.get(oldCatId);
        if (remapped) {
          (change.row as { category_id: string }).category_id = remapped;
        }
      }

      const id =
        table === "profiles"
          ? user.id
          : (change.row as { id: string }).id;

      // Check category duplicate on server by (scope, slug || name)
      if (table === "categories") {
        const catRow = change.row as {
          id: string;
          scope: string;
          name: string;
          slug?: string | null;
          updated_at: string;
        };
        const matchingServerCat = existingUserCategories.find(
          (c) =>
            c.id !== catRow.id &&
            c.scope === catRow.scope &&
            ((catRow.slug && c.slug === catRow.slug) ||
              c.name.trim().toLowerCase() === catRow.name.trim().toLowerCase()),
        );

        if (matchingServerCat) {
          remappedCategoryIds.set(catRow.id, matchingServerCat.id);
          applied.push(catRow.id);

          const incomingTime = new Date(catRow.updated_at).getTime();
          const serverTime = new Date(matchingServerCat.updated_at).getTime();
          if (incomingTime > serverTime) {
            toUpsert.push({
              ...catRow,
              id: matchingServerCat.id,
              user_id: user.id,
            });
          }
          continue;
        }
      }

      const incomingUpdatedAt = new Date(change.row.updated_at).getTime();
      const serverRow = existingMap.get(id);

      if (serverRow) {
        const serverUpdatedAt = new Date(serverRow.updated_at).getTime();
        // A row is skipped when the server copy has a later updated_at
        if (serverUpdatedAt > incomingUpdatedAt) {
          skipped.push(id);
          continue;
        }
      }

      applied.push(id);

      // Force user_id to the authenticated caller session
      const rowToUpsert = {
        ...change.row,
        user_id: user.id,
      };

      // Strip client-side transient fields if present
      delete (rowToUpsert as { server_updated_at?: string }).server_updated_at;

      toUpsert.push(rowToUpsert);
    }

    // Upsert into Supabase
    if (toUpsert.length > 0) {
      if (table === "profiles") {
        const { error } = await supabase
          .from("profiles")
          .upsert(toUpsert as never[], { onConflict: "user_id" });

        if (error) {
          console.error(`Error upserting profiles:`, error);
          throw new Error(`Failed to upsert profiles: ${error.message}`);
        }
      } else {
        const { error } = await supabase
          .from(table)
          .upsert(toUpsert as never[], { onConflict: "id" });

        if (error) {
          console.error(`Error upserting ${table}:`, error);
          throw new Error(`Failed to upsert ${table}: ${error.message}`);
        }
      }
    }
  }

  return NextResponse.json({ applied, skipped }, { status: 200 });
}
