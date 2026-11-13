import { describe, expect, it } from "vitest";
import {
  isSupabaseSessionCookieName,
  hasSupabaseSessionCookie,
  hasSessionFromCookies,
  getClientSessionState,
} from "@/lib/session-cookies";

describe("lib/session-cookies - Single source of truth for session detection", () => {
  describe("isSupabaseSessionCookieName", () => {
    it("returns true for standard Supabase auth token cookies", () => {
      expect(isSupabaseSessionCookieName("sb-jiktrplyuneakhhoayde-auth-token")).toBe(true);
      expect(isSupabaseSessionCookieName("sb-myref123-auth-token")).toBe(true);
    });

    it("returns true for chunked Supabase auth token cookies", () => {
      expect(isSupabaseSessionCookieName("sb-jiktrplyuneakhhoayde-auth-token.0")).toBe(true);
      expect(isSupabaseSessionCookieName("sb-jiktrplyuneakhhoayde-auth-token.1")).toBe(true);
      expect(isSupabaseSessionCookieName("sb-myref123-auth-token.12")).toBe(true);
    });

    it("returns false for PKCE code-verifier and code-challenge cookies", () => {
      expect(
        isSupabaseSessionCookieName("sb-jiktrplyuneakhhoayde-auth-token-code-verifier")
      ).toBe(false);
      expect(
        isSupabaseSessionCookieName("sb-myref123-auth-token-code-challenge")
      ).toBe(false);
      expect(isSupabaseSessionCookieName("sb-auth-token-code-verifier")).toBe(false);
    });

    it("returns false for unrelated or empty cookies", () => {
      expect(isSupabaseSessionCookieName("")).toBe(false);
      expect(isSupabaseSessionCookieName("moneymap_guest")).toBe(false);
      expect(isSupabaseSessionCookieName("sb-random-cookie")).toBe(false);
    });
  });

  describe("hasSupabaseSessionCookie & hasSessionFromCookies", () => {
    it("code-verifier cookie alone is NOT a session", () => {
      const verifierOnly = [
        {
          name: "sb-jiktrplyuneakhhoayde-auth-token-code-verifier",
          value: "some-pkce-verifier-string-12345",
        },
      ];

      expect(hasSupabaseSessionCookie(verifierOnly)).toBe(false);
      expect(hasSessionFromCookies(verifierOnly)).toBe(false);
    });

    it("returns true when a legitimate session cookie exists", () => {
      const legitSession = [
        {
          name: "sb-jiktrplyuneakhhoayde-auth-token",
          value: '["access_token_xyz"]',
        },
      ];

      expect(hasSupabaseSessionCookie(legitSession)).toBe(true);
      expect(hasSessionFromCookies(legitSession)).toBe(true);
    });

    it("returns true for chunked session cookies", () => {
      const chunkedSession = [
        {
          name: "sb-jiktrplyuneakhhoayde-auth-token.0",
          value: "chunk0-value",
        },
      ];

      expect(hasSupabaseSessionCookie(chunkedSession)).toBe(true);
      expect(hasSessionFromCookies(chunkedSession)).toBe(true);
    });

    it("ignores empty or empty-json session values", () => {
      const emptySessions = [
        { name: "sb-ref-auth-token", value: "" },
        { name: "sb-ref-auth-token.0", value: '""' },
        { name: "sb-ref-auth-token.1", value: "[]" },
        { name: "sb-ref-auth-token.2", value: "{}" },
      ];

      expect(hasSupabaseSessionCookie(emptySessions)).toBe(false);
      expect(hasSessionFromCookies(emptySessions)).toBe(false);
    });

    it("recognizes guest cookies as session in hasSessionFromCookies", () => {
      expect(
        hasSessionFromCookies([{ name: "moneymap_guest", value: "true" }])
      ).toBe(true);
      expect(hasSessionFromCookies([{ name: "mm_guest", value: "1" }])).toBe(true);
      expect(
        hasSessionFromCookies([{ name: "moneymap_guest", value: "false" }])
      ).toBe(false);
    });
  });

  describe("getClientSessionState (document.cookie parser)", () => {
    it("returns hasSession: false when only code-verifier is present in document.cookie", () => {
      const cookieStr =
        "sb-jiktrplyuneakhhoayde-auth-token-code-verifier=s0meVerif1er; theme=dark";
      const state = getClientSessionState(cookieStr);

      expect(state.hasSession).toBe(false);
      expect(state.isUser).toBe(false);
      expect(state.isGuest).toBe(false);
    });

    it("returns hasSession: true and isGuest: true when guest cookie is set", () => {
      const cookieStr =
        "moneymap_guest=true; mm_guest=1; moneymap_has_session=1";
      const state = getClientSessionState(cookieStr);

      expect(state.hasSession).toBe(true);
      expect(state.isGuest).toBe(true);
      expect(state.isUser).toBe(false);
    });

    it("returns hasSession: true and isUser: true when real auth token cookie is set", () => {
      const cookieStr =
        "sb-jiktrplyuneakhhoayde-auth-token=valid-jwt-token; theme=light";
      const state = getClientSessionState(cookieStr);

      expect(state.hasSession).toBe(true);
      expect(state.isUser).toBe(true);
      expect(state.isGuest).toBe(false);
    });

    it("returns hasSession: true when chunked auth token cookie is set", () => {
      const cookieStr =
        "sb-jiktrplyuneakhhoayde-auth-token.0=chunk0; sb-jiktrplyuneakhhoayde-auth-token.1=chunk1";
      const state = getClientSessionState(cookieStr);

      expect(state.hasSession).toBe(true);
      expect(state.isUser).toBe(true);
      expect(state.isGuest).toBe(false);
    });
  });
});
