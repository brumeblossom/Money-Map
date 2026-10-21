import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as pushHandler } from "@/app/api/sync/push/route";
import { GET as pullHandler } from "@/app/api/sync/pull/route";
import { resetSyncRateLimits } from "@/lib/sync/rate-limit";

// Mock Supabase server client
const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
  })),
}));

describe("Sync API Route Handlers (app/api/sync/*)", () => {
  const authedUser = { id: "user-test-uuid-456", email: "test@example.com" };

  beforeEach(() => {
    vi.clearAllMocks();
    resetSyncRateLimits();
  });

  describe("POST /api/sync/push", () => {
    it("returns 401 without an active session", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error("No session") });

      const req = new NextRequest("http://localhost:3000/api/sync/push", {
        method: "POST",
        body: JSON.stringify({ changes: [] }),
      });

      const res = await pushHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json).toEqual({ error: "unauthorized" });
    });

    it("returns 422 on invalid JSON body", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: authedUser }, error: null });

      const req = new NextRequest("http://localhost:3000/api/sync/push", {
        method: "POST",
        body: "invalid-json{",
        headers: { "Content-Type": "application/json" },
      });

      const res = await pushHandler(req);
      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.error).toBe("invalid");
    });

    it("returns 422 on invalid change schema (e.g. invalid table name or missing fields)", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: authedUser }, error: null });

      const req = new NextRequest("http://localhost:3000/api/sync/push", {
        method: "POST",
        body: JSON.stringify({
          changes: [
            {
              table: "non_existent_table",
              row: { id: crypto.randomUUID() },
            },
          ],
        }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await pushHandler(req);
      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.error).toBe("invalid");
      expect(json.issues).toBeDefined();
    });

    it("returns 429 when rate limit is exceeded (above 60 req/min)", async () => {
      mockGetUser.mockResolvedValue({ data: { user: authedUser }, error: null });

      // First 60 requests succeed
      for (let i = 0; i < 60; i++) {
        const req = new NextRequest("http://localhost:3000/api/sync/push", {
          method: "POST",
          body: JSON.stringify({ changes: [] }),
          headers: { "Content-Type": "application/json" },
        });
        const res = await pushHandler(req);
        expect(res.status).toBe(200);
      }

      // 61st request rejected with 429
      const req61 = new NextRequest("http://localhost:3000/api/sync/push", {
        method: "POST",
        body: JSON.stringify({ changes: [] }),
        headers: { "Content-Type": "application/json" },
      });
      const res61 = await pushHandler(req61);
      expect(res61.status).toBe(429);
      const json = await res61.json();
      expect(json).toEqual({ error: "rate_limited" });
    });
  });

  describe("GET /api/sync/pull", () => {
    it("returns 401 without an active session", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error("No session") });

      const req = new NextRequest("http://localhost:3000/api/sync/pull");
      const res = await pullHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json).toEqual({ error: "unauthorized" });
    });

    it("returns 422 on invalid since timestamp parameter", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: authedUser }, error: null });

      const req = new NextRequest("http://localhost:3000/api/sync/pull?since=invalid-date");
      const res = await pullHandler(req);
      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.error).toBe("invalid");
      expect(json.issues).toBeDefined();
    });

    it("returns 200 with rows and server_time on valid pull", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: authedUser }, error: null });

      const req = new NextRequest("http://localhost:3000/api/sync/pull?since=2026-10-21T00:00:00.000Z");
      const res = await pullHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.rows).toBeDefined();
      expect(json.rows.categories).toBeDefined();
      expect(json.rows.entries).toBeDefined();
      expect(json.rows.loans).toBeDefined();
      expect(json.rows.loan_payments).toBeDefined();
      expect(json.rows.recurring_rules).toBeDefined();
      expect(json.rows.profiles).toBeDefined();
      expect(json.server_time).toBeDefined();
      expect(json.has_more).toBe(false);
    });
  });
});
