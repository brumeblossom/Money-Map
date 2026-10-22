import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ReportSnapshot } from "@/lib/report/types";
import { formatMoney } from "@/lib/format";

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    borderBottomStyle: "solid",
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 10,
    color: "#475569",
    marginTop: 4,
  },
  userName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    textAlign: "right",
  },
  totalsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  totalCard: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
  },
  totalLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  totalValueIncome: {
    color: "#059669",
  },
  totalValueExpense: {
    color: "#e11d48",
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 8,
    marginTop: 12,
  },
  table: {
    width: "100%",
    marginBottom: 16,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    borderBottomStyle: "solid",
    paddingVertical: 5,
    alignItems: "center",
  },
  tableHeaderRow: {
    backgroundColor: "#f8fafc",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    borderTopStyle: "solid",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    borderBottomStyle: "solid",
    paddingVertical: 6,
  },
  th: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#475569",
    textTransform: "uppercase",
  },
  td: {
    fontSize: 8.5,
    color: "#1e293b",
  },
  colDate: { width: "16%" },
  colAction: { width: "16%" },
  colCategory: { width: "20%" },
  colDescription: { width: "30%" },
  colAmount: { width: "18%", textAlign: "right" },
  colBorrower: { width: "24%" },
  colLent: { width: "19%", textAlign: "right" },
  colReceived: { width: "19%", textAlign: "right" },
  colBalance: { width: "19%", textAlign: "right" },
  colDue: { width: "19%", textAlign: "right" },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  categoryBadge: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignItems: "center",
    gap: 4,
  },
  categoryName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#334155",
  },
  categoryAmount: {
    fontSize: 8,
    color: "#64748b",
  },
  singleAmountBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    padding: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  singleAmount: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginVertical: 4,
  },
  detailsList: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    borderTopStyle: "solid",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    borderBottomStyle: "solid",
  },
  detailLabel: {
    color: "#64748b",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  detailValue: {
    color: "#0f172a",
    fontSize: 9,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    borderTopStyle: "solid",
    paddingTop: 8,
    fontSize: 8,
    color: "#94a3b8",
  },
});

export interface ReportPdfProps {
  snapshot: ReportSnapshot;
}

