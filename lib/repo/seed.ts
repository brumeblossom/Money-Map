import { db, type CategoryScope, type CategoryRow } from "@/lib/db/dexie";
import { getCurrentUserId } from "./user";

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// PRD Section 4 Default Categories
export const DEFAULT_CATEGORIES: Record<CategoryScope, string[]> = {
  income: [
    "Salary",
    "Business sales",
    "Side gig / freelance",
    "Brand partnerships",
    "Digital products",
    "Gift received",
    "Investment returns",
    "Refund",
    "Allowance",
    "Other",
  ],
  expense: [
    "Personal",
    "Family",
    "Subscriptions",
    "Light (electricity)",
    "Fuel",
    "Diesel",
    "Internet",
    "Food",
    "Groceries",
    "Transportation",
    "Car repair",
    "Household fixing",
    "Rent savings",
    "Enjoyment",
    "Other",
  ],
  giving: [
    "Tithe",
    "Offering & seed",
    "Charity / NGO",
    "Family support",
    "Friends & community",
    "Pledge",
    "Other",
  ],
  lent: [
    "Family",
    "Friend",
    "Colleague",
    "Customer (credit sale)",
    "Other",
  ],
};

/**
 * Seeds default categories into Dexie on first launch (PRD section 4, 6.3).
 * Strictly idempotent: runs once per user without creating duplicates.
 */
export async function seedDefaultCategories(database = db): Promise<CategoryRow[]> {
  const currentUserId = getCurrentUserId() ?? "";
  const now = new Date().toISOString();
  const inserted: CategoryRow[] = [];

  await database.transaction("rw", [database.categories], async () => {
    // Fetch all active categories from Dexie once
    const existingCategories = await database.categories.toArray();

    for (const [scopeKey, names] of Object.entries(DEFAULT_CATEGORIES)) {
      const scope = scopeKey as CategoryScope;

      for (let i = 0; i < names.length; i++) {
        const name = names[i];
        const slug = toSlug(name);
        const lowerName = name.trim().toLowerCase();

        // Check if already exists for this scope & name/slug
        const existing = existingCategories.find(
          (cat) =>
            cat.scope === scope &&
            cat.deleted_at === null &&
            (cat.slug === slug || cat.name.trim().toLowerCase() === lowerName),
        );

        if (existing) {
          // If existing category had no user_id (guest) and user is now signed in, attach to user
          if (currentUserId && !existing.user_id) {
            existing.user_id = currentUserId;
            existing.updated_at = now;
            await database.categories.update(existing.id, {
              user_id: currentUserId,
              updated_at: now,
            });
          }
          continue;
        }

        const row: CategoryRow = {
          id: crypto.randomUUID(),
          user_id: currentUserId,
          scope,
          name,
          slug,
          is_default: true,
          is_hidden: false,
          sort_order: i,
          created_at: now,
          updated_at: now,
          deleted_at: null,
          server_updated_at: now,
        };

        await database.categories.add(row);
        existingCategories.push(row);
        inserted.push(row);
      }
    }
  });

  return inserted;
}

/**
 * Cleans up duplicate categories on the device and queues deletions for cloud sync:
 * Keeps one category per (scope, slug || lowercase name), points every entry, loan,
 * and recurring rule at the kept one, and soft-deletes the extras so the change syncs.
 * Strictly guarantees no entries are lost.
 */
export async function cleanupDuplicateCategories(
  database = db,
): Promise<{ cleaned: number; repointed: number }> {
  const currentUserId = getCurrentUserId() ?? "";
  const now = new Date().toISOString();
  let cleanedCount = 0;
  let repointedCount = 0;

  await database.transaction(
    "rw",
    [
      database.categories,
      database.entries,
      database.loans,
      database.recurring_rules,
      database.outbox,
    ],
    async () => {
      const allCategories = await database.categories.toArray();

      // Group active categories by scope and (slug || lowercase name)
      const groups = new Map<string, CategoryRow[]>();

      for (const cat of allCategories) {
        if (cat.deleted_at !== null) continue;
        const normalizedKey = `${cat.scope}:${(cat.slug || toSlug(cat.name)).toLowerCase()}`;
        const group = groups.get(normalizedKey) || [];
        group.push(cat);
        groups.set(normalizedKey, group);
      }

      for (const [, group] of groups.entries()) {
        if (group.length <= 1) continue;

        // Sort to determine keeper:
        // 1. Prefer matching currentUserId
        // 2. Prefer is_default: true
        // 3. Prefer older created_at (original record) or later updated_at
        group.sort((a, b) => {
          if (currentUserId) {
            if (a.user_id === currentUserId && b.user_id !== currentUserId) return -1;
            if (b.user_id === currentUserId && a.user_id !== currentUserId) return 1;
          }
          if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
          return a.created_at.localeCompare(b.created_at);
        });

        const kept = group[0];
        const duplicates = group.slice(1);

        for (const dup of duplicates) {
          const oldId = dup.id;
          const newId = kept.id;

          // 1. Re-point entries
          const entries = await database.entries.where("category_id").equals(oldId).toArray();
          for (const entry of entries) {
            await database.entries.update(entry.id, {
              category_id: newId,
              updated_at: now,
            });
            await database.outbox.add({
              table: "entries",
              row_id: entry.id,
              created_at: now,
            });
            repointedCount++;
          }

          // 2. Re-point loans
          const loans = await database.loans.filter((l) => l.category_id === oldId).toArray();
          for (const loan of loans) {
            await database.loans.update(loan.id, {
              category_id: newId,
              updated_at: now,
            });
            await database.outbox.add({
              table: "loans",
              row_id: loan.id,
              created_at: now,
            });
            repointedCount++;
          }

          // 3. Re-point recurring rules
          const rules = await database.recurring_rules
            .filter((r) => r.category_id === oldId)
            .toArray();
          for (const rule of rules) {
            await database.recurring_rules.update(rule.id, {
              category_id: newId,
              updated_at: now,
            });
            await database.outbox.add({
              table: "recurring_rules",
              row_id: rule.id,
              created_at: now,
            });
            repointedCount++;
          }

          // 4. Soft-delete the duplicate category
          await database.categories.update(oldId, {
            deleted_at: now,
            updated_at: now,
          });

          // Queue in outbox so the soft-delete syncs to cloud
          await database.outbox.add({
            table: "categories",
            row_id: oldId,
            created_at: now,
          });

          cleanedCount++;
        }
      }
    },
  );

  return { cleaned: cleanedCount, repointed: repointedCount };
}
