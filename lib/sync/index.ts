import {
  db,
  type MoneyMapDatabase,
  type SyncableTable,
  type CategoryRow,
  type EntryRow,
  type LoanRow,
  type LoanPaymentRow,
  type RecurringRuleRow,
  type ProfileRow,
} from "@/lib/db/dexie";
import { getCurrentUserId, setCurrentUserId } from "@/lib/repo/user";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import { mergeGuestCategories } from "./category-merge";
import { cleanupDuplicateCategories } from "@/lib/repo/seed";

export * from "./rate-limit";
export * from "./category-merge";

export type SyncState = "synced" | "syncing" | "offline" | "error";

export interface SyncStatusInfo {
  status: SyncState;
  outboxCount: number;
  label: string;
}

// Global state for sync engine
let currentStatus: SyncState = "synced";
let isRunning = false;
let queuedRerun = false;
let retryAttempt = 0;
let backoffTimer: ReturnType<typeof setTimeout> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let isInitialized = false;

// Subscribers for status updates
const statusListeners = new Set<(status: SyncState) => void>();

export function getSyncStatus(): SyncState {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "offline";
  }
  return currentStatus;
}

function setSyncStatus(status: SyncState): void {
  currentStatus = status;
  for (const listener of statusListeners) {
    try {
      listener(status);
    } catch (e) {
      console.error("Error in sync status listener", e);
    }
  }
}

export function subscribeSyncStatus(listener: (status: SyncState) => void): () => void {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

const BACKOFF_DELAYS = [5000, 15000, 60000, 300000];

function getBackoffDelay(attempt: number): number {
  if (attempt >= BACKOFF_DELAYS.length) {
    return BACKOFF_DELAYS[BACKOFF_DELAYS.length - 1]; // 5 minutes
  }
  return BACKOFF_DELAYS[attempt];
}

/**
 * Schedule a debounced sync cycle after local writes (PRD Section 8: 2 s debounced).
 */
export function scheduleDebouncedSync(delayMs = 2000, database: MoneyMapDatabase = db): void {
  if (typeof window === "undefined") return;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    run(database).catch((err) => {
      console.error("Debounced sync error:", err);
    });
  }, delayMs);
}

/**
 * Step 1: Push outbox rows to POST /api/sync/push (PRD Section 8)
 * Reads up to 500 items, sends current rows, and removes applied/skipped items.
 */
