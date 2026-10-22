"use client";

import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  type EntryRow,
  type CategoryRow,
  type LoanRow,
  type LoanPaymentRow,
  type RecurringRuleRow,
  type CategoryScope,
} from "@/lib/db/dexie";
import { listEntries, type EntryFilter } from "./index";
import { getCurrentUserId } from "./user";
import { toSlug } from "./seed";

/**
 * Live reactive hook for entries list (PRD section 8, Prompt 4).
 * Updates automatically whenever entries table changes in Dexie.
 */
export function useEntries(filter?: EntryFilter): EntryRow[] | undefined {
  return useLiveQuery(
    () => listEntries(filter, db),
    [
      filter?.kind,
      filter?.category_id,
      filter?.period?.start,
      filter?.period?.end,
      filter?.includeDeleted,
    ],
  );
}

/**
 * Live reactive hook for categories list filtered by scope.
 * Deduplicates by (scope, slug || lowercase name) and prioritizes user's categories.
 */
export function useCategories(
  scope?: CategoryScope,
  includeHidden = false,
): CategoryRow[] | undefined {
  return useLiveQuery(
    async () => {
      const currentUserId = getCurrentUserId();
      const rows = await db.categories.toArray();

      const filtered = rows.filter((row) => {
        if (row.deleted_at !== null) return false;
        if (scope && row.scope !== scope) return false;
        if (!includeHidden && row.is_hidden) return false;
        return true;
      });

      // Deduplicate by key: `${scope}:${slug || lowercase name}`
      const seen = new Map<string, CategoryRow>();
      for (const row of filtered) {
        const key = `${row.scope}:${(row.slug || toSlug(row.name)).toLowerCase()}`;
        const existing = seen.get(key);

        if (!existing) {
          seen.set(key, row);
        } else {
          // If current user is signed in, prefer rows with user_id
          if (currentUserId && row.user_id === currentUserId && existing.user_id !== currentUserId) {
            seen.set(key, row);
          } else if (row.updated_at > existing.updated_at) {
            seen.set(key, row);
          }
        }
      }

      return Array.from(seen.values()).sort((a, b) => a.sort_order - b.sort_order);
    },
    [scope, includeHidden],
  );
}

/**
 * Live reactive hook for loans list.
 */
export function useLoans(includeDeleted = false): LoanRow[] | undefined {
  return useLiveQuery(
    () =>
      db.loans
        .toArray()
        .then((rows) => rows.filter((row) => includeDeleted || row.deleted_at === null)),
    [includeDeleted],
  );
}

/**
 * Live reactive hook for loan payments list.
 */
export function useLoanPayments(
  loanId?: string,
  includeDeleted = false,
): LoanPaymentRow[] | undefined {
  return useLiveQuery(
    () =>
      db.loan_payments.toArray().then((rows) =>
        rows.filter((row) => {
          if (!includeDeleted && row.deleted_at !== null) return false;
          if (loanId && row.loan_id !== loanId) return false;
          return true;
        }),
      ),
    [loanId, includeDeleted],
  );
}

/**
 * Live reactive hook for recurring rules list.
 */
export function useRecurringRules(
  includeDeleted = false,
): RecurringRuleRow[] | undefined {
  return useLiveQuery(
    () =>
      db.recurring_rules
        .toArray()
        .then((rows) => rows.filter((row) => includeDeleted || row.deleted_at === null)),
    [includeDeleted],
  );
}
