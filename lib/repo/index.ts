import {
  db,
  type MoneyMapDatabase,
  type EntryRow,
  type LoanRow,
  type LoanPaymentRow,
  type CategoryRow,
  type RecurringRuleRow,
  type ProfileRow,
  type EntryKind,
  type CategoryScope,
  type RepeatPlan,
  type InterestKind,
  type SyncableTable,
} from "@/lib/db/dexie";

export {
  db,
  type MoneyMapDatabase,
  type EntryRow,
  type LoanRow,
  type LoanPaymentRow,
  type CategoryRow,
  type RecurringRuleRow,
  type ProfileRow,
  type EntryKind,
  type CategoryScope,
  type RepeatPlan,
  type InterestKind,
  type SyncableTable,
};
import { getCurrentUserId, setCurrentUserId } from "./user";

export * from "./user";
export * from "./seed";
export * from "./hooks";

// Helper for atomic write + outbox entry in ONE Dexie transaction (PRD section 8)
async function executeWrite<T>(
  database: MoneyMapDatabase,
  table: SyncableTable,
  rowId: string,
  operation: () => Promise<T>,
): Promise<T> {
  const tableRef = database.table(table);
  const outboxRef = database.outbox;
  const now = new Date().toISOString();
  const userId = getCurrentUserId();

  return await database.transaction("rw", [tableRef, outboxRef], async () => {
    const result = await operation();
    // Only queue to outbox if user is signed in (guest rows are queued on claimGuestData)
    if (userId) {
      await outboxRef.add({
        table,
        row_id: rowId,
        created_at: now,
      });
    }
    return result;
  });
}

// -------------------------------------------------------------
// 1. Entries Repository
// -------------------------------------------------------------
export interface CreateEntryInput {
  id?: string;
  kind: EntryKind;
  amount_minor: number;
  category_id: string;
  occurred_on: string;
  counterparty?: string | null;
  description?: string | null;
  recurring_rule_id?: string | null;
}

export interface UpdateEntryInput {
  kind?: EntryKind;
  amount_minor?: number;
  category_id?: string;
  occurred_on?: string;
  counterparty?: string | null;
  description?: string | null;
  recurring_rule_id?: string | null;
}

export interface EntryFilter {
  kind?: EntryKind;
  category_id?: string;
  period?: { start: string; end: string };
  includeDeleted?: boolean;
}

export async function createEntry(
  input: CreateEntryInput,
  database: MoneyMapDatabase = db,
): Promise<EntryRow> {
  const id = input.id ?? crypto.randomUUID();
  const userId = getCurrentUserId() ?? "";
  const now = new Date().toISOString();

  const row: EntryRow = {
    id,
    user_id: userId,
    kind: input.kind,
    amount_minor: input.amount_minor,
    category_id: input.category_id,
    occurred_on: input.occurred_on,
    counterparty: input.counterparty ?? null,
    description: input.description ?? null,
    recurring_rule_id: input.recurring_rule_id ?? null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    server_updated_at: now,
  };

  return await executeWrite(database, "entries", id, async () => {
    await database.entries.add(row);
    return row;
  });
}

export async function updateEntry(
  id: string,
  input: UpdateEntryInput,
  database: MoneyMapDatabase = db,
): Promise<EntryRow> {
  const now = new Date().toISOString();

  return await executeWrite(database, "entries", id, async () => {
    const existing = await database.entries.get(id);
    if (!existing) {
      throw new Error(`Entry with id ${id} not found`);
    }

    const updated: EntryRow = {
      ...existing,
      ...input,
      updated_at: now,
    };

    await database.entries.put(updated);
    return updated;
  });
}

export async function softDeleteEntry(
  id: string,
  database: MoneyMapDatabase = db,
): Promise<void> {
  const now = new Date().toISOString();

  await executeWrite(database, "entries", id, async () => {
    const existing = await database.entries.get(id);
    if (existing) {
      await database.entries.update(id, {
        deleted_at: now,
        updated_at: now,
      });
    }
  });
}

