import {
  db,
  type MoneyMapDatabase,
  type CategoryRow,
} from "@/lib/db/dexie";

/**
 * Guest category merge (PRD Section 8, Prompt 10):
 * On first sync after claim, default categories with the same slug as a server copy
 * are merged into the server's ID and entries, loans, and recurring rules are re-pointed.
 */
export async function mergeGuestCategories(
  serverCategories: CategoryRow[],
  database: MoneyMapDatabase = db,
): Promise<number> {
  if (!serverCategories || serverCategories.length === 0) return 0;

  let mergedCount = 0;
  const localCategories = await database.categories.toArray();

  for (const serverCat of serverCategories) {
    if (!serverCat.slug) continue;

    // Find any local category with matching slug but different ID
    const localDuplicate = localCategories.find(
      (c) => c.slug === serverCat.slug && c.id !== serverCat.id,
    );

    if (!localDuplicate) continue;

    const oldId = localDuplicate.id;
    const newId = serverCat.id;

    await database.transaction(
      "rw",
      [
        database.entries,
        database.loans,
        database.recurring_rules,
        database.categories,
        database.outbox,
      ],
      async () => {
        // 1. Re-point entries
        const entriesToRepoint = await database.entries
          .where("category_id")
          .equals(oldId)
          .toArray();

        for (const entry of entriesToRepoint) {
          await database.entries.update(entry.id, {
            category_id: newId,
          });
        }

        // 2. Re-point loans
        const loansToRepoint = await database.loans
          .filter((l) => l.category_id === oldId)
          .toArray();

        for (const loan of loansToRepoint) {
          await database.loans.update(loan.id, {
            category_id: newId,
          });
        }

        // 3. Re-point recurring rules
        const rulesToRepoint = await database.recurring_rules
          .filter((r) => r.category_id === oldId)
          .toArray();

        for (const rule of rulesToRepoint) {
          await database.recurring_rules.update(rule.id, {
            category_id: newId,
          });
        }

        // 4. Remove local duplicate category from outbox if queued
        const duplicateOutbox = await database.outbox
          .where("row_id")
          .equals(oldId)
          .toArray();

        for (const item of duplicateOutbox) {
          if (item.table === "categories" && item.seq !== undefined) {
            await database.outbox.delete(item.seq);
          }
        }

        // 5. Delete duplicate local category
        await database.categories.delete(oldId);

        // 6. Put server category
        await database.categories.put(serverCat);
        mergedCount++;
      },
    );
  }

  return mergedCount;
}