export function ReportPdfDocument({ snapshot }: ReportPdfProps) {
  if (snapshot.type === "single_entry") {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.title}>Money Map</Text>
                <Text style={styles.subtitle}>{snapshot.displayDate}</Text>
              </View>
              {snapshot.userName ? (
                <Text style={styles.userName}>{snapshot.userName}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.singleAmountBox}>
            <Text style={styles.totalLabel}>{snapshot.action.toUpperCase()}</Text>
            <Text style={styles.singleAmount}>
              {formatMoney(snapshot.amount, snapshot.currency)}
            </Text>
            <Text style={{ fontSize: 9, color: "#64748b" }}>{snapshot.category}</Text>
          </View>

          <View style={styles.detailsList}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Action</Text>
              <Text style={styles.detailValue}>{snapshot.action}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.detailValue}>{snapshot.category}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{snapshot.displayDate}</Text>
            </View>
            {snapshot.counterparty ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  {snapshot.action === "Income" ? "Source" : "Recipient"}
                </Text>
                <Text style={styles.detailValue}>{snapshot.counterparty}</Text>
              </View>
            ) : null}
            {snapshot.description ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.detailValue}>{snapshot.description}</Text>
              </View>
            ) : null}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Repeats</Text>
              <Text style={styles.detailValue}>{snapshot.repeats}</Text>
            </View>
          </View>

          <View style={styles.footer} fixed>
            <Text>Made with Money Map</Text>
            <Text
              render={({ pageNumber, totalPages }) =>
                `Page ${pageNumber} of ${totalPages}`
              }
            />
          </View>
        </Page>
      </Document>
    );
  }

  if (snapshot.type === "single_loan") {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.title}>Money Map</Text>
                <Text style={styles.subtitle}>Loan to {snapshot.borrower}</Text>
              </View>
              {snapshot.userName ? (
                <Text style={styles.userName}>{snapshot.userName}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.totalsGrid}>
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>AMOUNT LENT</Text>
              <Text style={styles.totalValue}>
                {formatMoney(snapshot.amountLent, snapshot.currency)}
              </Text>
            </View>
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>RECEIVED SO FAR</Text>
              <Text style={styles.totalValue}>
                {formatMoney(snapshot.receivedSoFar, snapshot.currency)}
              </Text>
            </View>
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>BALANCE LEFT</Text>
              <Text style={styles.totalValue}>
                {formatMoney(snapshot.balanceLeft, snapshot.currency)}
              </Text>
            </View>
          </View>

          <View style={styles.detailsList}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Borrower</Text>
              <Text style={styles.detailValue}>{snapshot.borrower}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Interest</Text>
              <Text style={styles.detailValue}>{snapshot.interest}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total to get back</Text>
              <Text style={styles.detailValue}>
                {formatMoney(snapshot.totalToGetBack, snapshot.currency)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Expected back by</Text>
              <Text style={styles.detailValue}>{snapshot.expectedBackBy}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={styles.detailValue}>{snapshot.status}</Text>
            </View>
          </View>

          {snapshot.payments.length > 0 && (
            <View style={{ marginTop: 14 }}>
              <Text style={styles.sectionTitle}>Money received</Text>
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeaderRow]}>
                  <Text style={[styles.th, { width: "30%" }]}>Date</Text>
                  <Text style={[styles.th, { width: "40%" }]}>Note</Text>
                  <Text style={[styles.th, { width: "30%", textAlign: "right" }]}>
                    Amount
                  </Text>
                </View>
                {snapshot.payments.map((p) => (
                  <View key={p.id} style={styles.tableRow}>
                    <Text style={[styles.td, { width: "30%" }]}>{p.date}</Text>
                    <Text style={[styles.td, { width: "40%" }]}>{p.note || "—"}</Text>
                    <Text
                      style={[
                        styles.td,
                        { width: "30%", textAlign: "right", fontFamily: "Helvetica-Bold" },
                      ]}
                    >
                      +{formatMoney(p.amount, snapshot.currency)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.footer} fixed>
            <Text>Made with Money Map</Text>
            <Text
              render={({ pageNumber, totalPages }) =>
                `Page ${pageNumber} of ${totalPages}`
              }
            />
          </View>
        </Page>
      </Document>
    );
  }

  // Period report
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.title}>Money Map</Text>
              <Text style={styles.subtitle}>{snapshot.periodLabel}</Text>
            </View>
            {snapshot.userName ? (
              <Text style={styles.userName}>{snapshot.userName}</Text>
            ) : null}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalsGrid}>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>INCOME</Text>
            <Text style={[styles.totalValue, styles.totalValueIncome]}>
              {formatMoney(snapshot.totals.income, snapshot.currency)}
            </Text>
          </View>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>EXPENSES</Text>
            <Text style={[styles.totalValue, styles.totalValueExpense]}>
              {formatMoney(snapshot.totals.expenses, snapshot.currency)}
            </Text>
          </View>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>GIVING</Text>
            <Text style={styles.totalValue}>
              {formatMoney(snapshot.totals.giving, snapshot.currency)}
            </Text>
          </View>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>LEFT OVER</Text>
            <Text style={styles.totalValue}>
              {formatMoney(snapshot.totals.leftOver, snapshot.currency)}
            </Text>
          </View>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>MONEY I LENT</Text>
            <Text style={styles.totalValue}>
              {formatMoney(snapshot.totals.lentBalance, snapshot.currency)}
            </Text>
          </View>
        </View>

        {/* Category Breakdown */}
        {snapshot.categories.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>Category Breakdown</Text>
            <View style={styles.categoriesGrid}>
              {snapshot.categories.map((c, i) => (
                <View key={i} style={styles.categoryBadge}>
                  <Text style={styles.categoryName}>{c.name}:</Text>
                  <Text style={styles.categoryAmount}>
                    {formatMoney(c.amount, snapshot.currency)} ({c.percentage}%)
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Entries Table */}
        {snapshot.entries.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Entries</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeaderRow]}>
                <Text style={[styles.th, styles.colDate]}>Date</Text>
                <Text style={[styles.th, styles.colAction]}>Action</Text>
                <Text style={[styles.th, styles.colCategory]}>Category</Text>
                <Text style={[styles.th, styles.colDescription]}>Description</Text>
                <Text style={[styles.th, styles.colAmount]}>Amount</Text>
              </View>
              {snapshot.entries.map((entry) => (
                <View key={entry.id} style={styles.tableRow} wrap={false}>
                  <Text style={[styles.td, styles.colDate]}>{entry.displayDate}</Text>
                  <Text style={[styles.td, styles.colAction]}>{entry.action}</Text>
                  <Text style={[styles.td, styles.colCategory]}>{entry.category}</Text>
                  <Text style={[styles.td, styles.colDescription]}>
                    {entry.description}
                  </Text>
                  <Text
                    style={[
                      styles.td,
                      styles.colAmount,
                      entry.action === "Income"
                        ? { color: "#059669", fontFamily: "Helvetica-Bold" }
                        : { color: "#e11d48", fontFamily: "Helvetica-Bold" },
                    ]}
                  >
                    {formatMoney(entry.amount, snapshot.currency)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Loans Table */}
        {snapshot.loans.length > 0 && (
          <View style={{ marginTop: 10 }}>
            <Text style={styles.sectionTitle}>Money I Lent</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeaderRow]}>
                <Text style={[styles.th, styles.colBorrower]}>Borrower</Text>
                <Text style={[styles.th, styles.colLent]}>Amount Lent</Text>
                <Text style={[styles.th, styles.colReceived]}>Received</Text>
                <Text style={[styles.th, styles.colBalance]}>Balance</Text>
                <Text style={[styles.th, styles.colDue]}>Expected By</Text>
              </View>
              {snapshot.loans.map((loan) => (
                <View key={loan.id} style={styles.tableRow} wrap={false}>
                  <Text style={[styles.td, styles.colBorrower]}>{loan.borrower}</Text>
                  <Text style={[styles.td, styles.colLent]}>
                    {formatMoney(loan.amountLent, snapshot.currency)}
                  </Text>
                  <Text style={[styles.td, styles.colReceived]}>
                    {formatMoney(loan.received, snapshot.currency)}
                  </Text>
                  <Text
                    style={[
                      styles.td,
                      styles.colBalance,
                      { fontFamily: "Helvetica-Bold" },
                    ]}
                  >
                    {formatMoney(loan.balance, snapshot.currency)}
                  </Text>
                  <Text style={[styles.td, styles.colDue]}>{loan.expectedBackBy}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Running Footer on Every Page */}
        <View style={styles.footer} fixed>
          <Text>Made with Money Map</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
