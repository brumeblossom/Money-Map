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
 * Idempotent: safe to run multiple times without creating duplicates.
 */
export async function seedDefaultCategories(database = db): Promise<CategoryRow[]> {
  const currentUserId = getCurrentUserId() ?? "";
  const now = new Date().toISOString();
  const inserted: CategoryRow[] = [];

  await database.transaction("rw", [database.categories, database.outbox], async () => {
    for (const [scopeKey, names] of Object.entries(DEFAULT_CATEGORIES)) {
      const scope = scopeKey as CategoryScope;

      for (let i = 0; i < names.length; i++) {
        const name = names[i];
        const slug = toSlug(name);

        // Check if already exists for this scope & name/slug
        const existing = await database.categories
          .where("scope")
          .equals(scope)
          .and(
            (cat) =>
              (cat.user_id === currentUserId || !cat.user_id) &&
              (cat.name === name || cat.slug === slug),
          )
          .first();

        if (!existing) {
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
          await database.outbox.add({
            table: "categories",
            row_id: row.id,
            created_at: now,
          });

          inserted.push(row);
        }
      }
    }
  });

  return inserted;
}
