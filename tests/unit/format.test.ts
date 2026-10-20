import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatMoney,
  fromMinor,
  isValidDisplayDate,
  parseDisplayDate,
  toMinor,
} from "@/lib/format";

describe("lib/format", () => {
  describe("formatDate", () => {
    it("formats ISO date YYYY-MM-DD to DD-MM-YYYY", () => {
      expect(formatDate("2026-10-20")).toBe("20-10-2026");
      expect(formatDate("2028-02-29")).toBe("29-02-2028");
      expect(formatDate("2026-01-05")).toBe("05-01-2026");
    });

    it("formats ISO timestamp to DD-MM-YYYY", () => {
      expect(formatDate("2026-10-20T14:30:00.000Z")).toBe("20-10-2026");
    });

    it("preserves already formatted DD-MM-YYYY strings", () => {
      expect(formatDate("20-10-2026")).toBe("20-10-2026");
    });

    it("throws on invalid ISO date format", () => {
      expect(() => formatDate("invalid")).toThrow();
      expect(() => formatDate("2026/10/20")).toThrow();
    });
  });

  describe("parseDisplayDate", () => {
    it("parses valid DD-MM-YYYY to YYYY-MM-DD", () => {
      expect(parseDisplayDate("20-10-2026")).toBe("2026-10-20");
      expect(parseDisplayDate("01-01-2025")).toBe("2025-01-01");
    });

    it("accepts leap day 29-02-2028", () => {
      expect(parseDisplayDate("29-02-2028")).toBe("2028-02-29");
      expect(isValidDisplayDate("29-02-2028")).toBe(true);
    });

    it("rejects invalid date 31-02-2026 (February 31st never exists)", () => {
      expect(() => parseDisplayDate("31-02-2026")).toThrow();
      expect(isValidDisplayDate("31-02-2026")).toBe(false);
    });

    it("rejects invalid date 29-02-2026 (non-leap year)", () => {
      expect(() => parseDisplayDate("29-02-2026")).toThrow();
      expect(isValidDisplayDate("29-02-2026")).toBe(false);
    });

    it("rejects 31-04-2026 (April has 30 days)", () => {
      expect(() => parseDisplayDate("31-04-2026")).toThrow();
      expect(isValidDisplayDate("31-04-2026")).toBe(false);
    });

    it("rejects month out of range", () => {
      expect(() => parseDisplayDate("15-13-2026")).toThrow();
      expect(() => parseDisplayDate("15-00-2026")).toThrow();
    });

    it("rejects day out of range", () => {
      expect(() => parseDisplayDate("00-05-2026")).toThrow();
      expect(() => parseDisplayDate("32-05-2026")).toThrow();
    });

    it("rejects malformed strings", () => {
      expect(() => parseDisplayDate("abc")).toThrow();
      expect(() => parseDisplayDate("2026-10-20")).toThrow();
    });
  });

  describe("formatMoney", () => {
    it("formats 15000000 kobo NGN as ₦150,000.00", () => {
      expect(formatMoney(15000000, "NGN")).toBe("₦150,000.00");
    });

    it("formats edge case 0 kobo as ₦0.00", () => {
      expect(formatMoney(0, "NGN")).toBe("₦0.00");
      expect(formatMoney(BigInt(0), "NGN")).toBe("₦0.00");
    });

    it("formats edge case 1 kobo as ₦0.01", () => {
      expect(formatMoney(1, "NGN")).toBe("₦0.01");
      expect(formatMoney(BigInt(1), "NGN")).toBe("₦0.01");
    });

    it("formats large edge case 999,999,999,999.99 (99999999999999 minor units)", () => {
      expect(formatMoney(BigInt("99999999999999"), "NGN")).toBe("₦999,999,999,999.99");
      expect(formatMoney(99999999999999, "NGN")).toBe("₦999,999,999,999.99");
    });

    it("supports other currencies (USD, GBP, EUR)", () => {
      expect(formatMoney(150050, "USD")).toBe("$1,500.50");
      expect(formatMoney(150050, "GBP")).toBe("£1,500.50");
    });
  });

  describe("toMinor & fromMinor (zero float math)", () => {
    it("converts '1,500.50' to 150050", () => {
      expect(toMinor("1,500.50")).toBe(150050);
    });

    it("converts 150050 to '1500.50'", () => {
      expect(fromMinor(150050)).toBe("1500.50");
      expect(fromMinor(BigInt(150050))).toBe("1500.50");
    });

    it("handles 0 edge case", () => {
      expect(toMinor("0")).toBe(0);
      expect(toMinor("0.00")).toBe(0);
      expect(fromMinor(0)).toBe("0.00");
    });

    it("handles 1 kobo / cent edge case", () => {
      expect(toMinor("0.01")).toBe(1);
      expect(fromMinor(1)).toBe("0.01");
    });

    it("handles single-digit decimal input e.g. '1500.5'", () => {
      expect(toMinor("1500.5")).toBe(150050);
    });

    it("handles integer string input without decimals", () => {
      expect(toMinor("1500")).toBe(150000);
    });

    it("handles large edge case 999,999,999,999.99", () => {
      expect(toMinor("999,999,999,999.99")).toBe(99999999999999);
      expect(fromMinor(BigInt("99999999999999"))).toBe("999999999999.99");
    });

    it("handles negative amounts cleanly", () => {
      expect(toMinor("-50.25")).toBe(-5025);
      expect(fromMinor(-5025)).toBe("-50.25");
    });
  });
});