export async function restoreEntry(
  id: string,
  database: MoneyMapDatabase = db,
): Promise<void> {
  const now = new Date().toISOString();

  await executeWrite(database, "entries", id, async () => {
    const existing = await database.entries.get(id);
    if (existing) {
      await database.entries.update(id, {
        deleted_at: null,
        updated_at: now,
      });
    }
  });
}

export async function getEntry(
  id: string,
  database: MoneyMapDatabase = db,
): Promise<EntryRow | undefined> {
  const row = await database.entries.get(id);
  if (!row || row.deleted_at) return undefined;
  return row;
}

export async function listEntries(
  filter?: EntryFilter,
  database: MoneyMapDatabase = db,
): Promise<EntryRow[]> {
  const collection = database.entries.toCollection();

  const rows = await collection.toArray();
  return rows.filter((row) => {
    if (!filter?.includeDeleted && row.deleted_at !== null) return false;
    if (filter?.kind && row.kind !== filter.kind) return false;
    if (filter?.category_id && row.category_id !== filter.category_id) return false;
    if (filter?.period) {
      if (row.occurred_on < filter.period.start || row.occurred_on > filter.period.end) {
        return false;
      }
    }
    return true;
  });
}

// -------------------------------------------------------------
// 2. Loans Repository
// -------------------------------------------------------------
export interface CreateLoanInput {
  id?: string;
  counterparty: string;
  principal_minor: number;
  category_id: string;
  started_on: string;
  due_on: string;
  plan?: RepeatPlan;
  instalment_minor?: number | null;
  interest_type?: InterestKind;
  interest_value?: number;
  remind?: boolean;
  description?: string | null;
}

export interface UpdateLoanInput {
  counterparty?: string;
  principal_minor?: number;
  category_id?: string;
  started_on?: string;
  due_on?: string;
  plan?: RepeatPlan;
  instalment_minor?: number | null;
  interest_type?: InterestKind;
  interest_value?: number;
  remind?: boolean;
  description?: string | null;
}

export async function createLoan(
  input: CreateLoanInput,
  database: MoneyMapDatabase = db,
): Promise<LoanRow> {
  const id = input.id ?? crypto.randomUUID();
  const userId = getCurrentUserId() ?? "";
  const now = new Date().toISOString();

  const row: LoanRow = {
    id,
    user_id: userId,
    counterparty: input.counterparty,
    principal_minor: input.principal_minor,
    category_id: input.category_id,
    started_on: input.started_on,
    due_on: input.due_on,
    plan: input.plan ?? "one_payment",
    instalment_minor: input.instalment_minor ?? null,
    interest_type: input.interest_type ?? "none",
    interest_value: input.interest_value ?? 0,
    remind: input.remind ?? true,
    description: input.description ?? null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    server_updated_at: now,
  };

  return await executeWrite(database, "loans", id, async () => {
    await database.loans.add(row);
    return row;
  });
}

export async function updateLoan(
  id: string,
  input: UpdateLoanInput,
  database: MoneyMapDatabase = db,
): Promise<LoanRow> {
  const now = new Date().toISOString();

  return await executeWrite(database, "loans", id, async () => {
    const existing = await database.loans.get(id);
    if (!existing) {
      throw new Error(`Loan with id ${id} not found`);
    }

    const updated: LoanRow = {
      ...existing,
      ...input,
      updated_at: now,
    };

    await database.loans.put(updated);
    return updated;
  });
}

export async function softDeleteLoan(
  id: string,
  database: MoneyMapDatabase = db,
): Promise<void> {
  const now = new Date().toISOString();

  await executeWrite(database, "loans", id, async () => {
    const existing = await database.loans.get(id);
    if (existing) {
      await database.loans.update(id, {
        deleted_at: now,
        updated_at: now,
      });
    }
  });
}

