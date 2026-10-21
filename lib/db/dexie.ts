import Dexie, { type EntityTable } from "dexie";
import type { Database } from "@/lib/db/database.types";

// Re-use column names and types from Database schema (PRD 6.1, 6.3)
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
export type EntryRow = Database["public"]["Tables"]["entries"]["Row"];
export type LoanRow = Database["public"]["Tables"]["loans"]["Row"];
export type LoanPaymentRow = Database["public"]["Tables"]["loan_payments"]["Row"];
export type RecurringRuleRow = Database["public"]["Tables"]["recurring_rules"]["Row"];

export type EntryKind = Database["public"]["Enums"]["entry_kind"];
export type CategoryScope = Database["public"]["Enums"]["category_scope"];
export type RepeatPlan = Database["public"]["Enums"]["repeat_plan"];
export type InterestKind = Database["public"]["Enums"]["interest_kind"];

export type SyncableTable =
  | "profiles"
  | "categories"
  | "entries"
  | "loans"
  | "loan_payments"
  | "recurring_rules";

export interface OutboxItem {
  seq?: number;
  table: SyncableTable;
  row_id: string;
  created_at?: string;
}

export interface MetaItem {
  key: string;
  value: unknown;
}

// Dexie database "moneymap" with exact stores from PRD 6.3
export class MoneyMapDatabase extends Dexie {
  profiles!: EntityTable<ProfileRow, "user_id">;
  categories!: EntityTable<CategoryRow, "id">;
  entries!: EntityTable<EntryRow, "id">;
  loans!: EntityTable<LoanRow, "id">;
  loan_payments!: EntityTable<LoanPaymentRow, "id">;
  recurring_rules!: EntityTable<RecurringRuleRow, "id">;
  outbox!: EntityTable<OutboxItem, "seq">;
  meta!: EntityTable<MetaItem, "key">;

  constructor(dbName = "moneymap") {
    super(dbName);

    // Exact store schema per PRD 6.3
    this.version(1).stores({
      profiles: "user_id",
      categories: "id, user_id, scope, [scope+is_hidden], updated_at",
      entries:
        "id, user_id, kind, category_id, occurred_on, [kind+occurred_on], updated_at, deleted_at",
      loans: "id, user_id, due_on, updated_at",
      loan_payments: "id, loan_id, paid_on, updated_at",
      recurring_rules: "id, next_due_on, updated_at",
      outbox: "++seq, table, row_id",
      meta: "key",
    });
  }
}

// Export singleton database instance
export const db = new MoneyMapDatabase();

if (typeof window !== "undefined") {
  (window as unknown as { __db: MoneyMapDatabase }).__db = db;
}
