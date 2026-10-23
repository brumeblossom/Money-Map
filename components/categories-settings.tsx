"use client";

import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Plus,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Check,
  X,
} from "lucide-react";
import { db, type CategoryRow, type CategoryScope } from "@/lib/db/dexie";
import {
  createCategory,
  updateCategory,
  softDeleteCategory,
  listCategories,
} from "@/lib/repo";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";

const ACTION_TABS: { scope: CategoryScope; label: string }[] = [
  { scope: "income", label: "Income" },
  { scope: "expense", label: "Expenses" },
  { scope: "giving", label: "Giving" },
  { scope: "lent", label: "Lending" },
];

export interface CategoriesSettingsProps {
  initialScope?: CategoryScope;
  limit?: number;
}

export function CategoriesSettings({ initialScope = "income", limit }: CategoriesSettingsProps = {}) {
  const [activeScope, setActiveScope] = React.useState<CategoryScope>(initialScope);
  const [newCategoryName, setNewCategoryName] = React.useState("");
  const [isAdding, setIsAdding] = React.useState(false);

  // Rename state
  const [editingCategoryId, setEditingCategoryId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState("");

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);

  // Query all non-deleted categories for activeScope (including hidden ones)
  const categoriesQuery = useLiveQuery(
    () => listCategories(activeScope, true, false, db),
    [activeScope],
  );
  const categories = React.useMemo(() => categoriesQuery ?? [], [categoriesQuery]);

  const displayedCategories = React.useMemo(() => {
    return limit ? categories.slice(0, limit) : categories;
  }, [categories, limit]);

  // Add category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (trimmed.length > 40) {
      toast.error("Category name must be 40 characters or less");
      return;
    }

    const duplicate = categories.some(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) {
      toast.error(`A category named "${trimmed}" already exists`);
      return;
    }

    setIsAdding(true);
    try {
      await createCategory({
        scope: activeScope,
        name: trimmed,
        is_default: false,
        is_hidden: false,
        sort_order: categories.length,
      });
      setNewCategoryName("");
      toast.success(`Category "${trimmed}" added`);
    } catch (err) {
      console.error("Failed to add category", err);
      toast.error("Failed to add category");
    } finally {
      setIsAdding(false);
    }
  };

  // Start rename
  const handleStartRename = (cat: CategoryRow) => {
    setEditingCategoryId(cat.id);
    setEditingName(cat.name);
  };

  // Save rename
  const handleSaveRename = async (cat: CategoryRow) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      toast.error("Category name cannot be empty");
      return;
    }
    if (trimmed.length > 40) {
      toast.error("Category name must be 40 characters or less");
      return;
    }

    const duplicate = categories.some(
      (c) => c.id !== cat.id && c.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) {
      toast.error(`A category named "${trimmed}" already exists`);
      return;
    }

    try {
      await updateCategory(cat.id, { name: trimmed });
      toast.success("Category renamed");
      setEditingCategoryId(null);
    } catch (err) {
      console.error("Failed to rename category", err);
      toast.error("Failed to rename category");
    }
  };

  // Hide / Unhide
  const handleToggleHide = async (cat: CategoryRow) => {
    try {
      await updateCategory(cat.id, { is_hidden: !cat.is_hidden });
      toast.success(
        cat.is_hidden
          ? `"${cat.name}" is now visible in pickers`
          : `"${cat.name}" is now hidden from pickers`,
      );
    } catch (err) {
      console.error("Failed to toggle category visibility", err);
      toast.error("Failed to update category");
    }
  };

  // Delete confirm modal state
  const [categoryToDelete, setCategoryToDelete] = React.useState<CategoryRow | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = React.useState(false);

  // Trigger category delete check
  const handleDeleteCategory = async (cat: CategoryRow) => {
    if (cat.is_default) {
      toast.error("Default categories can be hidden, not deleted");
      return;
    }

    // Check if category is used by any existing entries
    const usedCount = await db.entries
      .where("category_id")
      .equals(cat.id)
      .filter((e) => e.deleted_at === null)
      .count();

    if (usedCount > 0) {
      toast.error(
        `Category is used in ${usedCount} ${
          usedCount === 1 ? "entry" : "entries"
        }. Hide it instead.`,
      );
      return;
    }

    setCategoryToDelete(cat);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      setIsDeletingCategory(true);
      await softDeleteCategory(categoryToDelete.id);
      toast.success(`Category "${categoryToDelete.name}" deleted`);
      setCategoryToDelete(null);
    } catch (err) {
      console.error("Failed to delete category", err);
      toast.error("Failed to delete category");
    } finally {
      setIsDeletingCategory(false);
    }
  };

  // Reorder: Up
  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;
    const current = categories[index];
    const prev = categories[index - 1];
    if (!current || !prev) return;

    try {
      await Promise.all([
        updateCategory(current.id, { sort_order: prev.sort_order }),
        updateCategory(prev.id, { sort_order: current.sort_order }),
      ]);
    } catch (err) {
      console.error("Failed to move category up", err);
      toast.error("Failed to reorder");
    }
  };

  // Reorder: Down
  const handleMoveDown = async (index: number) => {
    if (index >= categories.length - 1) return;
    const current = categories[index];
    const next = categories[index + 1];
    if (!current || !next) return;

    try {
      await Promise.all([
        updateCategory(current.id, { sort_order: next.sort_order }),
        updateCategory(next.id, { sort_order: current.sort_order }),
      ]);
    } catch (err) {
      console.error("Failed to move category down", err);
      toast.error("Failed to reorder");
    }
  };

  // Drag and drop reordering
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const reordered = [...categories];
    const [moved] = reordered.splice(draggedIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    setDraggedIndex(null);

    try {
      for (let i = 0; i < reordered.length; i++) {
        if (reordered[i].sort_order !== i) {
          await updateCategory(reordered[i].id, { sort_order: i });
        }
      }
    } catch (err) {
      console.error("Failed to save reorder", err);
      toast.error("Failed to reorder categories");
    }
  };

  return (
    <div id="categories" className="rounded-xl border border-border bg-card p-5 shadow-xs">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Categories</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Add, rename, reorder, or hide categories for each action. Hidden categories remain on old entries.
          </p>
        </div>
        {limit && (
          <Link
            href={`/settings/categories?group=${activeScope}`}
            data-testid="categories-see-all-link"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0"
          >
            <span>See all</span>
            <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>

      {/* Action Tabs: Income | Expenses | Giving */}
      <div className="flex items-center gap-1.5 rounded-xl bg-muted p-1 sm:w-80 mb-4">
        {ACTION_TABS.map((tab) => (
          <button
            key={tab.scope}
            type="button"
            data-testid={`category-tab-${tab.scope}`}
            onClick={() => {
              setActiveScope(tab.scope);
              setEditingCategoryId(null);
            }}
            className={cn(
              "flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer",
              activeScope === tab.scope
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Add Category Form */}
      <form onSubmit={handleAddCategory} className="flex items-center gap-2 mb-4">
        <input
          type="text"
          data-testid="add-category-input"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder={`Add new ${ACTION_TABS.find((t) => t.scope === activeScope)?.label.toLowerCase()} category...`}
          maxLength={40}
          className="flex-1 rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="submit"
          data-testid="add-category-btn"
          disabled={isAdding || !newCategoryName.trim()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-50 cursor-pointer shrink-0"
        >
          <Plus className="size-3.5" />
          <span>Add</span>
        </button>
      </form>

      {/* Categories List */}
      <div
        data-testid="categories-list"
        className="divide-y divide-border/60 rounded-xl border border-border bg-background/50 overflow-hidden"
      >
        {displayedCategories.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No categories found for this action.
          </div>
        ) : (
          displayedCategories.map((cat, index) => {
            const isEditing = editingCategoryId === cat.id;

            return (
              <div
                key={cat.id}
                data-testid={`category-item-${cat.id}`}
                draggable={!isEditing}
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                className={cn(
                  "flex items-center justify-between p-3 text-xs transition",
                  cat.is_hidden && "opacity-60 bg-muted/20",
                  draggedIndex === index && "opacity-30 bg-muted/50",
                )}
              >
                {/* Left: Reorder buttons & Name */}
                <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                  {/* Desktop drag handle */}
                  <span
                    className="hidden sm:inline-flex text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing p-1"
                    title="Drag to reorder"
                  >
                    <GripVertical className="size-3.5" />
                  </span>

                  {/* Mobile Up / Down buttons */}
                  <div className="flex flex-col sm:hidden shrink-0">
                    <button
                      type="button"
                      data-testid={`category-up-btn-${cat.id}`}
                      disabled={index === 0}
                      onClick={() => handleMoveUp(index)}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer p-0.5"
                      aria-label="Move up"
                    >
                      <ChevronUp className="size-3" />
                    </button>
                    <button
                      type="button"
                      data-testid={`category-down-btn-${cat.id}`}
                      disabled={index === categories.length - 1}
                      onClick={() => handleMoveDown(index)}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer p-0.5"
                      aria-label="Move down"
                    >
                      <ChevronDown className="size-3" />
                    </button>
                  </div>

                  {/* Name or Rename Input */}
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <input
                        type="text"
                        data-testid={`category-rename-input-${cat.id}`}
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        maxLength={40}
                        className="flex-1 rounded-lg border border-primary bg-background px-2 py-1 text-xs text-foreground focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        data-testid={`category-save-rename-btn-${cat.id}`}
                        onClick={() => handleSaveRename(cat)}
                        className="rounded-md p-1 text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
                        title="Save rename"
                      >
                        <Check className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCategoryId(null)}
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted cursor-pointer"
                        title="Cancel"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span
                        data-testid={`category-name-${cat.id}`}
                        className={cn(
                          "font-medium truncate text-foreground",
                          cat.is_hidden && "line-through text-muted-foreground",
                        )}
                      >
                        {cat.name}
                      </span>

                      {cat.is_default && (
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0">
                          Default
                        </span>
                      )}

                      {cat.is_hidden && (
                        <span
                          data-testid={`category-hidden-badge-${cat.id}`}
                          className="rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 text-[10px] font-medium shrink-0"
                        >
                          Hidden
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Actions (Rename, Hide/Unhide, Delete) */}
                {!isEditing && (
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Rename button */}
                    <button
                      type="button"
                      data-testid={`category-rename-btn-${cat.id}`}
                      onClick={() => handleStartRename(cat)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition cursor-pointer"
                      title="Rename category"
                      aria-label={`Rename ${cat.name}`}
                    >
                      <Pencil className="size-3.5" />
                    </button>

                    {/* Hide / Unhide button */}
                    <button
                      type="button"
                      data-testid={`category-hide-btn-${cat.id}`}
                      onClick={() => handleToggleHide(cat)}
                      className={cn(
                        "rounded-lg p-1.5 transition cursor-pointer",
                        cat.is_hidden
                          ? "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                      )}
                      title={cat.is_hidden ? "Unhide category" : "Hide category"}
                      aria-label={cat.is_hidden ? `Unhide ${cat.name}` : `Hide ${cat.name}`}
                    >
                      {cat.is_hidden ? (
                        <EyeOff className="size-3.5" />
                      ) : (
                        <Eye className="size-3.5" />
                      )}
                    </button>

                    {/* Delete button (only for custom categories; defaults can be hidden, not deleted) */}
                    {!cat.is_default && (
                      <button
                        type="button"
                        data-testid={`category-delete-btn-${cat.id}`}
                        onClick={() => handleDeleteCategory(cat)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                        title="Delete category"
                        aria-label={`Delete ${cat.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Category Delete Confirmation Modal */}
      {categoryToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Delete category?
            </h3>
            <p className="text-sm text-muted-foreground">
              Category &quot;{categoryToDelete.name}&quot; will be permanently deleted.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingCategory}
                onClick={() => setCategoryToDelete(null)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingCategory}
                data-testid="confirm-delete-category-btn"
                onClick={confirmDeleteCategory}
                className="rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors cursor-pointer"
              >
                {isDeletingCategory ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
