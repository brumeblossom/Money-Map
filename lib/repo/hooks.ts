"use client";

import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  type EntryRow,
  type CategoryRow,
  type LoanRow,
  type LoanPaymentRow,
  type CategoryScope,
} from "@/lib/db/dexie";
import { listEntries, type EntryFilter } from "./index";

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
 */
export function useCategories(
  scope?: CategoryScope,
  includeHidden = false,
): CategoryRow[] | undefined {
  return useLiveQuery(
    () =>
      db.categories.toArray().then((rows) =>
        rows
          .filter((row) => {
            if (row.deleted_at !== null) return false;
            if (scope && row.scope !== scope) return false;
            if (!includeHidden && row.is_hidden) return false;
            return true;
          })
          .sort((a, b) => a.sort_order - b.sort_order),
      ),
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
