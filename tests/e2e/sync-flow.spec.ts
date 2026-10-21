import { expect, test } from "@playwright/test";

interface MockOutbox {
  table: string;
  row_id: string;
}

interface WindowWithDb extends Window {
  __db?: {
    entries: {
      count: () => Promise<number>;
    };
    outbox: {
      count: () => Promise<number>;
      toArray: () => Promise<MockOutbox[]>;
      clear: () => Promise<void>;
    };
  };
}

test.describe("Sync Engine Flow (Prompt 10)", () => {
  test("offline entry creation shows 'Offline (1 change waiting)', returns to Synced within 5s when online", async ({
    page,
    context,
  }) => {
    const mockUserId = "playwright-sync-user-1";

    // Set signed-in mock user cookie
    await context.addCookies([
      {
        name: "moneymap_mock_user",
        value: mockUserId,
        domain: "localhost",
        path: "/",
      },
    ]);

    // Track pushed changes to verify Supabase receives the row
    const pushedChanges: { table: string; row: { id: string; amount_minor: number } }[] = [];

    await page.route("**/api/sync/push", async (route) => {
      const data = route.request().postDataJSON() as {
        changes: { table: string; row: { id: string; amount_minor: number } }[];
      };
      if (data?.changes) {
        pushedChanges.push(...data.changes);
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          applied: data?.changes ? data.changes.map((c) => c.row.id) : [],
          skipped: [],
        }),
      });
    });

    await page.route("**/api/sync/pull*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          rows: {
            categories: [],
            entries: [],
            loans: [],
            loan_payments: [],
            recurring_rules: [],
            profiles: [],
          },
          server_time: new Date().toISOString(),
          has_more: false,
        }),
      });
    });

    // 1. Navigate to entry form
    await page.goto("/new/income");
    const amountInput = page.getByPlaceholder("0.00").first();
    await expect(amountInput).toBeVisible();

    // Ensure database is ready and outbox is clear after initial page load
    await page.waitForFunction(() => Boolean((window as unknown as WindowWithDb).__db?.outbox));
    await page.evaluate(async () => {
      const db = (window as unknown as WindowWithDb).__db;
      if (db) {
        await db.outbox.clear();
      }
    });

    await expect.poll(async () => {
      return await page.evaluate(async () => {
        const db = (window as unknown as WindowWithDb).__db;
        return db ? await db.outbox.count() : -1;
      });
    }).toBe(0);

    // Verify initial status shows Synced
    const syncBadge = page.getByTestId("header-sync-badge");
    await expect(syncBadge).toBeVisible();
    await expect(syncBadge).toContainText("Synced");

    // 2. Go offline
    await context.setOffline(true);

    // 3. Add an entry while offline
    await amountInput.fill("25000"); // ₦25,000.00
    const saveButton = page.getByRole("button", { name: "Save", exact: true });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // 4. Header sync icon shows "Offline (1 change waiting)"
    await expect(syncBadge).toContainText("Offline (1 change waiting)");

    // Verify Dexie outbox has exactly 1 pending item
    const outboxCountBefore = await page.evaluate(async () => {
      const db = (window as unknown as WindowWithDb).__db;
      return db ? await db.outbox.count() : 0;
    });
    expect(outboxCountBefore).toBe(1);

    // 5. Go online
    await context.setOffline(false);

    // 6. Icon returns to Synced within 5 s
    await expect(syncBadge).toContainText("Synced", { timeout: 5000 });

    // 7. Verify the row was sent in the push payload (simulating Supabase receipt)
    expect(pushedChanges.length).toBeGreaterThanOrEqual(1);
    const entryChange = pushedChanges.find((c) => c.table === "entries");
    expect(entryChange).toBeDefined();
    expect(entryChange?.row.amount_minor).toBe(2500000);

    // Verify outbox has drained to 0
    const outboxCountAfter = await page.evaluate(async () => {
      const db = (window as unknown as WindowWithDb).__db;
      return db ? await db.outbox.count() : 0;
    });
    expect(outboxCountAfter).toBe(0);
  });
});
