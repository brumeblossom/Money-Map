import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/dexie";
import {
  seedDefaultCategories,
  cleanupDuplicateCategories,
} from "@/lib/repo/seed";
import { setCurrentUserId } from "@/lib/repo/user";

describe("Duplicate Categories Prevention and Cleanup", () => {
  beforeEach(async () => {
    setCurrentUserId(null);
    await db.entries.clear();
    await db.categories.clear();
    await db.loans.clear();
    await db.recurring_rules.clear();
    await db.outbox.clear();
    await db.meta.clear();
    await db.profiles.clear();
  });

  it("running seed twice produces exactly one of each default category", async () => {
    // 1. First seed
    await seedDefaultCategories();
    const categoriesAfterFirstSeed = await db.categories
      .filter((c) => c.deleted_at === null)
      .toArray();

    // 10 income, 15 expense, 7 giving, 5 lent = 37 total
    expect(categoriesAfterFirstSeed.length).toBe(37);

    // 2. Second seed (e.g. app restart or re-render)
    await seedDefaultCategories();
    const categoriesAfterSecondSeed = await db.categories
      .filter((c) => c.deleted_at === null)
      .toArray();

    expect(categoriesAfterSecondSeed.length).toBe(37);

    // Check every (scope, slug) is unique
    const seen = new Set<string>();
    for (const cat of categoriesAfterSecondSeed) {
      const key = `${cat.scope}:${cat.slug}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("seeding as guest and then as signed-in user updates in place without duplicating", async () => {
    // Seed as guest
    await seedDefaultCategories();
    expect(await db.categories.count()).toBe(37);

    // Seed as logged-in user
    setCurrentUserId("user-12345");
    await seedDefaultCategories();
    const active = await db.categories.filter((c) => c.deleted_at === null).toArray();
    expect(active.length).toBe(37);

    // Categories should have user_id updated
    for (const cat of active) {
      expect(cat.user_id).toBe("user-12345");
    }
  });

  it("cleanupDuplicateCategories repoints entries, loans, and rules to the kept category and soft-deletes extras", async () => {
    // 1. Create a canonical category
    const canonicalCat = {
      id: "canonical-food",
      user_id: "user-1",
      scope: "expense" as const,
      name: "Food & dining",
      slug: "food-dining",
      is_default: true,
      is_hidden: false,
      sort_order: 1,
      server_updated_at: "2026-10-01T10:00:00Z",
      created_at: "2026-10-01T10:00:00Z",
      updated_at: "2026-10-01T10:00:00Z",
      deleted_at: null,
    };

    // 2. Create a duplicate category (e.g. from guest seed before sync)
    const duplicateCat = {
      id: "duplicate-food",
      user_id: "",
      scope: "expense" as const,
      name: "Food & dining",
      slug: "food-dining",
      is_default: true,
      is_hidden: false,
      sort_order: 1,
      server_updated_at: "2026-10-02T10:00:00Z",
      created_at: "2026-10-02T10:00:00Z",
      updated_at: "2026-10-02T10:00:00Z",
      deleted_at: null,
    };

    await db.categories.bulkAdd([canonicalCat, duplicateCat]);

    // 3. Attach an entry, loan, and recurring rule to the duplicate category
    const entryId = crypto.randomUUID();
    await db.entries.add({
      id: entryId,
      user_id: "user-1",
      kind: "expense",
      amount_minor: 500000,
      category_id: "duplicate-food",
      occurred_on: "2026-10-10",
      description: "Groceries",
      counterparty: "Supermarket",
      recurring_rule_id: null,
      server_updated_at: "2026-10-10T10:00:00Z",
      created_at: "2026-10-10T10:00:00Z",
      updated_at: "2026-10-10T10:00:00Z",
      deleted_at: null,
    });

    const ruleId = crypto.randomUUID();
    await db.recurring_rules.add({
      id: ruleId,
      user_id: "user-1",
      kind: "expense",
      amount_minor: 250000,
      category_id: "duplicate-food",
      frequency: "monthly",
      next_due_on: "2026-11-01",
      is_paused: false,
      counterparty: "Supermarket",
      description: "Monthly subscription",
      server_updated_at: "2026-10-10T10:00:00Z",
      created_at: "2026-10-10T10:00:00Z",
      updated_at: "2026-10-10T10:00:00Z",
      deleted_at: null,
    });

    // 4. Run cleanup
    const result = await cleanupDuplicateCategories(db);
    expect(result.cleaned).toBe(1);
    expect(result.repointed).toBe(2);

    // 5. Verify active categories: only canonical-food remains active
    const activeCats = await db.categories.filter((c) => c.deleted_at === null).toArray();
    expect(activeCats.length).toBe(1);
    expect(activeCats[0].id).toBe("canonical-food");

    // Duplicate is soft-deleted
    const dupFromDb = await db.categories.get("duplicate-food");
    expect(dupFromDb?.deleted_at).not.toBeNull();

    // 6. Verify entry was repointed to canonical-food without data loss
    const entryFromDb = await db.entries.get(entryId);
    expect(entryFromDb).toBeDefined();
    expect(entryFromDb?.category_id).toBe("canonical-food");
    expect(entryFromDb?.amount_minor).toBe(500000);

    // 7. Verify recurring rule was repointed
    const ruleFromDb = await db.recurring_rules.get(ruleId);
    expect(ruleFromDb).toBeDefined();
    expect(ruleFromDb?.category_id).toBe("canonical-food");

    // 8. Verify soft-deleted duplicate was queued into outbox for sync push
    const outboxItems = await db.outbox.toArray();
    const catOutbox = outboxItems.find(
      (o) => o.table === "categories" && o.row_id === "duplicate-food",
    );
    expect(catOutbox).toBeDefined();
  });
});