export async function push(
  database: MoneyMapDatabase = db,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<{ applied: string[]; skipped: string[] }> {
  const userId = getCurrentUserId();
  if (!userId) {
    return { applied: [], skipped: [] };
  }

  let totalApplied: string[] = [];
  let totalSkipped: string[] = [];

  // Loop until outbox is empty
  while (true) {
    const outboxItems = await database.outbox.orderBy("seq").limit(500).toArray();
    if (outboxItems.length === 0) break;

    // Deduplicate by (table, row_id) and build changes array
    const seen = new Set<string>();
    const changes: { table: SyncableTable; row: Record<string, unknown> }[] = [];
    const missingSeqs: number[] = [];

    for (const item of outboxItems) {
      const key = `${item.table}:${item.row_id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const tableRef = database.table(item.table);
      const row = (await tableRef.get(item.row_id)) as Record<string, unknown> | undefined;

      if (!row) {
        if (item.seq !== undefined) missingSeqs.push(item.seq);
        continue;
      }

      changes.push({
        table: item.table,
        row: {
          ...row,
          user_id: userId,
        },
      });
    }

    // Clean up any missing outbox items
    if (missingSeqs.length > 0) {
      await database.outbox.bulkDelete(missingSeqs);
    }

    if (changes.length === 0) {
      break;
    }

    const res = await fetchFn("/api/sync/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ changes }),
    });

    if (!res.ok) {
      if (res.status === 422) {
        // Permanent rejection: remove rejected items from outbox to prevent infinite stalling
        const stuckRowIds = changes.map((c) => (c.row as { id: string }).id);
        const toDelete = outboxItems
          .filter((item) => stuckRowIds.includes(item.row_id) && item.seq !== undefined)
          .map((item) => item.seq as number);
        await database.outbox.bulkDelete(toDelete);
        console.error("Permanent 422 sync rejection; removed stuck items from outbox:", stuckRowIds);
        break;
      }
      throw new Error(`Sync push failed with status ${res.status}`);
    }

    const result = (await res.json()) as { applied: string[]; skipped: string[] };
    totalApplied = [...totalApplied, ...(result.applied ?? [])];
    totalSkipped = [...totalSkipped, ...(result.skipped ?? [])];

    const resolvedIds = new Set([...(result.applied ?? []), ...(result.skipped ?? [])]);

    // Remove the items that came back as applied or skipped
    const seqsToDelete = outboxItems
      .filter((item) => resolvedIds.has(item.row_id) && item.seq !== undefined)
      .map((item) => item.seq as number);

    if (seqsToDelete.length > 0) {
      await database.outbox.bulkDelete(seqsToDelete);
    }

    // If batch was smaller than 500 or outbox is drained, stop
    if (outboxItems.length < 500) break;
  }

  return { applied: totalApplied, skipped: totalSkipped };
}

/**
 * Step 2: Pull rows from GET /api/sync/pull?since=<meta.last_pull_at> (PRD Section 8)
 * Loops while has_more is true; keeps whichever copy has the later updated_at;
 * saves server_time as the new last_pull_at.
 */
export async function pull(
  database: MoneyMapDatabase = db,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId) return;

  const lastPullMeta = await database.meta.get("last_pull_at");
  let since = (lastPullMeta?.value as string) || "";

  while (true) {
    const url = since
      ? `/api/sync/pull?since=${encodeURIComponent(since)}`
      : "/api/sync/pull";

    const res = await fetchFn(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Sync pull failed with status ${res.status}`);
    }

    const data = (await res.json()) as {
      rows: {
        categories: CategoryRow[];
        entries: EntryRow[];
        loans: LoanRow[];
        loan_payments: LoanPaymentRow[];
        recurring_rules: RecurringRuleRow[];
        profiles: ProfileRow[];
      };
      server_time: string;
      has_more: boolean;
    };

    // 1. Guest category merge: merge default categories with matching slug
    if (data.rows.categories && data.rows.categories.length > 0) {
      await mergeGuestCategories(data.rows.categories, database);
    }

    // 2. Apply rows using last-write-wins on updated_at
    const tables: SyncableTable[] = [
      "profiles",
      "categories",
      "loans",
      "entries",
      "loan_payments",
      "recurring_rules",
    ];

    for (const tableName of tables) {
      const incomingRows = data.rows[tableName] ?? [];
      const tableRef = database.table(tableName);

      for (const row of incomingRows as Record<string, unknown>[]) {
        const idKey = tableName === "profiles" ? "user_id" : "id";
        const key = row[idKey] as string;
        if (!key) continue;

        const localRow = (await tableRef.get(key)) as Record<string, unknown> | undefined;

        if (!localRow) {
          await tableRef.put(row);
        } else {
          const incomingTime = new Date(row.updated_at as string).getTime();
          const localTime = new Date(localRow.updated_at as string).getTime();

          // Keep whichever copy has the later updated_at
          if (incomingTime >= localTime) {
            await tableRef.put(row);
          }
        }
      }
    }

    // Save server_time as the new last_pull_at
    await database.meta.put({
      key: "last_pull_at",
      value: data.server_time,
    });

    if (!data.has_more) {
      break;
    }

    since = data.server_time;
  }

  // Ensure duplicate categories are cleaned up after pull
  await cleanupDuplicateCategories(database);
}

/**
 * Main sync cycle: push then pull (PRD Section 8).
 * Never runs two cycles at once.
 */
export async function run(
  database: MoneyMapDatabase = db,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<void> {
  // Only when signed in and online
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    setSyncStatus("offline");
    return;
  }

  const userId = getCurrentUserId();
  if (!userId) {
    // Guest mode: do not sync
    return;
  }

  // Concurrency guard: Never run two cycles at once
  if (isRunning) {
    queuedRerun = true;
    return;
  }

  isRunning = true;
  setSyncStatus("syncing");

  try {
    // 1. Push
    await push(database, fetchFn);

    // 2. Pull
    await pull(database, fetchFn);

    // Success: reset backoff
    retryAttempt = 0;
    if (backoffTimer) {
      clearTimeout(backoffTimer);
      backoffTimer = null;
    }
    setSyncStatus("synced");
  } catch (error) {
    console.error("Sync cycle error:", error);
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSyncStatus("offline");
    } else {
      setSyncStatus("error");
    }

    // Network error backoff retry: 5 s, 15 s, 60 s, then every 5 min
    const delay = getBackoffDelay(retryAttempt);
    retryAttempt++;

    if (backoffTimer) clearTimeout(backoffTimer);
    backoffTimer = setTimeout(() => {
      backoffTimer = null;
      run(database, fetchFn).catch((e) => {
        console.error("Backoff retry failed:", e);
      });
    }, delay);
  } finally {
    isRunning = false;

    if (queuedRerun) {
      queuedRerun = false;
      setTimeout(() => {
        run(database, fetchFn).catch((e) => {
          console.error("Queued rerun failed:", e);
        });
      }, 0);
    }
  }
}

