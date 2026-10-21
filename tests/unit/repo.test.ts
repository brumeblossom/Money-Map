import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { MoneyMapDatabase } from "@/lib/db/dexie";
import {
  createEntry,
  updateEntry,
  softDeleteEntry,
  restoreEntry,
  getEntry,
  listEntries,
  createLoan,
  softDeleteLoan,
  restoreLoan,
  getLoan,
  createLoanPayment,
  softDeleteLoanPayment,
  restoreLoanPayment,
  createCategory,
  softDeleteCategory,
  createRecurringRule,
  softDeleteRecurringRule,
  createProfile,
  getProfile,
  seedDefaultCategories,
  DEFAULT_CATEGORIES,
  setCurrentUserId,
  toSlug,
} from "@/lib/repo";

describe("Local Data Layer (Dexie Repository & Outbox)", () => {
  let testDb: MoneyMapDatabase;

  beforeEach(async () => {
    // Unique in-memory database for each test
    testDb = new MoneyMapDatabase(`test-moneymap-${crypto.randomUUID()}`);
    setCurrentUserId(null); // default to guest
  });

  it("create adds a row and exactly one outbox item in the same transaction", async () => {
    const entry = await createEntry(
      {
        kind: "income",
        amount_minor: 15000000,
        category_id: crypto.randomUUID(),
        occurred_on: "2026-10-20",
        counterparty: "Acme Corp",
        description: "Monthly salary",
      },
      testDb,
    );

    // Verify row was created
    expect(entry.id).toBeDefined();
    expect(entry.amount_minor).toBe(15000000);
    expect(entry.deleted_at).toBeNull();
    expect(entry.created_at).toBeDefined();
    expect(entry.updated_at).toBeDefined();

    const storedEntry = await testDb.entries.get(entry.id);
    expect(storedEntry).toBeDefined();
    expect(storedEntry?.counterparty).toBe("Acme Corp");

    // Verify exactly one outbox item was appended
    const outboxItems = await testDb.outbox.toArray();
    expect(outboxItems).toHaveLength(1);
    expect(outboxItems[0].table).toBe("entries");
    expect(outboxItems[0].row_id).toBe(entry.id);
  });

  it("softDelete sets deleted_at and adds an outbox item", async () => {
    const entry = await createEntry(
      {
        kind: "expense",
        amount_minor: 250000,
        category_id: crypto.randomUUID(),
        occurred_on: "2026-10-20",
        description: "Lunch",
      },
      testDb,
    );

    // Outbox has 1 item from create
    expect(await testDb.outbox.count()).toBe(1);

    // Soft delete
    await softDeleteEntry(entry.id, testDb);

    // Outbox should now have 2 items
    const outboxItems = await testDb.outbox.toArray();
    expect(outboxItems).toHaveLength(2);
    expect(outboxItems[1].table).toBe("entries");
    expect(outboxItems[1].row_id).toBe(entry.id);

    // Row in DB has deleted_at set
    const rawRow = await testDb.entries.get(entry.id);
    expect(rawRow?.deleted_at).not.toBeNull();
    expect(typeof rawRow?.deleted_at).toBe("string");

    // getEntry returns undefined for soft-deleted entry
    const active = await getEntry(entry.id, testDb);
    expect(active).toBeUndefined();

    // listEntries excludes soft-deleted by default
    const activeList = await listEntries(undefined, testDb);
    expect(activeList.find((e) => e.id === entry.id)).toBeUndefined();

    // Restore entry
    await restoreEntry(entry.id, testDb);
    expect(await testDb.outbox.count()).toBe(3);
    const restoredEntry = await getEntry(entry.id, testDb);
    expect(restoredEntry).toBeDefined();
    expect(restoredEntry?.deleted_at).toBeNull();
  });

  it("handles loan and loan payments create & soft delete with outbox tracking", async () => {
    const loan = await createLoan(
      {
        counterparty: "Emeka",
        principal_minor: 10000000,
        category_id: crypto.randomUUID(),
        started_on: "2026-10-20",
        due_on: "2026-11-20",
      },
      testDb,
    );

    expect(loan.id).toBeDefined();
    expect(loan.counterparty).toBe("Emeka");

    const payment = await createLoanPayment(
      {
        loan_id: loan.id,
        amount_minor: 2500000,
        paid_on: "2026-10-25",
        note: "First payment",
      },
      testDb,
    );

    expect(payment.id).toBeDefined();

    // Outbox has 2 items: loan and payment
    expect(await testDb.outbox.count()).toBe(2);

    // Soft delete loan
    await softDeleteLoan(loan.id, testDb);
    expect(await getLoan(loan.id, testDb)).toBeUndefined();
    expect(await testDb.outbox.count()).toBe(3);

    // Soft delete payment
    await softDeleteLoanPayment(payment.id, testDb);
    expect(await testDb.outbox.count()).toBe(4);

    // Restore payment
    await restoreLoanPayment(payment.id, testDb);
    expect(await testDb.outbox.count()).toBe(5);
    const restoredPayment = await testDb.loan_payments.get(payment.id);
    expect(restoredPayment?.deleted_at).toBeNull();

    // Restore loan
    await restoreLoan(loan.id, testDb);
    expect(await testDb.outbox.count()).toBe(6);
    const restoredLoan = await getLoan(loan.id, testDb);
    expect(restoredLoan).toBeDefined();
    expect(restoredLoan?.deleted_at).toBeNull();
  });

  it("assigns user_id from current-user getter (null for guests)", async () => {
    // Guest
    setCurrentUserId(null);
    const guestCat = await createCategory(
      {
        scope: "expense",
        name: "Guest Category",
      },
      testDb,
    );
    expect(guestCat.user_id).toBe("");

    // Authenticated user
    const testUserId = "user-uuid-12345";
    setCurrentUserId(testUserId);

    const userCat = await createCategory(
      {
        scope: "expense",
        name: "User Category",
      },
      testDb,
    );
    expect(userCat.user_id).toBe(testUserId);
  });

  it("seedDefaultCategories inserts all 4 scopes and runs twice without duplicates (idempotent)", async () => {
    // First run
    const firstSeed = await seedDefaultCategories(testDb);

    const expectedTotalCount =
      DEFAULT_CATEGORIES.income.length +
      DEFAULT_CATEGORIES.expense.length +
      DEFAULT_CATEGORIES.giving.length +
      DEFAULT_CATEGORIES.lent.length;

    expect(firstSeed).toHaveLength(expectedTotalCount);

    const storedCategoriesCount = await testDb.categories.count();
    expect(storedCategoriesCount).toBe(expectedTotalCount);

    // Check specific attributes
    const foodCat = await testDb.categories
      .filter((cat) => cat.slug === "food")
      .first();
    expect(foodCat).toBeDefined();
    expect(foodCat?.is_default).toBe(true);
    expect(foodCat?.scope).toBe("expense");
    expect(foodCat?.name).toBe("Food");

    // Second run: must be idempotent and insert 0 duplicates
    const secondSeed = await seedDefaultCategories(testDb);
    expect(secondSeed).toHaveLength(0);

    const countAfterSecondSeed = await testDb.categories.count();
    expect(countAfterSecondSeed).toBe(expectedTotalCount);
  });

  it("updates an entry and records an outbox item", async () => {
    const entry = await createEntry(
      {
        kind: "income",
        amount_minor: 100000,
        category_id: crypto.randomUUID(),
        occurred_on: "2026-10-20",
      },
      testDb,
    );

    const updated = await updateEntry(
      entry.id,
      { amount_minor: 120000, description: "Bonus" },
      testDb,
    );

    expect(updated.amount_minor).toBe(120000);
    expect(updated.description).toBe("Bonus");
    expect(await testDb.outbox.count()).toBe(2);
  });

  it("handles category and recurring rule create and softDelete with outbox tracking", async () => {
    const cat = await createCategory(
      {
        scope: "expense",
        name: "Custom Category",
      },
      testDb,
    );
    expect(cat.id).toBeDefined();

    const rule = await createRecurringRule(
      {
        kind: "expense",
        frequency: "monthly",
        amount_minor: 50000,
        category_id: cat.id,
        next_due_on: "2026-11-01",
      },
      testDb,
    );
    expect(rule.id).toBeDefined();

    await softDeleteCategory(cat.id, testDb);
    await softDeleteRecurringRule(rule.id, testDb);

    // 4 outbox items total (2 creates, 2 softDeletes)
    expect(await testDb.outbox.count()).toBe(4);
  });

  it("creates and retrieves user profile", async () => {
    const testUserId = "user-profile-test-123";
    const profile = await createProfile(
      {
        user_id: testUserId,
        display_name: "Chinedum",
        currency: "NGN",
      },
      testDb,
    );

    expect(profile.user_id).toBe(testUserId);
    expect(profile.display_name).toBe("Chinedum");

    const retrieved = await getProfile(testUserId, testDb);
    expect(retrieved?.display_name).toBe("Chinedum");
  });

  it("toSlug correctly formats category names to kebab-case", () => {
    expect(toSlug("Side gig / freelance")).toBe("side-gig-freelance");
    expect(toSlug("Light (electricity)")).toBe("light-electricity");
    expect(toSlug("Offering & seed")).toBe("offering-seed");
    expect(toSlug("Customer (credit sale)")).toBe("customer-credit-sale");
  });
});

