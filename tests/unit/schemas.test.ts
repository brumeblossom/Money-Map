import { describe, it, expect } from "vitest";
import {
  incomeFormSchema,
  expenseFormSchema,
  givingFormSchema,
  loanFormSchema,
  loanPaymentFormSchema,
  categoryFormSchema,
  MAX_AMOUNT_MINOR,
} from "@/lib/schemas";

describe("Zod Form Schemas (PRD Section 4)", () => {
  const validCategoryId = crypto.randomUUID();
  const validLoanId = crypto.randomUUID();

  describe("Amount rules (greater than 0, at most 999,999,999,999.99)", () => {
    it("rejects 0 amount", () => {
      const res = incomeFormSchema.safeParse({
        amount_minor: 0,
        category_id: validCategoryId,
        occurred_on: "2026-10-20",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("greater than 0");
      }
    });

    it("rejects negative amount", () => {
      const res = expenseFormSchema.safeParse({
        amount_minor: -100,
        category_id: validCategoryId,
        occurred_on: "2026-10-20",
      });
      expect(res.success).toBe(false);
    });

    it("rejects amount exceeding 999,999,999,999.99 (99,999,999,999,999 minor)", () => {
      const res = givingFormSchema.safeParse({
        amount_minor: MAX_AMOUNT_MINOR + 1,
        category_id: validCategoryId,
        occurred_on: "2026-10-20",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("maximum limit");
      }
    });

    it("accepts valid boundary amounts: 1 minor unit and 99,999,999,999,999 minor units", () => {
      expect(
        incomeFormSchema.safeParse({
          amount_minor: 1,
          category_id: validCategoryId,
          occurred_on: "2026-10-20",
        }).success,
      ).toBe(true);

      expect(
        incomeFormSchema.safeParse({
          amount_minor: MAX_AMOUNT_MINOR,
          category_id: validCategoryId,
          occurred_on: "2026-10-20",
        }).success,
      ).toBe(true);
    });

    it("rejects non-integer minor unit amounts (e.g. floats)", () => {
      const res = expenseFormSchema.safeParse({
        amount_minor: 1500.5,
        category_id: validCategoryId,
        occurred_on: "2026-10-20",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("integer");
      }
    });
  });

  describe("Date validation (YYYY-MM-DD & real calendar dates)", () => {
    it("rejects invalid date format", () => {
      const res = expenseFormSchema.safeParse({
        amount_minor: 1000,
        category_id: validCategoryId,
        occurred_on: "20-10-2026", // Display format not allowed in internal schema
      });
      expect(res.success).toBe(false);
    });

    it("rejects invalid calendar dates like 2026-02-31", () => {
      const res = expenseFormSchema.safeParse({
        amount_minor: 1000,
        category_id: validCategoryId,
        occurred_on: "2026-02-31",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("Invalid calendar date");
      }
    });

    it("income form rejects dates more than 1 year in the future", () => {
      const res = incomeFormSchema.safeParse({
        amount_minor: 100000,
        category_id: validCategoryId,
        occurred_on: "2099-01-01",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("more than 1 year ahead");
      }
    });
  });

  describe("Text field limits", () => {
    it("rejects counterparty > 80 chars", () => {
      const longName = "A".repeat(81);
      const res = incomeFormSchema.safeParse({
        amount_minor: 1000,
        category_id: validCategoryId,
        occurred_on: "2026-10-20",
        counterparty: longName,
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("cannot exceed 80 characters");
      }
    });

    it("rejects description > 500 chars", () => {
      const longDesc = "A".repeat(501);
      const res = expenseFormSchema.safeParse({
        amount_minor: 1000,
        category_id: validCategoryId,
        occurred_on: "2026-10-20",
        description: longDesc,
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("cannot exceed 500 characters");
      }
    });

    it("loan payment rejects note > 200 chars", () => {
      const longNote = "A".repeat(201);
      const res = loanPaymentFormSchema.safeParse({
        loan_id: validLoanId,
        amount_minor: 50000,
        paid_on: "2026-10-20",
        note: longNote,
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("cannot exceed 200 characters");
      }
    });
  });

  describe("Loans form rules (PRD 4.4)", () => {
    it("rejects empty borrower name", () => {
      const res = loanFormSchema.safeParse({
        counterparty: "",
        principal_minor: 500000,
        category_id: validCategoryId,
        started_on: "2026-10-20",
        due_on: "2026-11-20",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("Borrower name is required");
      }
    });

    it("rejects due_on before started_on", () => {
      const res = loanFormSchema.safeParse({
        counterparty: "Ada",
        principal_minor: 500000,
        category_id: validCategoryId,
        started_on: "2026-10-20",
        due_on: "2026-10-19",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain(
          "Expected back by date must be on or after Date lent",
        );
      }
    });

    it("accepts due_on equal to or after started_on", () => {
      expect(
        loanFormSchema.safeParse({
          counterparty: "Ada",
          principal_minor: 500000,
          category_id: validCategoryId,
          started_on: "2026-10-20",
          due_on: "2026-10-20", // Same day is valid
        }).success,
      ).toBe(true);

      expect(
        loanFormSchema.safeParse({
          counterparty: "Ada",
          principal_minor: 500000,
          category_id: validCategoryId,
          started_on: "2026-10-20",
          due_on: "2026-12-20",
        }).success,
      ).toBe(true);
    });

    it("rejects negative interest", () => {
      const res = loanFormSchema.safeParse({
        counterparty: "Ada",
        principal_minor: 500000,
        category_id: validCategoryId,
        started_on: "2026-10-20",
        due_on: "2026-11-20",
        interest_value: -50,
      });
      expect(res.success).toBe(false);
    });
  });

  describe("Category form rules (PRD 6.1, 9.2)", () => {
    it("rejects empty category name", () => {
      const res = categoryFormSchema.safeParse({
        scope: "expense",
        name: "",
      });
      expect(res.success).toBe(false);
    });

    it("rejects category name > 40 chars", () => {
      const res = categoryFormSchema.safeParse({
        scope: "expense",
        name: "A".repeat(41),
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("cannot exceed 40 characters");
      }
    });

    it("rejects invalid scope", () => {
      const res = categoryFormSchema.safeParse({
        scope: "unknown_scope",
        name: "Food",
      });
      expect(res.success).toBe(false);
    });
  });
});
