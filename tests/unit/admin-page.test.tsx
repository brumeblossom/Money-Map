import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminPage from "@/app/admin/page";
import { AdminDashboardView } from "@/components/admin-dashboard-view";
import type { AdminAnalytics } from "@/lib/admin/types";

// Mock next/navigation
const mockNotFound = vi.fn();
vi.mock("next/navigation", () => ({
  notFound: () => {
    mockNotFound();
    throw new Error("NEXT_NOT_FOUND");
  },
  usePathname: () => "/admin",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

// Mock verifyAdminUser and getAdminAnalytics
const mockVerifyAdminUser = vi.fn();
const mockGetAdminAnalytics = vi.fn();

vi.mock("@/lib/auth/admin", () => ({
  verifyAdminUser: () => mockVerifyAdminUser(),
}));

vi.mock("@/lib/admin/stats", () => ({
  getAdminAnalytics: () => mockGetAdminAnalytics(),
}));

const mockData: AdminAnalytics = {
  total_accounts: 42,
  new_signups_7d: 5,
  new_signups_30d: 18,
  active_users_7d: 8,
  active_users_30d: 22,
  total_entries: 310,
  entries_this_month: {
    income: 80,
    expenses: 190,
    giving: 30,
    lent: 10,
    total: 310,
  },
  avg_entries_per_active_user_30d: 14.1,
  signups_per_week: [
    { week_start: "2026-10-12", count: 3 },
    { week_start: "2026-10-19", count: 2 },
  ],
  active_users_per_week: [
    { week_start: "2026-10-12", count: 7 },
    { week_start: "2026-10-19", count: 8 },
  ],
  generated_at: "2026-10-29T14:30:00Z",
};

describe("/admin Page & Dashboard View", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AdminPage server component access gate", () => {
    it("calls notFound() when user is not admin", async () => {
      mockVerifyAdminUser.mockResolvedValueOnce({
        isAdmin: false,
        email: "random@user.com",
        userId: "123",
      });

      await expect(AdminPage()).rejects.toThrow("NEXT_NOT_FOUND");
      expect(mockNotFound).toHaveBeenCalledTimes(1);
      expect(mockGetAdminAnalytics).not.toHaveBeenCalled();
    });

    it("renders AdminDashboardView with stats when user is admin", async () => {
      mockVerifyAdminUser.mockResolvedValueOnce({
        isAdmin: true,
        email: "admin@example.com",
        userId: "admin-1",
      });
      mockGetAdminAnalytics.mockResolvedValueOnce(mockData);

      const pageEl = await AdminPage();
      render(pageEl);

      expect(screen.getByText("Admin Analytics")).toBeInTheDocument();
      expect(screen.getByTestId("admin-card-total-accounts")).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
    });
  });

  describe("AdminDashboardView display and interactions", () => {
    it("renders all required metric cards with correct values", () => {
      render(<AdminDashboardView initialData={mockData} />);

      // Total accounts
      expect(screen.getByTestId("admin-card-total-accounts")).toHaveTextContent("42");
      expect(screen.getByTestId("admin-card-total-accounts")).toHaveTextContent("Total accounts");

      // New sign-ups
      expect(screen.getByTestId("admin-card-new-signups")).toHaveTextContent("5");
      expect(screen.getByTestId("admin-card-new-signups")).toHaveTextContent("18");

      // Active users
      expect(screen.getByTestId("admin-card-active-users")).toHaveTextContent("8");
      expect(screen.getByTestId("admin-card-active-users")).toHaveTextContent("22");

      // Avg entries per active user
      expect(screen.getByTestId("admin-card-avg-entries")).toHaveTextContent("14.1");

      // Total entries and month split
      const splitCard = screen.getByTestId("admin-card-entries-split");
      expect(splitCard).toHaveTextContent("310");
      expect(splitCard).toHaveTextContent("80"); // Income
      expect(splitCard).toHaveTextContent("190"); // Expenses
      expect(splitCard).toHaveTextContent("30"); // Giving
      expect(splitCard).toHaveTextContent("10"); // Lent
    });

    it("renders weekly charts for sign-ups and active users", () => {
      render(<AdminDashboardView initialData={mockData} />);

      expect(screen.getByTestId("admin-chart-signups")).toHaveTextContent("New sign-ups per week");
      expect(screen.getByTestId("admin-chart-active-users")).toHaveTextContent("Active users per week");
    });

    it("renders footer with DD-MM-YYYY timestamp and handles refresh", async () => {
      const updatedMock = {
        ...mockData,
        total_accounts: 50,
        generated_at: "2026-10-29T14:35:00Z",
      };

      // Mock fetch for refresh button
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => updatedMock,
      });

      render(<AdminDashboardView initialData={mockData} />);

      // Check footer format
      const footerTimestamp = screen.getByTestId("admin-updated-timestamp");
      expect(footerTimestamp).toHaveTextContent("Updated 29-10-2026");

      // Click refresh button
      const refreshBtn = screen.getByTestId("admin-refresh-btn-footer");
      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/admin/stats?refresh=true");
        expect(screen.getByTestId("admin-card-total-accounts")).toHaveTextContent("50");
      });
    });
  });
});

