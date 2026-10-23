import * as React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { db } from "@/lib/db/dexie";
import { buildPeriodReport } from "@/lib/report/builder";
import { ExportModal } from "@/components/export-modal";
import { CategoriesSettings } from "@/components/categories-settings";
import { RecurringRulesList } from "@/components/recurring-rules-list";
import { HomeView } from "@/components/home-view";
import { createProfile, updateProfile } from "@/lib/repo";

describe("Prompt 16c: Verification of Export Choices, Delete Confirmations, and Live Profile Name", () => {
  beforeEach(async () => {
    await db.entries.clear();
    await db.loans.clear();
    await db.loan_payments.clear();
    await db.categories.clear();
    await db.recurring_rules.clear();
    await db.profiles.clear();
    await db.outbox.clear();
  });

  describe("1. Export Modal & Report Builder choices", () => {
    it("period and record types change the PDF report snapshot contents", () => {
      const entries = [
        {
          id: "e1",
          kind: "income",
          amount_minor: 500000,
          category_id: "c1",
          occurred_on: "2026-10-15",
          deleted_at: null,
        },
        {
          id: "e2",
          kind: "expense",
          amount_minor: 200000,
          category_id: "c2",
          occurred_on: "2026-10-10",
          deleted_at: null,
        },
        {
          id: "e3",
          kind: "giving",
          amount_minor: 50000,
          category_id: "c3",
          occurred_on: "2026-08-01", // 2 months ago
          deleted_at: null,
        },
      ];

      const loans = [
        {
          id: "l1",
          counterparty: "Tunde",
          principal_minor: 100000,
          category_id: "c4",
          started_on: "2026-10-01",
          due_on: "2026-10-31",
          deleted_at: null,
        },
      ];

      const categories = [
        { id: "c1", name: "Salary", scope: "income" },
        { id: "c2", name: "Food", scope: "expense" },
        { id: "c3", name: "Tithe", scope: "giving" },
        { id: "c4", name: "Lent", scope: "lent" },
      ];

      // October 2026 report with only Income
      const incomeOnlyReport = buildPeriodReport({
        periodStart: "2026-10-01",
        periodEnd: "2026-10-31",
        kinds: ["income"],
        hideDetails: false,
        entries,
        categories,
        loans,
        loanPayments: [],
        today: "2026-10-23",
      });

      expect(incomeOnlyReport.entries.length).toBe(1);
      expect(incomeOnlyReport.entries[0].action).toBe("Income");
      expect(incomeOnlyReport.totals.income).toBe(500000);
      expect(incomeOnlyReport.totals.expenses).toBe(0);
      expect(incomeOnlyReport.loans.length).toBe(0); // Lent excluded

      // October 2026 report with Income and Expenses and Lent
      const fullReport = buildPeriodReport({
        periodStart: "2026-10-01",
        periodEnd: "2026-10-31",
        kinds: ["income", "expense", "lent"],
        hideDetails: false,
        entries,
        categories,
        loans,
        loanPayments: [],
        today: "2026-10-23",
      });

      expect(fullReport.entries.length).toBe(2);
      expect(fullReport.totals.income).toBe(500000);
      expect(fullReport.totals.expenses).toBe(200000);
      expect(fullReport.loans.length).toBe(1);

      // Period filter changes: August 2026 to October 2026 includes Giving
      const multiMonthReport = buildPeriodReport({
        periodStart: "2026-08-01",
        periodEnd: "2026-10-31",
        kinds: ["giving"],
        hideDetails: false,
        entries,
        categories,
        loans,
        loanPayments: [],
        today: "2026-10-23",
      });

      expect(multiMonthReport.entries.length).toBe(1);
      expect(multiMonthReport.entries[0].action).toBe("Giving");
    });

    it("ExportModal renders all choices, controls checkbox selections, and allows cancel", () => {
      let open = true;
      const onOpenChange = (v: boolean) => {
        open = v;
      };

      const { rerender } = render(
        <ExportModal open={open} onOpenChange={onOpenChange} currency="NGN" />,
      );

      // Verify choices are rendered
      expect(screen.getAllByText("Export PDF").length).toBeGreaterThan(0);
      expect(screen.getByText("This month")).toBeInTheDocument();
      expect(screen.getByText("Last 3 months")).toBeInTheDocument();
      expect(screen.getByText("Last 6 months")).toBeInTheDocument();
      expect(screen.getByText("Last 12 months")).toBeInTheDocument();
      expect(screen.getByText("Custom")).toBeInTheDocument();

      // Checkboxes
      const allCheck = screen.getByLabelText("All") as HTMLInputElement;
      const incomeCheck = screen.getByLabelText("Income") as HTMLInputElement;
      const expensesCheck = screen.getByLabelText("Expenses") as HTMLInputElement;
      const givingCheck = screen.getByLabelText("Giving") as HTMLInputElement;
      const lentCheck = screen.getByLabelText("Lent") as HTMLInputElement;

      expect(allCheck.checked).toBe(true);
      expect(incomeCheck.checked).toBe(true);
      expect(expensesCheck.checked).toBe(true);
      expect(givingCheck.checked).toBe(true);
      expect(lentCheck.checked).toBe(true);

      // Toggling Income unchecks All
      fireEvent.click(incomeCheck);
      expect(incomeCheck.checked).toBe(false);
      expect(allCheck.checked).toBe(false);

      // Toggling All checks everything back
      fireEvent.click(allCheck);
      expect(incomeCheck.checked).toBe(true);
      expect(expensesCheck.checked).toBe(true);
      expect(givingCheck.checked).toBe(true);
      expect(lentCheck.checked).toBe(true);

      // Cancel button closes modal
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(open).toBe(false);

      rerender(<ExportModal open={open} onOpenChange={onOpenChange} currency="NGN" />);
      expect(screen.queryByText("Choose a period and record types to download as a PDF report.")).not.toBeInTheDocument();
    });
  });

  describe("2. Every delete asks for confirmation first", () => {
    it("Category deletion requires confirmation before deleting", async () => {
      // Seed a custom category
      const customCat = {
        id: "cat-custom-1",
        user_id: "user-123",
        name: "Freelance",
        slug: "freelance",
        scope: "income" as const,
        is_default: false,
        is_hidden: false,
        sort_order: 10,
        server_updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };
      await db.categories.add(customCat);

      render(<CategoriesSettings />);

      // Find the delete button for Freelance
      await waitFor(() => {
        expect(screen.getByText("Freelance")).toBeInTheDocument();
      });

      const deleteBtn = screen.getByTestId("category-delete-btn-cat-custom-1");
      fireEvent.click(deleteBtn);

      // Confirmation dialog must appear
      await waitFor(() => {
        expect(screen.getByText("Delete category?")).toBeInTheDocument();
      });
      expect(
        screen.getByText(/will be permanently deleted/i),
      ).toBeInTheDocument();

      // Click Cancel - category should NOT be deleted
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      await waitFor(() => {
        expect(screen.queryByText("Delete category?")).not.toBeInTheDocument();
      });
      const catStillThere = await db.categories.get("cat-custom-1");
      expect(catStillThere?.deleted_at).toBeNull();

      // Click Delete again, then confirm Delete
      fireEvent.click(deleteBtn);
      await waitFor(() => {
        expect(screen.getByText("Delete category?")).toBeInTheDocument();
      });

      const confirmDeleteBtn = screen.getByTestId("confirm-delete-category-btn");
      fireEvent.click(confirmDeleteBtn);

      await waitFor(async () => {
        const catDeleted = await db.categories.get("cat-custom-1");
        expect(catDeleted?.deleted_at).not.toBeNull();
      });
    });

    it("Repeating entry deletion requires confirmation before deleting", async () => {
      const rule = {
        id: "rule-1",
        user_id: "user-123",
        kind: "expense" as const,
        amount_minor: 1500000,
        category_id: "c-rent",
        counterparty: "Landlord",
        description: null,
        frequency: "monthly" as const,
        interval: 1,
        start_date: "2026-10-01",
        next_due_on: "2026-11-01",
        day_of_month: 1,
        active: true,
        is_paused: false,
        server_updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };
      await db.recurring_rules.add(rule);

      render(<RecurringRulesList />);

      await waitFor(() => {
        expect(screen.getByText("Landlord")).toBeInTheDocument();
      });

      const deleteBtn = screen.getByTestId("rule-delete-btn");
      fireEvent.click(deleteBtn);

      // Confirmation dialog must appear
      expect(screen.getByText("Delete repeating entry?")).toBeInTheDocument();
      expect(
        screen.getByText("This repeating reminder will be removed. Past records already created will not be affected."),
      ).toBeInTheDocument();

      // Click Cancel - rule should NOT be deleted
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.queryByText("Delete repeating entry?")).not.toBeInTheDocument();
      const ruleStillThere = await db.recurring_rules.get("rule-1");
      expect(ruleStillThere?.deleted_at).toBeNull();

      // Click Delete again and confirm
      fireEvent.click(deleteBtn);
      const confirmDeleteBtn = screen.getByTestId("confirm-delete-rule-btn");
      fireEvent.click(confirmDeleteBtn);

      await waitFor(async () => {
        const ruleDeleted = await db.recurring_rules.get("rule-1");
        expect(ruleDeleted?.deleted_at).not.toBeNull();
      });
    });
  });

  describe("3. Name in welcome note updates without reload", () => {
    it("Home welcome note updates full display name reactively when profile changes in Dexie", async () => {
      // Create initial profile
      await createProfile({
        user_id: "user-123",
        display_name: "Amara Okonkwo",
        currency: "NGN",
      });

      render(<HomeView />);

      // Initial check shows full display name
      await waitFor(() => {
        expect(screen.getByText("Welcome back, Amara Okonkwo")).toBeInTheDocument();
      });

      // Update name in Dexie (simulating Save in Settings modal)
      await updateProfile("user-123", {
        display_name: "Chidi Nnamdi",
      });

      // Welcome back should reactively update to full name without reload
      await waitFor(() => {
        expect(screen.getByText("Welcome back, Chidi Nnamdi")).toBeInTheDocument();
      });
    });
  });
});
