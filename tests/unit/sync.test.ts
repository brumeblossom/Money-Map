import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { MoneyMapDatabase, type SyncableTable } from "@/lib/db/dexie";
import {
  createEntry,
  updateEntry,
  softDeleteEntry,
  listEntries,
  setCurrentUserId,
  createCategory,
} from "@/lib/repo";
import {
  push,
  pull,
  run,
  signOut,
  mergeGuestCategories,
  checkSyncRateLimit,
  resetSyncRateLimits,
} from "@/lib/sync";

describe("Sync Engine (PRD Sections 7 & 8)", () => {
  const userId = "user-test-uuid-123";

  // Simulated server state holding tables for testing two simulated devices
  let serverDatabase: Record<SyncableTable, Map<string, Record<string, unknown>>>;

  function initServerDb() {
    serverDatabase = {
      categories: new Map(),
      entries: new Map(),
      loans: new Map(),
      loan_payments: new Map(),
      recurring_rules: new Map(),
      profiles: new Map(),
    };
  }

  // Simulated fetch implementing POST /api/sync/push and GET /api/sync/pull
  const mockFetch: typeof fetch = async (input, init) => {
    const urlStr = typeof input === "string" ? input : input.toString();
    const url = new URL(urlStr, "http://localhost:3000");

    if (url.pathname === "/api/sync/push" && init?.method === "POST") {
      const body = JSON.parse(init.body as string) as {
        changes: { table: SyncableTable; row: Record<string, unknown> }[];
      };

      const applied: string[] = [];
      const skipped: string[] = [];

      for (const change of body.changes) {
        const tableStore = serverDatabase[change.table];
        const idKey = change.table === "profiles" ? "user_id" : "id";
        const id = (change.row[idKey] ?? change.row.id) as string;

        const serverRow = tableStore.get(id);
        const incomingUpdatedAt = new Date(change.row.updated_at as string).getTime();

        if (serverRow) {
          const serverUpdatedAt = new Date(serverRow.updated_at as string).getTime();
          // PRD section 7: a row is skipped when the server copy has a later updated_at
          if (serverUpdatedAt > incomingUpdatedAt) {
            skipped.push(id);
            continue;
          }
        }

        // Apply
        applied.push(id);
        tableStore.set(id, {
          ...change.row,
          user_id: userId,
          server_updated_at: new Date().toISOString(),
        });
      }

      return new Response(JSON.stringify({ applied, skipped }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/sync/pull" && (!init || init.method === "GET")) {
      const sinceParam = url.searchParams.get("since");
      const sinceTime = sinceParam ? new Date(sinceParam).getTime() : 0;

      const rows: Record<SyncableTable, Record<string, unknown>[]> = {
        categories: [],
        entries: [],
        loans: [],
        loan_payments: [],
        recurring_rules: [],
        profiles: [],
      };

      for (const [table, store] of Object.entries(serverDatabase)) {
        for (const row of store.values()) {
          const rowTime = new Date((row.server_updated_at ?? row.updated_at) as string).getTime();
          if (rowTime > sinceTime) {
            rows[table as SyncableTable].push(row);
          }
        }
      }

      return new Response(
        JSON.stringify({
          rows,
          server_time: new Date().toISOString(),
          has_more: false,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
  };

  beforeEach(() => {
    initServerDb();
    resetSyncRateLimits();
    setCurrentUserId(userId);
  });

  it("device A creates an entry, pushes, and device B pulls and sees it", async () => {
    const dbA = new MoneyMapDatabase(`test-device-a-${crypto.randomUUID()}`);
    const dbB = new MoneyMapDatabase(`test-device-b-${crypto.randomUUID()}`);

    const catId = crypto.randomUUID();

    // Device A creates an entry
    const entry = await createEntry(
      {
        kind: "income",
        amount_minor: 5000000,
        category_id: catId,
        occurred_on: "2026-10-21",
        description: "Payment from client",
      },
      dbA,
    );

    // Verify dbA outbox has 1 item
    expect(await dbA.outbox.count()).toBe(1);

    // Device A pushes to server
    const pushResult = await push(dbA, mockFetch);
    expect(pushResult.applied).toContain(entry.id);
    expect(await dbA.outbox.count()).toBe(0);

    // Device B pulls from server
    await pull(dbB, mockFetch);

    // Device B sees the entry!
    const pulledEntry = await dbB.entries.get(entry.id);
    expect(pulledEntry).toBeDefined();
    expect(pulledEntry?.id).toBe(entry.id);
    expect(pulledEntry?.amount_minor).toBe(5000000);
    expect(pulledEntry?.description).toBe("Payment from client");
  });

  it("run() executes push and pull in one unified cycle", async () => {
    const dbA = new MoneyMapDatabase(`test-device-run-a-${crypto.randomUUID()}`);
    const dbB = new MoneyMapDatabase(`test-device-run-b-${crypto.randomUUID()}`);
    const catId = crypto.randomUUID();

    // Create entry on A
    await createEntry(
      {
        kind: "income",
        amount_minor: 1200000,
        category_id: catId,
        occurred_on: "2026-10-21",
        description: "Run cycle test",
      },
      dbA,
    );
    expect(await dbA.outbox.count()).toBe(1);

    // Run sync cycle on A (pushes then pulls)
    await run(dbA, mockFetch);
    expect(await dbA.outbox.count()).toBe(0);

    // Run sync cycle on B (pulls the new entry from server)
    await run(dbB, mockFetch);
    const pulled = await dbB.entries.toArray();
    expect(pulled.some((e) => e.description === "Run cycle test")).toBe(true);
  });

  it("both devices edit the same entry; later updated_at wins on both devices", async () => {
    const dbA = new MoneyMapDatabase(`test-device-a-${crypto.randomUUID()}`);
    const dbB = new MoneyMapDatabase(`test-device-b-${crypto.randomUUID()}`);
    const catId = crypto.randomUUID();

    // 1. Initial entry created on Device A at T0 (08:00:00) and synced to B
    const t0 = "2026-10-21T08:00:00.000Z";
    const entry = await createEntry(
      {
        kind: "expense",
        amount_minor: 1000000,
        category_id: catId,
        occurred_on: "2026-10-21",
        description: "Original description",
      },
      dbA,
    );
    await dbA.entries.update(entry.id, { updated_at: t0 });
    await push(dbA, mockFetch);
    await pull(dbB, mockFetch);

    // 2. Device A edits at T1 (earlier: 10:00:00)
    const t1 = "2026-10-21T10:00:00.000Z";
    await updateEntry(
      entry.id,
      {
        description: "Device A Edit (Earlier)",
      },
      dbA,
    );
    // Explicitly set updated_at to T1
    await dbA.entries.update(entry.id, { updated_at: t1 });

    // 3. Device B edits at T2 (later: 12:00:00)
    const t2 = "2026-10-21T12:00:00.000Z";
    await updateEntry(
      entry.id,
      {
        description: "Device B Edit (Later - Winner)",
      },
      dbB,
    );
    // Explicitly set updated_at to T2
    await dbB.entries.update(entry.id, { updated_at: t2 });

    // 4. Device A pushes T1 to server first
    const pushA = await push(dbA, mockFetch);
    expect(pushA.applied).toContain(entry.id);

    // 5. Device B pushes T2 to server (T2 > T1 -> server accepts T2 as winner)
    const pushB = await push(dbB, mockFetch);
    expect(pushB.applied).toContain(entry.id);

    // 6. Device A pulls from server: T2 replaces T1 because T2 >= T1
    await pull(dbA, mockFetch);

    const finalA = await dbA.entries.get(entry.id);
    const finalB = await dbB.entries.get(entry.id);

    // Later updated_at won on both!
    expect(finalA?.description).toBe("Device B Edit (Later - Winner)");
    expect(finalB?.description).toBe("Device B Edit (Later - Winner)");
    expect(finalA?.updated_at).toBe(t2);
    expect(finalB?.updated_at).toBe(t2);
  });

  it("server skips an incoming change if server copy has later updated_at", async () => {
    const dbA = new MoneyMapDatabase(`test-device-a-${crypto.randomUUID()}`);
    const catId = crypto.randomUUID();

    // 1. Initial entry
    const entry = await createEntry(
      {
        kind: "income",
        amount_minor: 2000000,
        category_id: catId,
        occurred_on: "2026-10-21",
        description: "Initial",
      },
      dbA,
    );

    // Set server copy to later time T2
    const tLater = "2026-10-21T15:00:00.000Z";
    serverDatabase.entries.set(entry.id, {
      ...entry,
      updated_at: tLater,
      server_updated_at: tLater,
      description: "Server Copy (Later)",
    });

    // 2. Device A has earlier time T1 in outbox
    const tEarlier = "2026-10-21T10:00:00.000Z";
    await dbA.entries.update(entry.id, { updated_at: tEarlier });

    // Push: server should skip entry.id because server copy has later updated_at
    const result = await push(dbA, mockFetch);
    expect(result.skipped).toContain(entry.id);
    expect(result.applied).not.toContain(entry.id);

    // Outbox should be cleared because it was resolved (skipped)
    expect(await dbA.outbox.count()).toBe(0);

    // On pull, Device A receives the newer server copy
    await pull(dbA, mockFetch);
    const updatedA = await dbA.entries.get(entry.id);
    expect(updatedA?.description).toBe("Server Copy (Later)");
  });

  it("a delete on device A disappears on device B", async () => {
    const dbA = new MoneyMapDatabase(`test-device-a-${crypto.randomUUID()}`);
    const dbB = new MoneyMapDatabase(`test-device-b-${crypto.randomUUID()}`);
    const catId = crypto.randomUUID();

    // 1. Create and sync to B
    const entry = await createEntry(
      {
        kind: "expense",
        amount_minor: 400000,
        category_id: catId,
        occurred_on: "2026-10-21",
        description: "Item to be deleted",
      },
      dbA,
    );
    await push(dbA, mockFetch);
    await pull(dbB, mockFetch);

    expect(await listEntries({}, dbB)).toHaveLength(1);

    // 2. Soft-delete on Device A
    await softDeleteEntry(entry.id, dbA);
    expect(await listEntries({}, dbA)).toHaveLength(0);

    // 3. Push from Device A and pull on Device B
    await push(dbA, mockFetch);
    await pull(dbB, mockFetch);

    // 4. Device B no longer lists the deleted entry
    const entriesOnB = await listEntries({}, dbB);
    expect(entriesOnB).toHaveLength(0);

    // The row still exists locally with deleted_at set (PRD Section 6 soft delete)
    const rawRowOnB = await dbB.entries.get(entry.id);
    expect(rawRowOnB?.deleted_at).not.toBeNull();
  });

  it("pushing the same changes twice changes nothing (idempotence)", async () => {
    const dbA = new MoneyMapDatabase(`test-device-a-${crypto.randomUUID()}`);
    const catId = crypto.randomUUID();

    const entry = await createEntry(
      {
        kind: "income",
        amount_minor: 750000,
        category_id: catId,
        occurred_on: "2026-10-21",
        description: "Idempotency test",
      },
      dbA,
    );

    // First push
    const firstPush = await push(dbA, mockFetch);
    expect(firstPush.applied).toContain(entry.id);
    expect(await dbA.outbox.count()).toBe(0);

    const serverRowBefore = { ...serverDatabase.entries.get(entry.id) };

    // Add back to outbox manually to simulate re-sending
    await dbA.outbox.add({
      table: "entries",
      row_id: entry.id,
    });

    // Second push
    const secondPush = await push(dbA, mockFetch);
    expect(secondPush.applied).toContain(entry.id);

    const serverRowAfter = serverDatabase.entries.get(entry.id);
    expect(serverRowAfter?.id).toBe(serverRowBefore.id);
    expect(serverRowAfter?.amount_minor).toBe(serverRowBefore.amount_minor);
    expect(serverRowAfter?.updated_at).toBe(serverRowBefore.updated_at);
  });

  it("guest category merge: merges default categories with same slug into server ID and re-points entries", async () => {
    const testDb = new MoneyMapDatabase(`test-merge-${crypto.randomUUID()}`);

    const localCatId = crypto.randomUUID();
    const serverCatId = crypto.randomUUID();

    // 1. Local default category created during guest mode
    await createCategory(
      {
        id: localCatId,
        scope: "expense",
        name: "Food & dining",
        slug: "food",
        is_default: true,
      },
      testDb,
    );

    // 2. Local entry referencing localCatId
    const entry = await createEntry(
      {
        kind: "expense",
        amount_minor: 250000,
        category_id: localCatId,
        occurred_on: "2026-10-21",
        description: "Dinner at local diner",
      },
      testDb,
    );

    // 3. Server categories list contains category with matching slug but serverCatId
    const serverCategories = [
      {
        id: serverCatId,
        user_id: userId,
        scope: "expense" as const,
        name: "Food & dining",
        slug: "food",
        is_default: true,
        is_hidden: false,
        sort_order: 1,
        created_at: "2026-10-20T00:00:00.000Z",
        updated_at: "2026-10-20T00:00:00.000Z",
        deleted_at: null,
        server_updated_at: "2026-10-20T00:00:00.000Z",
      },
    ];

    // 4. Run guest category merge
    const merged = await mergeGuestCategories(serverCategories, testDb);
    expect(merged).toBe(1);

    // Old local category is deleted
    expect(await testDb.categories.get(localCatId)).toBeUndefined();

    // Server category exists locally
    const savedServerCat = await testDb.categories.get(serverCatId);
    expect(savedServerCat).toBeDefined();
    expect(savedServerCat?.slug).toBe("food");

    // Local entry was re-pointed to serverCatId!
    const updatedEntry = await testDb.entries.get(entry.id);
    expect(updatedEntry?.category_id).toBe(serverCatId);
  });

  it("rate limiter enforces maximum 60 requests per minute per user", () => {
    const testUser = "rate-limit-user-1";

    // 60 requests allowed
    for (let i = 0; i < 60; i++) {
      expect(checkSyncRateLimit(testUser, 60, 60_000)).toBe(true);
    }

    // 61st request rejected (429)
    expect(checkSyncRateLimit(testUser, 60, 60_000)).toBe(false);

    // Different user is not affected
    expect(checkSyncRateLimit("another-user", 60, 60_000)).toBe(true);

    // Resetting clears the limits
    resetSyncRateLimits();
    expect(checkSyncRateLimit(testUser, 60, 60_000)).toBe(true);
  });

  it("signOut clears all Dexie tables and resets user", async () => {
    const testDb = new MoneyMapDatabase(`test-signout-${crypto.randomUUID()}`);
    const catId = crypto.randomUUID();

    await createEntry(
      {
        kind: "income",
        amount_minor: 100000,
        category_id: catId,
        occurred_on: "2026-10-21",
      },
      testDb,
    );

    expect(await testDb.entries.count()).toBe(1);
    expect(await testDb.outbox.count()).toBe(1);

    const pushedUrls: string[] = [];
    const mockRouter = {
      push: (url: string) => pushedUrls.push(url),
    };

    await signOut(testDb, mockRouter, mockFetch);

    // All tables cleared
    expect(await testDb.entries.count()).toBe(0);
    expect(await testDb.outbox.count()).toBe(0);
    expect(await testDb.categories.count()).toBe(0);
    expect(await testDb.loans.count()).toBe(0);
    expect(await testDb.loan_payments.count()).toBe(0);
    expect(await testDb.recurring_rules.count()).toBe(0);
    expect(await testDb.profiles.count()).toBe(0);
    expect(await testDb.meta.count()).toBe(0);

    // Navigated to /
    expect(pushedUrls).toContain("/");
  });
});
