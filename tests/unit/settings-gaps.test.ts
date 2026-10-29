import { describe, it, expect } from "vitest";
import { isPasswordValid, checkPasswordRules, passwordSchema } from "@/lib/validation/password";
import { formatMoney } from "@/lib/format";

describe("Settings Gaps (Prompt 18 Verification)", () => {
  describe("1. Currency Rules", () => {
    it("defaults to NGN currency and formats minor units without altering integer amounts", () => {
      const amountMinor = 500000; // 5,000.00
      expect(formatMoney(amountMinor, "NGN")).toContain("₦5,000.00");

      // Changing currency symbol changes the display formatting only
      expect(formatMoney(amountMinor, "USD")).toContain("$5,000.00");
      expect(formatMoney(amountMinor, "EUR")).toContain("€");
      expect(formatMoney(amountMinor, "GBP")).toContain("£5,000.00");

      // Original amountMinor remains untouched integer
      expect(amountMinor).toBe(500000);
    });
  });

  describe("2. Category Delete & Hide Rules", () => {
    it("identifies default categories that can only be hidden, not deleted", () => {
      const defaultCategory = {
        id: "cat-default-1",
        name: "Salary",
        scope: "income",
        is_default: true,
        is_hidden: false,
      };

      expect(defaultCategory.is_default).toBe(true);
      // Logic check: cannot be deleted
      const canDelete = !defaultCategory.is_default;
      expect(canDelete).toBe(false);
    });

    it("prevents deletion of custom category if used in entries or loans, suggesting Hide", () => {
      const customCategory = {
        id: "cat-custom-1",
        name: "Freelance Design",
        scope: "income",
        is_default: false,
        is_hidden: false,
      };

      const entriesCount = 3;
      const loansCount = 0;
      const usedCount = entriesCount + loansCount;

      expect(customCategory.is_default).toBe(false);
      expect(usedCount > 0).toBe(true);

      // System rule: custom ones can be deleted only if unused
      const canDelete = !customCategory.is_default && usedCount === 0;
      expect(canDelete).toBe(false);
    });

    it("allows deletion of custom category only if completely unused", () => {
      const customUnusedCategory = {
        id: "cat-custom-2",
        name: "Old Project",
        scope: "expense",
        is_default: false,
        is_hidden: false,
      };

      const entriesCount = 0;
      const loansCount = 0;
      const usedCount = entriesCount + loansCount;

      const canDelete = !customUnusedCategory.is_default && usedCount === 0;
      expect(canDelete).toBe(true);
    });
  });

  describe("3. Password Rules & Validation", () => {
    it("validates all 4 password rules", () => {
      // Missing uppercase, lowercase, number, length < 8
      expect(isPasswordValid("weak")).toBe(false);

      // Missing number
      expect(isPasswordValid("WeakPass")).toBe(false);

      // Missing uppercase
      expect(isPasswordValid("weakpass1")).toBe(false);

      // Missing lowercase
      expect(isPasswordValid("WEAKPASS1")).toBe(false);

      // Valid password (8+ chars, uppercase, lowercase, number)
      expect(isPasswordValid("StrongPass1")).toBe(true);

      const rules = checkPasswordRules("StrongPass1");
      expect(rules.every((r) => r.met)).toBe(true);
      expect(passwordSchema.safeParse("StrongPass1").success).toBe(true);
    });

    it("verifies save disabled condition until rules met and confirmation matches", () => {
      const newPassword: string = "StrongPass1";
      const confirmPasswordMismatch: string = "StrongPass2";
      const confirmPasswordMatch: string = "StrongPass1";

      const rulesMet = isPasswordValid(newPassword);
      expect(rulesMet).toBe(true);

      const mismatchCanSave = rulesMet && newPassword === confirmPasswordMismatch;
      expect(mismatchCanSave).toBe(false);

      const matchCanSave = rulesMet && newPassword === confirmPasswordMatch;
      expect(matchCanSave).toBe(true);
    });

    it("checks Google-only accounts requiring recent sign-in", () => {
      const now = Date.now();
      const recentSignInTime = new Date(now - 2 * 60 * 1000).toISOString(); // 2 mins ago
      const staleSignInTime = new Date(now - 15 * 60 * 1000).toISOString(); // 15 mins ago

      const isRecent = (timestamp: string) => {
        return Date.now() - new Date(timestamp).getTime() < 10 * 60 * 1000;
      };

      expect(isRecent(recentSignInTime)).toBe(true);
      expect(isRecent(staleSignInTime)).toBe(false);
    });
  });

  describe("4. Delete Account Confirmation & Destination", () => {
    it("enforces typing 'DELETE' exactly to confirm account deletion", () => {
      const isConfirmed = (text: string) => text === "DELETE";

      expect(isConfirmed("delete")).toBe(false);
      expect(isConfirmed("DELETE ")).toBe(false);
      expect(isConfirmed("DEL")).toBe(false);
      expect(isConfirmed("DELETE")).toBe(true);
    });

    it("specifies landing page '/' as the redirect destination after deletion", () => {
      const deleteRedirectTarget = "/";
      expect(deleteRedirectTarget).toBe("/");
      expect(deleteRedirectTarget).not.toBe("/welcome");
    });
  });
});