export async function restoreLoan(
  id: string,
  database: MoneyMapDatabase = db,
): Promise<void> {
  const now = new Date().toISOString();

  await executeWrite(database, "loans", id, async () => {
    const existing = await database.loans.get(id);
    if (existing) {
      await database.loans.update(id, {
        deleted_at: null,
        updated_at: now,
      });
    }
  });
}

export async function getLoan(
  id: string,
  database: MoneyMapDatabase = db,
): Promise<LoanRow | undefined> {
  const row = await database.loans.get(id);
  if (!row || row.deleted_at) return undefined;
  return row;
}

export async function listLoans(
  includeDeleted = false,
  database: MoneyMapDatabase = db,
): Promise<LoanRow[]> {
  const rows = await database.loans.toArray();
  return rows.filter((row) => includeDeleted || row.deleted_at === null);
}

// -------------------------------------------------------------
// 3. Loan Payments Repository
// -------------------------------------------------------------
export interface CreateLoanPaymentInput {
  id?: string;
  loan_id: string;
  amount_minor: number;
  paid_on: string;
  note?: string | null;
}

export interface UpdateLoanPaymentInput {
  amount_minor?: number;
  paid_on?: string;
  note?: string | null;
}

export async function createLoanPayment(
  input: CreateLoanPaymentInput,
  database: MoneyMapDatabase = db,
): Promise<LoanPaymentRow> {
  const id = input.id ?? crypto.randomUUID();
  const userId = getCurrentUserId() ?? "";
  const now = new Date().toISOString();

  const row: LoanPaymentRow = {
    id,
    user_id: userId,
    loan_id: input.loan_id,
    amount_minor: input.amount_minor,
    paid_on: input.paid_on,
    note: input.note ?? null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    server_updated_at: now,
  };

  return await executeWrite(database, "loan_payments", id, async () => {
    await database.loan_payments.add(row);
    return row;
  });
}

export async function updateLoanPayment(
  id: string,
  input: UpdateLoanPaymentInput,
  database: MoneyMapDatabase = db,
): Promise<LoanPaymentRow> {
  const now = new Date().toISOString();

  return await executeWrite(database, "loan_payments", id, async () => {
    const existing = await database.loan_payments.get(id);
    if (!existing) {
      throw new Error(`Loan payment with id ${id} not found`);
    }

    const updated: LoanPaymentRow = {
      ...existing,
      ...input,
      updated_at: now,
    };

    await database.loan_payments.put(updated);
    return updated;
  });
}

export async function softDeleteLoanPayment(
  id: string,
  database: MoneyMapDatabase = db,
): Promise<void> {
  const now = new Date().toISOString();

  await executeWrite(database, "loan_payments", id, async () => {
    const existing = await database.loan_payments.get(id);
    if (existing) {
      await database.loan_payments.update(id, {
        deleted_at: now,
        updated_at: now,
      });
    }
  });
}

export async function restoreLoanPayment(
  id: string,
  database: MoneyMapDatabase = db,
): Promise<void> {
  const now = new Date().toISOString();

  await executeWrite(database, "loan_payments", id, async () => {
    const existing = await database.loan_payments.get(id);
    if (existing) {
      await database.loan_payments.update(id, {
        deleted_at: null,
        updated_at: now,
      });
    }
  });
}

export async function getLoanPayment(
  id: string,
  database: MoneyMapDatabase = db,
): Promise<LoanPaymentRow | undefined> {
  const row = await database.loan_payments.get(id);
  if (!row || row.deleted_at) return undefined;
  return row;
}

export async function listLoanPayments(
  loanId?: string,
  includeDeleted = false,
  database: MoneyMapDatabase = db,
): Promise<LoanPaymentRow[]> {
  const rows = await database.loan_payments.toArray();
  return rows.filter((row) => {
    if (!includeDeleted && row.deleted_at !== null) return false;
    if (loanId && row.loan_id !== loanId) return false;
    return true;
  });
}

