import { describe, it, expect } from "vitest";
import {
  sanitizeInternalUrl,
  getBackLinkText,
  createReturnUrl,
} from "@/lib/navigation";

describe("lib/navigation", () => {
  describe("sanitizeInternalUrl", () => {
    it("accepts valid internal relative URLs with queries and hashes", () => {
      expect(sanitizeInternalUrl("/")).toBe("/");
      expect(sanitizeInternalUrl("/records")).toBe("/records");
      expect(sanitizeInternalUrl("/records?tab=expenses")).toBe("/records?tab=expenses");
      expect(sanitizeInternalUrl("/records?tab=expenses&expenses_period=thisMonth#section")).toBe(
        "/records?tab=expenses&expenses_period=thisMonth#section"
      );
      expect(sanitizeInternalUrl("/records/123")).toBe("/records/123");
      expect(sanitizeInternalUrl("/lent/456")).toBe("/lent/456");
      expect(sanitizeInternalUrl("/?month=2026-05")).toBe("/?month=2026-05");
    });

    it("rejects non-internal and malicious URLs", () => {
      expect(sanitizeInternalUrl(null)).toBeNull();
      expect(sanitizeInternalUrl(undefined)).toBeNull();
      expect(sanitizeInternalUrl("")).toBeNull();
      expect(sanitizeInternalUrl("https://example.com")).toBeNull();
      expect(sanitizeInternalUrl("http://evil.com/path")).toBeNull();
      expect(sanitizeInternalUrl("//evil.com")).toBeNull();
      expect(sanitizeInternalUrl("/\\evil.com")).toBeNull();
      expect(sanitizeInternalUrl("javascript:alert(1)")).toBeNull();
      expect(sanitizeInternalUrl("data:text/html,test")).toBeNull();
      expect(sanitizeInternalUrl("relative/path")).toBeNull();
    });
  });

  describe("getBackLinkText", () => {
    it("maps URLs to correct back link labels", () => {
      expect(getBackLinkText("/")).toBe("Home");
      expect(getBackLinkText("/?month=2026-05")).toBe("Home");

      expect(getBackLinkText("/records")).toBe("Records");
      expect(getBackLinkText("/records?tab=income")).toBe("Records");
      expect(getBackLinkText("/records?tab=expenses")).toBe("Records");
      expect(getBackLinkText("/records?tab=giving")).toBe("Records");

      expect(getBackLinkText("/records?tab=lent")).toBe("Money I lent");
      expect(getBackLinkText("/lent")).toBe("Money I lent");
      expect(getBackLinkText("/lent/123")).toBe("Money I lent");

      expect(getBackLinkText("/records/123")).toBe("Entry");
      expect(getBackLinkText("/records/123/edit")).toBe("Entry");

      expect(getBackLinkText("/insights")).toBe("Insights");
      expect(getBackLinkText("/insights/habits")).toBe("Insights");
      expect(getBackLinkText("/insights/habits/cat-123")).toBe("Insights");

      expect(getBackLinkText("/settings")).toBe("Settings");
      expect(getBackLinkText("/settings/categories")).toBe("Settings");
      expect(getBackLinkText("/settings/repeating")).toBe("Settings");
    });
  });

  describe("createReturnUrl", () => {
    it("appends valid from parameter correctly", () => {
      expect(createReturnUrl("/records/1", "/records?tab=expenses")).toBe(
        "/records/1?from=%2Frecords%3Ftab%3Dexpenses"
      );
      expect(createReturnUrl("/new/income", "/?month=2026-05")).toBe(
        "/new/income?from=%2F%3Fmonth%3D2026-05"
      );
      expect(createReturnUrl("/export", "/insights?period=last3Months")).toBe(
        "/export?from=%2Finsights%3Fperiod%3Dlast3Months"
      );
    });

    it("does not append invalid from parameter", () => {
      expect(createReturnUrl("/records/1", "https://evil.com")).toBe("/records/1");
      expect(createReturnUrl("/records/1", "//evil.com")).toBe("/records/1");
    });
  });
});
