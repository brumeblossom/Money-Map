import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { isEmailAdmin } from "@/lib/auth/admin";
import { GET as getAdminStats } from "@/app/api/admin/stats/route";

describe("Admin Access & Client Bundle Security (Prompt 17c Verification)", () => {
  it("verifies service role key and secret tokens never appear in .next/static", () => {
    const staticDir = path.join(process.cwd(), ".next", "static");
    if (!fs.existsSync(staticDir)) {
      // If static directory has not been generated in test run, skip
      return;
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const findLeaks = (dir: string): string[] => {
      let leaks: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          leaks = leaks.concat(findLeaks(fullPath));
        } else if (entry.isFile() && (entry.name.endsWith(".js") || entry.name.endsWith(".json"))) {
          const content = fs.readFileSync(fullPath, "utf-8");
          if (content.includes("SUPABASE_SERVICE_ROLE_KEY")) {
            leaks.push(fullPath);
          }
          if (serviceKey && content.includes(serviceKey)) {
            leaks.push(fullPath);
          }
        }
      }
      return leaks;
    };

    const leaks = findLeaks(staticDir);
    expect(leaks).toEqual([]);
  });

  it("verifies admin email logic allows admin and denies others", () => {
    process.env.ADMIN_EMAILS = "blossombrume@gmail.com,admin@moneymap.app";

    // Admin email
    expect(isEmailAdmin("blossombrume@gmail.com")).toBe(true);
    expect(isEmailAdmin("ADMIN@MONEYMAP.APP")).toBe(true);

    // Another signed-in user
    expect(isEmailAdmin("hacker@other.com")).toBe(false);
    expect(isEmailAdmin("customer@gmail.com")).toBe(false);

    // Guest / signed-out
    expect(isEmailAdmin("")).toBe(false);
    expect(isEmailAdmin(null)).toBe(false);
    expect(isEmailAdmin(undefined)).toBe(false);
  });

  it("verifies /api/admin/stats returns 404 for unauthenticated callers", async () => {
    const res = await getAdminStats(new Request("http://localhost:3000/api/admin/stats"));
    expect(res.status).toBe(404);
  });
});
