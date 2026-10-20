import { z } from "zod";

// Maximum amount: 999,999,999,999.99 (PRD section 4)
// In minor units: 99,999,999,999,999
export const MAX_AMOUNT_MINOR = 99_999_999_999_999;
export const MIN_AMOUNT_MINOR = 1;

// Date regex YYYY-MM-DD
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(dateStr: string): boolean {
  if (!ISO_DATE_REGEX.test(dateStr)) return false;
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (month < 1 || month > 12) return false;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day >= 1 && day <= daysInMonth;
}

export const dateStringSchema = z
  .string()
  .regex(ISO_DATE_REGEX, "Date must be in YYYY-MM-DD format")
  .refine(isValidIsoDate, "Invalid calendar date");

export const amountMinorSchema = z
  .number()
  .int("Amount must be an integer in minor units")
  .min(MIN_AMOUNT_MINOR, "Amount must be greater than 0")
  .max(MAX_AMOUNT_MINOR, "Amount exceeds maximum limit (999,999,999,999.99)");

export const repeatPlanSchema = z.enum(["one_payment", "weekly", "monthly"]);
export const formRepeatSchema = z.enum(["no", "weekly", "monthly"]).default("no");

export const categoryScopeSchema = z.enum(["income", "expense", "giving", "lent"]);
export const interestKindSchema = z.enum(["none", "percent", "flat"]);

// 4.1 Money in (kind = income)
export const incomeFormSchema = z.object({
  amount_minor: amountMinorSchema,
  category_id: z.string().uuid("Invalid category ID"),
  occurred_on: dateStringSchema.refine((dateStr) => {
    // Future dates allowed up to 1 year
    const d = new Date(dateStr + "T00:00:00Z");
    const maxFuture = new Date();
    maxFuture.setUTCFullYear(maxFuture.getUTCFullYear() + 1);
    maxFuture.setUTCHours(23, 59, 59, 999);
    return d.getTime() <= maxFuture.getTime();
  }, "Future dates cannot be more than 1 year ahead"),
  counterparty: z
    .string()
    .max(80, "Source cannot exceed 80 characters")
    .optional()
    .nullable(),
  repeats: formRepeatSchema.optional(),
  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional()
    .nullable(),
});

export type IncomeFormData = z.infer<typeof incomeFormSchema>;

// 4.2 Money out (kind = expense)
export const expenseFormSchema = z.object({
  amount_minor: amountMinorSchema,
  category_id: z.string().uuid("Invalid category ID"),
  occurred_on: dateStringSchema,
  repeats: formRepeatSchema.optional(),
  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional()
    .nullable(),
});

export type ExpenseFormData = z.infer<typeof expenseFormSchema>;

// 4.3 Giving (kind = giving)
export const givingFormSchema = z.object({
  amount_minor: amountMinorSchema,
  category_id: z.string().uuid("Invalid category ID"),
  occurred_on: dateStringSchema,
  counterparty: z
    .string()
    .max(80, "Given to cannot exceed 80 characters")
    .optional()
    .nullable(),
  repeats: formRepeatSchema.optional(),
  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional()
    .nullable(),
});

export type GivingFormData = z.infer<typeof givingFormSchema>;

// 4.4 Money I lent (loans)
export const loanFormSchema = z
  .object({
    counterparty: z
      .string()
      .min(1, "Borrower name is required")
      .max(80, "Borrower name cannot exceed 80 characters"),
    principal_minor: amountMinorSchema,
    category_id: z.string().uuid("Invalid category ID"),
    started_on: dateStringSchema,
    due_on: dateStringSchema,
    plan: repeatPlanSchema.default("one_payment"),
    instalment_minor: z
      .number()
      .int()
      .positive("Instalment must be greater than 0")
      .max(MAX_AMOUNT_MINOR)
      .optional()
      .nullable(),
    interest_type: interestKindSchema.default("none"),
    interest_value: z
      .number()
      .int()
      .min(0, "Interest cannot be negative")
      .default(0),
    remind: z.boolean().default(true),
    description: z
      .string()
      .max(500, "Description cannot exceed 500 characters")
      .optional()
      .nullable(),
  })
  .refine((data) => data.due_on >= data.started_on, {
    message: "Expected back by date must be on or after Date lent",
    path: ["due_on"],
  });

export type LoanFormData = z.infer<typeof loanFormSchema>;

// Record money received form (loan_payments)
export const loanPaymentFormSchema = z.object({
  loan_id: z.string().uuid("Invalid loan ID"),
  amount_minor: amountMinorSchema,
  paid_on: dateStringSchema,
  note: z
    .string()
    .max(200, "Note cannot exceed 200 characters")
    .optional()
    .nullable(),
});

export type LoanPaymentFormData = z.infer<typeof loanPaymentFormSchema>;

// Category form schema (PRD 6.1, 9.2)
export const categoryFormSchema = z.object({
  scope: categoryScopeSchema,
  name: z
    .string()
    .min(1, "Category name is required")
    .max(40, "Category name cannot exceed 40 characters"),
  slug: z.string().optional().nullable(),
  is_default: z.boolean().default(false),
  is_hidden: z.boolean().default(false),
  sort_order: z.number().int().default(0),
});

export type CategoryFormData = z.infer<typeof categoryFormSchema>;