/**
 * Initialize sync listeners and background triggers (PRD Section 8)
 * - app start
 * - browser online event
 * - 2 s after local writes debounced (wired via repo)
 * - every 60 s while visible
 * - on visibilitychange
 */
export function initSync(database: MoneyMapDatabase = db): () => void {
  if (typeof window === "undefined" || isInitialized) {
    return () => {};
  }
  isInitialized = true;

  // 1. Online / Offline events
  const handleOnline = () => {
    retryAttempt = 0;
    if (backoffTimer) {
      clearTimeout(backoffTimer);
      backoffTimer = null;
    }
    run(database).catch((e) => console.error("Sync on online failed:", e));
  };

  const handleOffline = () => {
    setSyncStatus("offline");
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // 2. Visibility change event
  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      run(database).catch((e) => console.error("Sync on visibilitychange failed:", e));
    }
  };
  document.addEventListener("visibilitychange", handleVisibilityChange);

  // 3. 60 s interval while visible
  const intervalId = setInterval(() => {
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      run(database).catch((e) => console.error("Periodic sync failed:", e));
    }
  }, 60000);

  // 4. Initial run on app start if user is already signed in
  const supabase = createBrowserSupabaseClient();
  supabase.auth.getSession().then(({ data }) => {
    let userId = data?.session?.user?.id ?? null;
    if (!userId && typeof document !== "undefined") {
      const match = document.cookie.match(/moneymap_mock_user=([^;]+)/);
      if (match) userId = match[1];
    }
    if (userId) {
      setCurrentUserId(userId);
      run(database).catch((e) => console.error("Initial sync run failed:", e));
    }
  });

  const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user?.id) {
      setCurrentUserId(session.user.id);
      run(database).catch((e) => console.error("Auth change sync run failed:", e));
    } else {
      setCurrentUserId(null);
    }
  });

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    clearInterval(intervalId);
    authListener?.subscription.unsubscribe();
    isInitialized = false;
  };
}

/**
 * Sign out: final push if online, then clear Dexie, go to /welcome (PRD Section 8).
 */
export async function signOut(
  database: MoneyMapDatabase = db,
  router?: { push: (url: string) => void },
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<void> {
  // 1. Run one last push if online
  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      await push(database, fetchFn);
    } catch (e) {
      console.warn("Final push on sign out warning:", e);
    }
  }

  // 2. Sign out of Supabase auth
  try {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
  } catch (e) {
    console.error("Supabase signOut error:", e);
  }

  // 3. Clear mock and session cookies if any
  if (typeof document !== "undefined") {
    document.cookie =
      "moneymap_guest=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    document.cookie =
      "moneymap_mock_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    document.cookie =
      "moneymap_has_session=0; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  }

  // 4. Clear every Dexie table
  await Promise.all([
    database.entries.clear(),
    database.categories.clear(),
    database.loans.clear(),
    database.loan_payments.clear(),
    database.recurring_rules.clear(),
    database.profiles.clear(),
    database.outbox.clear(),
    database.meta.clear(),
  ]);

  // 5. Reset active user ID
  setCurrentUserId(null);

  // 6. Navigate to /welcome
  if (router) {
    router.push("/welcome");
  } else if (typeof window !== "undefined") {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/welcome";
  }
}

/**
 * Sign out of all devices (Prompt 15b Item 6: supabase.auth.signOut({ scope: 'global' }))
 */
export async function signOutAllDevices(
  database: MoneyMapDatabase = db,
  router?: { push: (url: string) => void },
): Promise<void> {
  try {
    await push(database);
  } catch (e) {
    console.error("Push error before global sign out:", e);
  }

  try {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut({ scope: "global" });
  } catch (e) {
    console.error("Supabase global signOut error:", e);
  }

  if (typeof document !== "undefined") {
    document.cookie =
      "moneymap_guest=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    document.cookie =
      "moneymap_mock_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    document.cookie =
      "moneymap_has_session=0; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  }

  await Promise.all([
    database.entries.clear(),
    database.categories.clear(),
    database.loans.clear(),
    database.loan_payments.clear(),
    database.recurring_rules.clear(),
    database.profiles.clear(),
    database.outbox.clear(),
    database.meta.clear(),
  ]);

  setCurrentUserId(null);

  if (router) {
    router.push("/welcome");
  } else if (typeof window !== "undefined") {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/welcome";
  }
}

