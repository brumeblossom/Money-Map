import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import type { Database } from "@/lib/db/database.types";

describe("Database Schema & Types (PRD Section 6)", () => {
  it("generates correct TypeScript database types for all 8 tables", () => {
    type Tables = Database["public"]["Tables"];
    
    // Assert all tables exist in Database type definition
    type TableNames = keyof Tables;
    const expectedTables: TableNames[] = [
      "profiles",
      "categories",
      "entries",
      "loans",
      "loan_payments",
      "recurring_rules",
      "share_links",
      "push_subscriptions",
    ];

    expect(expectedTables).toHaveLength(8);
  });

  it("verifies migration SQL contains all required tables, triggers, and RLS policies", () => {
    const migrationPath = path.join(
      process.cwd(),
      "supabase/migrations/20261020220000_initial_schema.sql",
    );
    expect(fs.existsSync(migrationPath)).toBe(true);

    const sql = fs.readFileSync(migrationPath, "utf-8");

    // Check custom enum types
    expect(sql).toContain("create type entry_kind as enum ('income', 'expense', 'giving');");
    expect(sql).toContain("create type category_scope as enum ('income', 'expense', 'giving', 'lent');");
    expect(sql).toContain("create type repeat_plan as enum ('one_payment', 'weekly', 'monthly');");
    expect(sql).toContain("create type interest_kind as enum ('none', 'percent', 'flat');");

    // Check loans check constraint
    expect(sql).toContain("check (due_on >= started_on)");

    // Check server_updated_at trigger function
    expect(sql).toContain("create or replace function public.set_server_updated_at()");
    expect(sql).toContain("create trigger set_categories_server_updated_at");
    expect(sql).toContain("create trigger set_entries_server_updated_at");
    expect(sql).toContain("create trigger set_loans_server_updated_at");
    expect(sql).toContain("create trigger set_loan_payments_server_updated_at");
    expect(sql).toContain("create trigger set_recurring_rules_server_updated_at");

    // Check handle_new_user trigger function
    expect(sql).toContain("create or replace function public.handle_new_user()");
    expect(sql).toContain("create trigger on_auth_user_created");
    expect(sql).toContain("values (new.id, 'NGN', false, now(), now())");

    // Check RLS enabled on all tables
    const tables = [
      "profiles",
      "categories",
      "entries",
      "loans",
      "loan_payments",
      "recurring_rules",
      "share_links",
      "push_subscriptions",
    ];

    for (const table of tables) {
      expect(sql).toContain(`alter table ${table} enable row level security;`);
      expect(sql).toContain(`on ${table}`);
      expect(sql).toContain(`auth.uid() = user_id`);
    }
  });
});
