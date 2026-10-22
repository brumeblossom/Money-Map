"use client";

import * as React from "react";
import type { ReportSnapshot } from "@/lib/report/types";
import { formatMoney } from "@/lib/format";

export interface ReportViewProps {
  snapshot: ReportSnapshot;
}

export function ReportView({ snapshot }: ReportViewProps) {
  if (snapshot.type === "single_entry") {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex items-start justify-between border-b border-border/70 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Money Map
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {snapshot.displayDate}
            </p>
          </div>
          {snapshot.userName ? (
            <span className="text-sm font-semibold text-foreground">
              {snapshot.userName}
            </span>
          ) : null}
        </header>

        <div className="mb-6 rounded-2xl border border-border/60 bg-card p-6 text-center shadow-xs">
          <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            {snapshot.action}
          </span>
          <h2 className="my-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {formatMoney(snapshot.amount, snapshot.currency)}
          </h2>
          <span className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
            {snapshot.category}
          </span>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs">
          <h3 className="mb-3 text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Transaction Details
          </h3>
          <dl className="divide-y divide-border/40 text-sm">
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted-foreground">Action</dt>
              <dd className="font-medium text-foreground">{snapshot.action}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted-foreground">Category</dt>
              <dd className="font-medium text-foreground">{snapshot.category}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted-foreground">Date</dt>
              <dd className="font-medium text-foreground">{snapshot.displayDate}</dd>
            </div>
            {!snapshot.hideDetails && snapshot.counterparty && (
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-muted-foreground">
                  {snapshot.action === "Income" ? "Source" : "Recipient"}
                </dt>
                <dd className="font-medium text-foreground">
                  {snapshot.counterparty}
                </dd>
              </div>
            )}
            {!snapshot.hideDetails && snapshot.description && (
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-muted-foreground">Description</dt>
                <dd className="font-medium text-foreground">
                  {snapshot.description}
                </dd>
              </div>
            )}
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted-foreground">Repeats</dt>
              <dd className="font-medium text-foreground">{snapshot.repeats}</dd>
            </div>
          </dl>
        </div>

        <footer className="mt-12 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground">
          Made with Money Map
        </footer>
      </div>
    );
  }

  if (snapshot.type === "single_loan") {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex items-start justify-between border-b border-border/70 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Money Map
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Loan {!snapshot.hideDetails ? `to ${snapshot.borrower}` : ""}
            </p>
          </div>
          {snapshot.userName ? (
            <span className="text-sm font-semibold text-foreground">
              {snapshot.userName}
            </span>
          ) : null}
        </header>

        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border/60 bg-card p-3 shadow-xs">
            <span className="block text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Amount Lent
            </span>
            <span className="mt-1 block text-base font-bold text-foreground sm:text-lg">
              {formatMoney(snapshot.amountLent, snapshot.currency)}
            </span>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-3 shadow-xs">
            <span className="block text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Received
            </span>
            <span className="mt-1 block text-base font-bold text-emerald-600 dark:text-emerald-400 sm:text-lg">
              {formatMoney(snapshot.receivedSoFar, snapshot.currency)}
            </span>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-3 shadow-xs">
            <span className="block text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Balance
            </span>
            <span className="mt-1 block text-base font-bold text-foreground sm:text-lg">
              {formatMoney(snapshot.balanceLeft, snapshot.currency)}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs">
          <h3 className="mb-3 text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Loan Details
          </h3>
          <dl className="divide-y divide-border/40 text-sm">
            {!snapshot.hideDetails && (
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-muted-foreground">Borrower</dt>
                <dd className="font-medium text-foreground">{snapshot.borrower}</dd>
              </div>
            )}
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted-foreground">Interest</dt>
              <dd className="font-medium text-foreground">{snapshot.interest}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted-foreground">Total to get back</dt>
              <dd className="font-medium text-foreground">
                {formatMoney(snapshot.totalToGetBack, snapshot.currency)}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted-foreground">Expected back by</dt>
              <dd className="font-medium text-foreground">{snapshot.expectedBackBy}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium text-foreground">{snapshot.status}</dd>
            </div>
          </dl>
        </div>

        {snapshot.payments.length > 0 && (
          <div className="mt-6 rounded-2xl border border-border/60 bg-card p-5 shadow-xs">
            <h3 className="mb-3 text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Money received
            </h3>
            <div className="divide-y divide-border/40 text-sm">
              {snapshot.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <span className="block font-medium text-foreground">{p.date}</span>
                    {!snapshot.hideDetails && p.note && (
                      <span className="block text-xs text-muted-foreground">{p.note}</span>
                    )}
                  </div>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    +{formatMoney(p.amount, snapshot.currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <footer className="mt-12 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground">
          Made with Money Map
        </footer>
      </div>
    );
  }

  // Period report
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      {/* Header */}
      <header className="mb-6 flex items-start justify-between border-b border-border/70 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Money Map
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {snapshot.periodLabel}
          </p>
        </div>
        {snapshot.userName ? (
          <div className="text-right">
            <span className="text-xs text-muted-foreground block">Prepared for</span>
            <span className="text-sm font-semibold text-foreground">
              {snapshot.userName}
            </span>
          </div>
        ) : null}
      </header>

      {/* Totals Summary */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border border-border/60 bg-card p-3.5 shadow-xs">
          <span className="block text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            Income
          </span>
          <span className="mt-1 block text-base font-bold text-emerald-600 dark:text-emerald-400 sm:text-lg">
            {formatMoney(snapshot.totals.income, snapshot.currency)}
          </span>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-3.5 shadow-xs">
          <span className="block text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            Expenses
          </span>
          <span className="mt-1 block text-base font-bold text-rose-600 dark:text-rose-400 sm:text-lg">
            {formatMoney(snapshot.totals.expenses, snapshot.currency)}
          </span>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-3.5 shadow-xs">
          <span className="block text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            Giving
          </span>
          <span className="mt-1 block text-base font-bold text-foreground sm:text-lg">
            {formatMoney(snapshot.totals.giving, snapshot.currency)}
          </span>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-3.5 shadow-xs">
          <span className="block text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            Left over
          </span>
          <span className="mt-1 block text-base font-bold text-foreground sm:text-lg">
            {formatMoney(snapshot.totals.leftOver, snapshot.currency)}
          </span>
        </div>
        <div className="col-span-2 sm:col-span-1 rounded-xl border border-border/60 bg-card p-3.5 shadow-xs">
          <span className="block text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            Money I lent
          </span>
          <span className="mt-1 block text-base font-bold text-foreground sm:text-lg">
            {formatMoney(snapshot.totals.lentBalance, snapshot.currency)}
          </span>
        </div>
      </div>

      {/* Category Breakdown */}
      {snapshot.categories.length > 0 && (
        <div className="mb-8 rounded-2xl border border-border/60 bg-card p-5 shadow-xs">
          <h2 className="mb-3 text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Category Breakdown
          </h2>
          <div className="flex flex-wrap gap-2">
            {snapshot.categories.map((c, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/40 px-3 py-1.5 text-xs"
              >
                <span className="font-medium text-foreground">{c.name}:</span>
                <span className="font-semibold text-foreground">
                  {formatMoney(c.amount, snapshot.currency)}
                </span>
                <span className="text-[11px] text-muted-foreground">({c.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entries Table */}
      {snapshot.entries.length > 0 && (
        <div className="mb-8 rounded-2xl border border-border/60 bg-card p-5 shadow-xs">
          <h2 className="mb-4 text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Entries
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground">
                  <th className="py-2.5 pr-3 font-semibold">Date</th>
                  <th className="py-2.5 pr-3 font-semibold">Action</th>
                  <th className="py-2.5 pr-3 font-semibold">Category</th>
                  <th className="py-2.5 pr-3 font-semibold">Description</th>
                  <th className="py-2.5 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {snapshot.entries.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/20">
                    <td className="py-2.5 pr-3 text-muted-foreground">{e.displayDate}</td>
                    <td className="py-2.5 pr-3 font-medium text-foreground">{e.action}</td>
                    <td className="py-2.5 pr-3 text-foreground">{e.category}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{e.description}</td>
                    <td
                      className={`py-2.5 text-right font-bold ${
                        e.action === "Income"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {formatMoney(e.amount, snapshot.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Loans Table */}
      {snapshot.loans.length > 0 && (
        <div className="mb-8 rounded-2xl border border-border/60 bg-card p-5 shadow-xs">
          <h2 className="mb-4 text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Money I Lent
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground">
                  <th className="py-2.5 pr-3 font-semibold">Borrower</th>
                  <th className="py-2.5 pr-3 text-right font-semibold">Amount Lent</th>
                  <th className="py-2.5 pr-3 text-right font-semibold">Received</th>
                  <th className="py-2.5 pr-3 text-right font-semibold">Balance</th>
                  <th className="py-2.5 text-right font-semibold">Expected By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {snapshot.loans.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/20">
                    <td className="py-2.5 pr-3 font-medium text-foreground">{l.borrower}</td>
                    <td className="py-2.5 pr-3 text-right text-muted-foreground">
                      {formatMoney(l.amountLent, snapshot.currency)}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-muted-foreground">
                      {formatMoney(l.received, snapshot.currency)}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-bold text-foreground">
                      {formatMoney(l.balance, snapshot.currency)}
                    </td>
                    <td className="py-2.5 text-right text-muted-foreground">
                      {l.expectedBackBy}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground">
        Made with Money Map
      </footer>
    </div>
  );
}
