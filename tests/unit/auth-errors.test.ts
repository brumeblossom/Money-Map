import { describe, it, expect } from "vitest";
import {
  AUTH_ERROR_MESSAGES,
  getAuthErrorPageMessage,
  mapAuthErrorMessage,
} from "@/lib/auth/errors";

describe("Auth Error Mapping", () => {
  describe("getAuthErrorPageMessage (error page reasons)", () => {
    it("maps expired or already-used link reason", () => {
      expect(getAuthErrorPageMessage("expired")).toBe(
        AUTH_ERROR_MESSAGES.EXPIRED_LINK
      );
      expect(getAuthErrorPageMessage("already_used")).toBe(
        AUTH_ERROR_MESSAGES.EXPIRED_LINK
      );
      expect(getAuthErrorPageMessage("Token has expired or is invalid")).toBe(
        AUTH_ERROR_MESSAGES.EXPIRED_LINK
      );
      expect(getAuthErrorPageMessage("otp_expired")).toBe(
        AUTH_ERROR_MESSAGES.EXPIRED_LINK
      );
    });

    it("maps other_browser reason", () => {
      expect(getAuthErrorPageMessage("other_browser")).toBe(
        AUTH_ERROR_MESSAGES.OTHER_BROWSER
      );
      expect(getAuthErrorPageMessage("pkce_verifier_missing")).toBe(
        AUTH_ERROR_MESSAGES.OTHER_BROWSER
      );
    });

    it("falls back to friendly default message for unknown reasons", () => {
      expect(getAuthErrorPageMessage(null)).toBe(
        AUTH_ERROR_MESSAGES.DEFAULT_ERROR
      );
      expect(getAuthErrorPageMessage(undefined)).toBe(
        AUTH_ERROR_MESSAGES.DEFAULT_ERROR
      );
      expect(getAuthErrorPageMessage("something_else_went_wrong")).toBe(
        AUTH_ERROR_MESSAGES.DEFAULT_ERROR
      );
    });
  });

  describe("mapAuthErrorMessage (/welcome and /auth/check-email)", () => {
    it("maps Supabase 429 rate limit errors to friendly notice", () => {
      expect(
        mapAuthErrorMessage({
          status: 429,
          message: "email rate limit exceeded",
        })
      ).toBe(AUTH_ERROR_MESSAGES.RATE_LIMIT);

      expect(
        mapAuthErrorMessage("For security purposes, you can only request this once every 60 seconds")
      ).toBe(AUTH_ERROR_MESSAGES.RATE_LIMIT);

      expect(
        mapAuthErrorMessage({
          message: "over_email_send_rate_limit",
        })
      ).toBe(AUTH_ERROR_MESSAGES.RATE_LIMIT);
    });

    it("maps Google provider disabled error to friendly notice", () => {
      expect(
        mapAuthErrorMessage({
          message: "Unsupported provider: provider is not enabled",
        })
      ).toBe(AUTH_ERROR_MESSAGES.GOOGLE_DISABLED);

      expect(
        mapAuthErrorMessage("provider_disabled")
      ).toBe(AUTH_ERROR_MESSAGES.GOOGLE_DISABLED);
    });

    it("maps invalid email errors to 'Enter a valid email'", () => {
      expect(mapAuthErrorMessage("Enter a valid email")).toBe(
        AUTH_ERROR_MESSAGES.INVALID_EMAIL
      );
      expect(
        mapAuthErrorMessage({
          message: "Unable to validate email address: invalid format",
        })
      ).toBe(AUTH_ERROR_MESSAGES.INVALID_EMAIL);
    });

    it("maps unexpected technical errors or objects to friendly default", () => {
      expect(mapAuthErrorMessage(null)).toBe(AUTH_ERROR_MESSAGES.DEFAULT_ERROR);
      expect(mapAuthErrorMessage(new Error("Database connection timed out"))).toBe(
        AUTH_ERROR_MESSAGES.DEFAULT_ERROR
      );
      expect(
        mapAuthErrorMessage({
          code: "unexpected_internal_500",
          message: "Fatal server crash 0x992",
        })
      ).toBe(AUTH_ERROR_MESSAGES.DEFAULT_ERROR);
    });
  });
});