// -------------------------------------------------------------
// 4. Categories Repository
// -------------------------------------------------------------
export interface CreateCategoryInput {
  id?: string;
  scope: CategoryScope;
  name: string;
  slug?: string | null;
  is_default?: boolean;
  is_hidden?: boolean;
  sort_order?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string | null;
  is_default?: boolean;
  is_hidden?: boolean;
  sort_order?: number;
}

export async function createCategory(
  input: CreateCategoryInput,
  database: MoneyMapDatabase = db,
): Promise<CategoryRow> {
  const id = input.id ?? crypto.randomUUID();
  const userId = getCurrentUserId() ?? "";
  const now = new Date().toISOString();
  const count = await database.categories.where("scope").equals(input.scope).count();

  const row: CategoryRow = {
    id,
    user_id: userId,
    scope: input.scope,
    name: input.name,
    slug: input.slug ?? null,
    is_default: input.is_default ?? false,
    is_hidden: input.is_hidden ?? false,
    sort_order: input.sort_order ?? count,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    server_updated_at: now,
  };

  return await executeWrite(database, "categories", id, async () => {
    await database.categories.add(row);
    return row;
  });
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
  database: MoneyMapDatabase = db,
): Promise<CategoryRow> {
  const now = new Date().toISOString();

  return await executeWrite(database, "categories", id, async () => {
    const existing = await database.categories.get(id);
    if (!existing) {
      throw new Error(`Category with id ${id} not found`);
    }

    const updated: CategoryRow = {
      ...existing,
      ...input,
      updated_at: now,
    };

    await database.categories.put(updated);
    return updated;
  });
}

export async function softDeleteCategory(
  id: string,
  database: MoneyMapDatabase = db,
): Promise<void> {
  const now = new Date().toISOString();

  await executeWrite(database, "categories", id, async () => {
    const existing = await database.categories.get(id);
    if (existing) {
      await database.categories.update(id, {
        deleted_at: now,
        updated_at: now,
      });
    }
  });
}

export async function getCategory(
  id: string,
  database: MoneyMapDatabase = db,
): Promise<CategoryRow | undefined> {
  const row = await database.categories.get(id);
  if (!row || row.deleted_at) return undefined;
  return row;
}

export async function listCategories(
  scope?: CategoryScope,
  includeHidden = false,
  includeDeleted = false,
  database: MoneyMapDatabase = db,
): Promise<CategoryRow[]> {
  const rows = await database.categories.toArray();
  return rows
    .filter((row) => {
      if (!includeDeleted && row.deleted_at !== null) return false;
      if (scope && row.scope !== scope) return false;
      if (!includeHidden && row.is_hidden) return false;
      return true;
    })
    .sort((a, b) => a.sort_order - b.sort_order);
}

// -------------------------------------------------------------
// 5. Recurring Rules Repository
// -------------------------------------------------------------
export interface CreateRecurringRuleInput {
  id?: string;
  kind: EntryKind;
  frequency: RepeatPlan;
  amount_minor: number;
  category_id: string;
  next_due_on: string;
  counterparty?: string | null;
  description?: string | null;
  is_paused?: boolean;
}

export interface UpdateRecurringRuleInput {
  kind?: EntryKind;
  frequency?: RepeatPlan;
  amount_minor?: number;
  category_id?: string;
  next_due_on?: string;
  counterparty?: string | null;
  description?: string | null;
  is_paused?: boolean;
}

export async function createRecurringRule(
  input: CreateRecurringRuleInput,
  database: MoneyMapDatabase = db,
): Promise<RecurringRuleRow> {
  const id = input.id ?? crypto.randomUUID();
  const userId = getCurrentUserId() ?? "";
  const now = new Date().toISOString();

  const row: RecurringRuleRow = {
    id,
    user_id: userId,
    kind: input.kind,
    frequency: input.frequency,
    amount_minor: input.amount_minor,
    category_id: input.category_id,
    next_due_on: input.next_due_on,
    counterparty: input.counterparty ?? null,
    description: input.description ?? null,
    is_paused: input.is_paused ?? false,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    server_updated_at: now,
  };

  return await executeWrite(database, "recurring_rules", id, async () => {
    await database.recurring_rules.add(row);
    return row;
  });
}

