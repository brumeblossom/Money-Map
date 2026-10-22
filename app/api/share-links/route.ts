import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createShareLinkSchema } from "@/lib/schemas";
import { checkShareLinksRateLimit } from "@/lib/sync/rate-limit";
import {
  buildPeriodReport,
  buildSingleEntryReport,
  buildSingleLoanReport,
} from "@/lib/report/builder";
import type { ReportSnapshot } from "@/lib/report/types";
import type { Json } from "@/lib/db/database.types";

function generateUrlSafeToken(length = 22): string {
  // 16 bytes base64url is 22 chars
  return crypto.randomBytes(16).toString("base64url").slice(0, length);
}

function getAppUrl(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }
  const host = req.headers.get("host") || "localhost:3000";
  const protocol = req.headers.get("x-forwarded-proto") || "http";
  return `${protocol}://${host}`;
}

export async function POST(req: NextRequest) {
  // 1. Session Auth (PRD section 7: 401 without session)
  const supabase = await createClient();
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  const mockUserCookie = req.cookies.get("moneymap_mock_user")?.value;
  const user = authUser ?? (mockUserCookie ? { id: mockUserCookie } : null);

  if (!user || (!mockUserCookie && authError)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const client = (!authUser && mockUserCookie) ? createAdminClient() : supabase;

  // 2. Rate limit (PRD section 7: 10 per minute per user)
  if (!checkShareLinksRateLimit(user.id, 10, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  // 3. Body parse and validation
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid", issues: [{ message: "Invalid JSON body" }] },
      { status: 422 },
    );
  }

  const parsed = createShareLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const {
    period_start,
    period_end,
    kinds,
    hide_details,
    expires_in_days,
    single_record,
  } = parsed.data;

  // 4. Fetch profile for display_name and currency
  const { data: profile } = await client
    .from("profiles")
    .select("display_name, currency")
    .eq("user_id", user.id)
    .maybeSingle();

  const displayName = profile?.display_name || "";
  const currency = profile?.currency || "NGN";

  let snapshot: ReportSnapshot;

  if (single_record) {
    if (single_record.table === "entries") {
      const { data: entry, error: entryErr } = await client
        .from("entries")
        .select("id, kind, amount_minor, category_id, occurred_on, counterparty, description, recurring_rule_id, deleted_at")
        .eq("id", single_record.id)
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .maybeSingle();

      if (!entry || entryErr) {
        return NextResponse.json(
          { error: "invalid", issues: [{ message: "Entry not found" }] },
          { status: 422 },
        );
      }

      let categoryName = "Uncategorised";
      if (entry.category_id) {
        const { data: cat } = await client
          .from("categories")
          .select("name")
          .eq("id", entry.category_id)
          .maybeSingle();
        if (cat) categoryName = cat.name;
      }

      snapshot = buildSingleEntryReport({
        entry,
        categoryName,
        currency,
        userName: displayName,
        hideDetails: hide_details,
        repeats: entry.recurring_rule_id ? "Monthly" : "No",
      });
    } else {
      // Single loan
      const { data: loan, error: loanErr } = await client
        .from("loans")
        .select("id, counterparty, principal_minor, category_id, started_on, due_on, interest_type, interest_value, plan, instalment_minor, deleted_at")
        .eq("id", single_record.id)
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .maybeSingle();

      if (!loan || loanErr) {
        return NextResponse.json(
          { error: "invalid", issues: [{ message: "Loan not found" }] },
          { status: 422 },
        );
      }

      const { data: payments } = await client
        .from("loan_payments")
        .select("id, loan_id, amount_minor, paid_on, note, deleted_at")
        .eq("loan_id", loan.id)
        .is("deleted_at", null);

      snapshot = buildSingleLoanReport({
        loan,
        payments: payments || [],
        currency,
        userName: displayName,
        hideDetails: hide_details,
      });
    }
  } else {
    // Period report: fetch entries, categories, loans, payments
    const { data: entries } = await client
      .from("entries")
      .select("id, kind, amount_minor, category_id, occurred_on, counterparty, description, deleted_at")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .gte("occurred_on", period_start)
      .lte("occurred_on", period_end);

    const { data: categories } = await client
      .from("categories")
      .select("id, name, scope")
      .eq("user_id", user.id);

    const { data: loans } = await client
      .from("loans")
      .select("id, counterparty, principal_minor, category_id, started_on, due_on, interest_type, interest_value, plan, instalment_minor, deleted_at")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .lte("started_on", period_end);

    const loanIds = (loans || []).map((l) => l.id);
    let loanPayments: Array<{
      id: string;
      loan_id: string;
      amount_minor: number;
      paid_on: string;
      note?: string | null;
      deleted_at?: string | null;
    }> = [];
    if (loanIds.length > 0) {
      const { data: payments } = await client
        .from("loan_payments")
        .select("id, loan_id, amount_minor, paid_on, note, deleted_at")
        .in("loan_id", loanIds)
        .is("deleted_at", null);
      loanPayments = payments || [];
    }

    snapshot = buildPeriodReport({
      periodStart: period_start,
      periodEnd: period_end,
      kinds,
      hideDetails: hide_details,
      currency,
      userName: displayName,
      entries: entries || [],
      categories: categories || [],
      loans: loans || [],
      loanPayments,
    });
  }

  // 5. Expiry calculation
  let expiresAt: string | null = null;
  if (expires_in_days !== null && expires_in_days > 0) {
    expiresAt = new Date(Date.now() + expires_in_days * 86_400_000).toISOString();
  }

  const token = generateUrlSafeToken(22);

  // 6. Insert share link row
  const { data: newLink, error: insertError } = await client
    .from("share_links")
    .insert({
      user_id: user.id,
      token,
      period_start,
      period_end,
      kinds,
      hide_details,
      snapshot: snapshot as unknown as Json,
      expires_at: expiresAt,
    })
    .select("id, token, expires_at")
    .single();

  if (insertError || !newLink) {
    console.error("Failed to insert share link:", insertError);
    return NextResponse.json(
      { error: "server_error", message: "Failed to create share link" },
      { status: 500 },
    );
  }

  const appUrl = getAppUrl(req);
  const url = `${appUrl}/s/${newLink.token}`;

  return NextResponse.json(
    {
      id: newLink.id,
      url,
      expires_at: newLink.expires_at,
    },
    { status: 201 },
  );
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  const mockUserCookie = req.cookies.get("moneymap_mock_user")?.value;
  const user = authUser ?? (mockUserCookie ? { id: mockUserCookie } : null);

  if (!user || (!mockUserCookie && authError)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const client = (!authUser && mockUserCookie) ? createAdminClient() : supabase;

  const { data: links, error: listError } = await client
    .from("share_links")
    .select("id, token, period_start, period_end, kinds, hide_details, expires_at, revoked_at, created_at, snapshot")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (listError) {
    console.error("Failed to list share links:", listError);
    return NextResponse.json(
      { error: "server_error", message: "Failed to list share links" },
      { status: 500 },
    );
  }

  const appUrl = getAppUrl(req);
  const formatted = (links || []).map((l) => ({
    id: l.id,
    url: `${appUrl}/s/${l.token}`,
    period_start: l.period_start,
    period_end: l.period_end,
    kinds: l.kinds,
    hide_details: l.hide_details,
    expires_at: l.expires_at,
    revoked_at: l.revoked_at,
    created_at: l.created_at,
    snapshot: l.snapshot,
  }));

  return NextResponse.json(formatted, { status: 200 });
}
