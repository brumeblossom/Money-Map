import { describe, it, expect } from "vitest";
import { extractFirstName } from "@/lib/auth/user-name";
import { emailSignUpSchema } from "@/lib/schemas";

describe("Auth user names (Prompt 15b)", () => {
  describe("extractFirstName", () => {
    it("extracts from Google user_metadata.given_name", () => {
      const meta = {
        given_name: "Chukwudi",
        family_name: "Okoro",
        name: "Chukwudi Okoro",
      };
      expect(extractFirstName(meta)).toBe("Chukwudi");
    });

    it("falls back to first word of full_name if given_name is missing", () => {
      const meta = {
        full_name: "Amaka Bello",
      };
      expect(extractFirstName(meta)).toBe("Amaka");
    });

    it("falls back to first word of name if given_name and full_name are missing", () => {
      const meta = {
        name: "Ibrahim Musa",
      };
      expect(extractFirstName(meta)).toBe("Ibrahim");
    });

    it("uses pending fallback name from email signup if metadata has none", () => {
      const meta = {};
      expect(extractFirstName(meta, "  Burna  ")).toBe("Burna");
    });

    it("prioritizes metadata given_name over pending fallback", () => {
      const meta = {
        given_name: "Wizkid",
      };
      expect(extractFirstName(meta, "Fallback")).toBe("Wizkid");
    });

    it("returns null when no valid name is available", () => {
      expect(extractFirstName(null)).toBeNull();
      expect(extractFirstName({})).toBeNull();
      expect(extractFirstName({ given_name: "   " })).toBeNull();
    });

    it("trims and limits length to 60 characters", () => {
      const longName = "A".repeat(100);
      const extracted = extractFirstName({ given_name: longName });
      expect(extracted?.length).toBe(60);
    });
  });

  describe("emailSignUpSchema", () => {
    it("validates first name 1 to 60 characters, trimmed", () => {
      const valid = emailSignUpSchema.safeParse({
        firstName: "  Damilola  ",
        email: "dami@example.com",
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.firstName).toBe("Damilola");
      }
    });

    it("rejects empty first name", () => {
      const res = emailSignUpSchema.safeParse({
        firstName: "   ",
        email: "dami@example.com",
      });
      expect(res.success).toBe(false);
    });

    it("rejects first name over 60 characters", () => {
      const res = emailSignUpSchema.safeParse({
        firstName: "a".repeat(61),
        email: "dami@example.com",
      });
      expect(res.success).toBe(false);
    });
  });
});