export async function updateRecurringRule(
  id: string,
  input: UpdateRecurringRuleInput,
  database: MoneyMapDatabase = db,
): Promise<RecurringRuleRow> {
  const now = new Date().toISOString();

  return await executeWrite(database, "recurring_rules", id, async () => {
    const existing = await database.recurring_rules.get(id);
    if (!existing) {
      throw new Error(`Recurring rule with id ${id} not found`);
    }

    const updated: RecurringRuleRow = {
      ...existing,
      ...input,
      updated_at: now,
    };

    await database.recurring_rules.put(updated);
    return updated;
  });
}

export async function softDeleteRecurringRule(
  id: string,
  database: MoneyMapDatabase = db,
): Promise<void> {
  const now = new Date().toISOString();

  await executeWrite(database, "recurring_rules", id, async () => {
    const existing = await database.recurring_rules.get(id);
    if (existing) {
      await database.recurring_rules.update(id, {
        deleted_at: now,
        updated_at: now,
      });
    }
  });
}

export async function getRecurringRule(
  id: string,
  database: MoneyMapDatabase = db,
): Promise<RecurringRuleRow | undefined> {
  const row = await database.recurring_rules.get(id);
  if (!row || row.deleted_at) return undefined;
  return row;
}

export async function listRecurringRules(
  includeDeleted = false,
  database: MoneyMapDatabase = db,
): Promise<RecurringRuleRow[]> {
  const rows = await database.recurring_rules.toArray();
  return rows.filter((row) => includeDeleted || row.deleted_at === null);
}

// -------------------------------------------------------------
// 6. Profiles Repository
// -------------------------------------------------------------
export interface CreateProfileInput {
  user_id: string;
  display_name?: string | null;
  currency?: string;
  notifications_enabled?: boolean;
}

export interface UpdateProfileInput {
  display_name?: string | null;
  currency?: string;
  notifications_enabled?: boolean;
}

export async function createProfile(
  input: CreateProfileInput,
  database: MoneyMapDatabase = db,
): Promise<ProfileRow> {
  const now = new Date().toISOString();

  const row: ProfileRow = {
    user_id: input.user_id,
    display_name: input.display_name ?? null,
    currency: input.currency ?? "NGN",
    notifications_enabled: input.notifications_enabled ?? false,
    created_at: now,
    updated_at: now,
  };

  return await executeWrite(database, "profiles", input.user_id, async () => {
    await database.profiles.put(row);
    return row;
  });
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
  database: MoneyMapDatabase = db,
): Promise<ProfileRow> {
  const now = new Date().toISOString();

  return await executeWrite(database, "profiles", userId, async () => {
    const existing = await database.profiles.get(userId);
    const updated: ProfileRow = {
      user_id: userId,
      display_name: input.display_name !== undefined ? input.display_name : existing?.display_name ?? null,
      currency: input.currency ?? existing?.currency ?? "NGN",
      notifications_enabled:
        input.notifications_enabled !== undefined
          ? input.notifications_enabled
          : existing?.notifications_enabled ?? false,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };

    await database.profiles.put(updated);
    return updated;
  });
}

export async function softDeleteProfile(
  userId: string,
  database: MoneyMapDatabase = db,
): Promise<void> {
  await executeWrite(database, "profiles", userId, async () => {
    await database.profiles.delete(userId);
  });
}

export async function getProfile(
  userId?: string,
  database: MoneyMapDatabase = db,
): Promise<ProfileRow | undefined> {
  const id = userId ?? getCurrentUserId();
  if (!id) return undefined;
  return await database.profiles.get(id);
}

