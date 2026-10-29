import { describe, it, expect, beforeEach, vi } from "vitest";
import { getAdminEmails, isEmailAdmin, verifyAdminUser } from "@/lib/auth/admin";
import { getAdminAnalytics, clearAnalyticsCache } from "@/lib/admin/stats";
import { GET as getStatsRoute } from "@/app/api/admin/stats/route";
import { GET as getCheckRoute } from "@/app/api/admin/check/route";

// Mock Supabase server client
const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

// Mock Supabase admin client
const mockAdminRpc = vi.fn();
const mockAdminListUsers = vi.fn();
const mockAdminFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    rpc: mockAdminRpc,
    auth: {
      admin: {
        listUsers: mockAdminListUsers,
      },
    },
    from: mockAdminFrom,
  })),
}));

describe("Admin Access & Authorization (Security First)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAnalyticsCache();
    process.env.ADMIN_EMAILS = "admin@example.com, boss@company.org ,SuperAdmin@Test.CoM";
  });

  describe("ADMIN_EMAILS parsing & validation", () => {
    it("parses comma-separated emails, trims whitespace and lowercases", () => {
      const emails = getAdminEmails();
      expect(emails).toEqual([
        "admin@example.com",
        "boss@company.org",
        "superadmin@test.com",
      ]);
    });

    it("handles empty or missing ADMIN_EMAILS gracefully", () => {
      delete process.env.ADMIN_EMAILS;
      expect(getAdminEmails()).toEqual([]);
      process.env.ADMIN_EMAILS = "   ,  ";
      expect(getAdminEmails()).toEqual([]);
    });

    it("verifies isEmailAdmin correctly case-insensitively", () => {
      expect(isEmailAdmin("admin@example.com")).toBe(true);
      expect(isEmailAdmin("ADMIN@EXAMPLE.COM")).toBe(true);
      expect(isEmailAdmin("  boss@company.org  ")).toBe(true);
      expect(isEmailAdmin("random@user.com")).toBe(false);
      expect(isEmailAdmin("")).toBe(false);
      expect(isEmailAdmin(null)).toBe(false);
      expect(isEmailAdmin(undefined)).toBe(false);
    });
  });

  describe("Server-side verifyAdminUser", () => {
    it("permits signed-in user whose Supabase email is in ADMIN_EMAILS", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: {
            id: "admin-uuid-1",
            email: "admin@example.com",
          },
        },
        error: null,
      });

      const res = await verifyAdminUser();
      expect(res.isAdmin).toBe(true);
      expect(res.email).toBe("admin@example.com");
      expect(res.userId).toBe("admin-uuid-1");
    });

    it("denies another signed-in user not in ADMIN_EMAILS", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: {
            id: "other-user-uuid",
            email: "other@user.com",
          },
        },
        error: null,
      });

      const res = await verifyAdminUser();
      expect(res.isAdmin).toBe(false);
      expect(res.email).toBe("other@user.com");
    });

    it("denies guest / signed-out visitor with no auth session", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error("No session"),
      });

      const res = await verifyAdminUser();
      expect(res.isAdmin).toBe(false);
      expect(res.email).toBeNull();
      expect(res.userId).toBeNull();
    });
  });

  describe("API Protection: /api/admin/* endpoints", () => {
    it("returns 404 for /api/admin/stats when signed out (visitor)", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const response = await getStatsRoute(new Request("http://localhost:3000/api/admin/stats"));
      expect(response.status).toBe(404);
      const text = await response.text();
      expect(text).toBe("Not found");
    });

    it("returns 404 for /api/admin/stats for non-admin signed-in user", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: { id: "user-2", email: "regular@person.com" },
        },
        error: null,
      });

      const response = await getStatsRoute(new Request("http://localhost:3000/api/admin/stats"));
      expect(response.status).toBe(404);
    });

    it("returns 404 for /api/admin/check for non-admin user", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: { id: "guest", email: "guest@user.com" },
        },
        error: null,
      });

      const response = await getCheckRoute();
      expect(response.status).toBe(404);
    });

    it("returns 200 for /api/admin/check for verified admin user", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: { id: "admin-1", email: "admin@example.com" },
        },
        error: null,
      });

      const response = await getCheckRoute();
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ isAdmin: true });
    });

    it("returns 200 with aggregate metrics for admin on /api/admin/stats", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: { id: "admin-1", email: "admin@example.com" },
        },
        error: null,
      });

      mockAdminRpc.mockResolvedValueOnce({
        data: {
          total_accounts: 15,
          new_signups_7d: 3,
          new_signups_30d: 9,
          active_users_7d: 5,
          active_users_30d: 11,
          total_entries: 52,
          entries_this_month: {
            income: 12,
            expenses: 30,
            giving: 8,
            lent: 2,
            total: 52,
          },
          avg_entries_per_active_user_30d: 4.7,
          signups_per_week: [{ week_start: "2026-10-19", count: 2 }],
          active_users_per_week: [{ week_start: "2026-10-19", count: 4 }],
          generated_at: "2026-10-29T14:00:00Z",
        },
        error: null,
      });

      const response = await getStatsRoute(new Request("http://localhost:3000/api/admin/stats"));
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.total_accounts).toBe(15);
      expect(data.entries_this_month.total).toBe(52);
      expect(response.headers.get("Cache-Control")).toContain("max-age=300");
    });
  });

  describe("Admin Analytics aggregation & caching", () => {
    it("returns aggregate data without individual user records, emails, or names", async () => {
      mockAdminRpc.mockResolvedValueOnce({
        data: {
          total_accounts: 10,
          new_signups_7d: 2,
          new_signups_30d: 5,
          active_users_7d: 4,
          active_users_30d: 8,
          total_entries: 40,
          entries_this_month: {
            income: 10,
            expenses: 20,
            giving: 5,
            lent: 5,
            total: 40,
          },
          avg_entries_per_active_user_30d: 5,
          signups_per_week: [],
          active_users_per_week: [],
          generated_at: new Date().toISOString(),
        },
        error: null,
      });

      const data = await getAdminAnalytics();
      expect(data).toHaveProperty("total_accounts");
      expect(data).toHaveProperty("new_signups_7d");
      expect(data).toHaveProperty("new_signups_30d");
      expect(data).toHaveProperty("active_users_7d");
      expect(data).toHaveProperty("active_users_30d");
      expect(data).toHaveProperty("total_entries");
      expect(data).toHaveProperty("entries_this_month");
      expect(data).toHaveProperty("avg_entries_per_active_user_30d");
      expect(data).toHaveProperty("signups_per_week");
      expect(data).toHaveProperty("active_users_per_week");
      expect(data).toHaveProperty("generated_at");

      // Verify NO raw user fields exist
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((data as any).users).toBeUndefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((data as any).email).toBeUndefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((data as any).names).toBeUndefined();
    });

    it("caches data for 5 minutes and respects forceRefresh", async () => {
      mockAdminRpc
        .mockResolvedValueOnce({
          data: { total_accounts: 10, generated_at: "time-1" },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { total_accounts: 25, generated_at: "time-2" },
          error: null,
        });

      const firstCall = await getAdminAnalytics();
      expect(firstCall.total_accounts).toBe(10);
      expect(mockAdminRpc).toHaveBeenCalledTimes(1);

      // Second call without forceRefresh returns cached data immediately
      const secondCall = await getAdminAnalytics(false);
      expect(secondCall.total_accounts).toBe(10);
      expect(mockAdminRpc).toHaveBeenCalledTimes(1);

      // Call with forceRefresh fetches fresh data
      const refreshCall = await getAdminAnalytics(true);
      expect(refreshCall.total_accounts).toBe(25);
      expect(mockAdminRpc).toHaveBeenCalledTimes(2);
    });
  });
});