export async function listProfiles(
  database: MoneyMapDatabase = db,
): Promise<ProfileRow[]> {
  return await database.profiles.toArray();
}

// -------------------------------------------------------------
// 7. Guest Data Migration & Guest Banner (PRD Section 8, US-1.3)
// -------------------------------------------------------------
export async function claimGuestData(
  newUserId: string,
  database: MoneyMapDatabase = db,
): Promise<number> {
  setCurrentUserId(newUserId);
  const now = new Date().toISOString();

  return await database.transaction(
    "rw",
    [
      database.entries,
      database.loans,
      database.loan_payments,
      database.categories,
      database.recurring_rules,
      database.profiles,
      database.outbox,
    ],
    async () => {
      let claimedEntriesCount = 0;

      // 1. Entries
      const guestEntries = await database.entries
        .filter((row) => !row.user_id || row.user_id === "")
        .toArray();
      claimedEntriesCount = guestEntries.length;
      for (const entry of guestEntries) {
        await database.entries.update(entry.id, {
          user_id: newUserId,
          updated_at: now,
        });
        await database.outbox.add({
          table: "entries",
          row_id: entry.id,
          created_at: now,
        });
      }

      // 2. Loans
      const guestLoans = await database.loans
        .filter((row) => !row.user_id || row.user_id === "")
        .toArray();
      for (const loan of guestLoans) {
        await database.loans.update(loan.id, {
          user_id: newUserId,
          updated_at: now,
        });
        await database.outbox.add({
          table: "loans",
          row_id: loan.id,
          created_at: now,
        });
      }

      // 3. Loan Payments
      const guestPayments = await database.loan_payments
        .filter((row) => !row.user_id || row.user_id === "")
        .toArray();
      for (const payment of guestPayments) {
        await database.loan_payments.update(payment.id, {
          user_id: newUserId,
          updated_at: now,
        });
        await database.outbox.add({
          table: "loan_payments",
          row_id: payment.id,
          created_at: now,
        });
      }

      // 4. Categories
      const guestCategories = await database.categories
        .filter((row) => !row.user_id || row.user_id === "")
        .toArray();
      for (const cat of guestCategories) {
        await database.categories.update(cat.id, {
          user_id: newUserId,
          updated_at: now,
        });
        await database.outbox.add({
          table: "categories",
          row_id: cat.id,
          created_at: now,
        });
      }

      // 5. Recurring Rules
      const guestRules = await database.recurring_rules
        .filter((row) => !row.user_id || row.user_id === "")
        .toArray();
      for (const rule of guestRules) {
        await database.recurring_rules.update(rule.id, {
          user_id: newUserId,
          updated_at: now,
        });
        await database.outbox.add({
          table: "recurring_rules",
          row_id: rule.id,
          created_at: now,
        });
      }

      // 6. Profiles
      const guestProfiles = await database.profiles
        .filter((row) => !row.user_id || row.user_id === "")
        .toArray();
      for (const prof of guestProfiles) {
        await database.profiles.delete(prof.user_id);
        await database.profiles.put({
          ...prof,
          user_id: newUserId,
          updated_at: now,
        });
        await database.outbox.add({
          table: "profiles",
          row_id: newUserId,
          created_at: now,
        });
      }

      return claimedEntriesCount;
    },
  );
}

export async function isGuestBannerDismissed(
  database: MoneyMapDatabase = db,
): Promise<boolean> {
  const meta = await database.meta.get("guest_banner_dismissed_until");
  if (!meta || typeof meta.value !== "string") return false;
  return new Date(meta.value).getTime() > Date.now();
}

export async function dismissGuestBanner(
  days = 7,
  database: MoneyMapDatabase = db,
): Promise<void> {
  const dismissedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  await database.meta.put({
    key: "guest_banner_dismissed_until",
    value: dismissedUntil,
  });
}

