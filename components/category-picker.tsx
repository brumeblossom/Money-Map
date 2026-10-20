"use client";

import * as React from "react";
import { cn } from "cn";
import { type CategoryScope, type CategoryRow } from "@/lib/db/dexie";
import { useCategories } from "@/lib/repo/hooks";
import { Input } from "@/components/ui/input";

export interface CategoryPickerProps {
  id?: string;
  scope: CategoryScope;
  value?: string; // Category id or "__other__"
  customName?: string;
  onChange: (categoryId: string, isOther: boolean) => void;
  onCustomNameChange?: (customName: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
}

export const OTHER_CATEGORY_VALUE = "__other__";

export function CategoryPicker({
  id,
  scope,
  value,
  customName = "",
  onChange,
  onCustomNameChange,
  label = "Category",
  required = false,
  disabled = false,
  className,
  error,
}: CategoryPickerProps) {
  const generatedId = React.useId();
  const selectId = id || generatedId;
  const customInputId = `${selectId}-custom`;

  const categories = useCategories(scope);

  const isOtherSelected = value === OTHER_CATEGORY_VALUE;

  React.useEffect(() => {
    if (!value && categories && categories.length > 0) {
      onChange(categories[0].id, false);
    }
  }, [value, categories, onChange]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedVal = e.target.value;
    if (selectedVal === OTHER_CATEGORY_VALUE) {
      onChange(OTHER_CATEGORY_VALUE, true);
    } else {
      onChange(selectedVal, false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label
          htmlFor={selectId}
          className="cursor-pointer text-sm font-medium text-foreground"
        >
          {label} {required && <span className="text-destructive">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          id={selectId}
          value={value ?? ""}
          onChange={handleSelectChange}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          className="flex h-11 w-full appearance-none items-center justify-between rounded-xl border border-input bg-background/50 px-3.5 py-2 text-base text-foreground shadow-xs transition-colors focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="" disabled>
            Select a category
          </option>
          {categories?.map((cat: CategoryRow) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
          <option value={OTHER_CATEGORY_VALUE}>Other (type your own)</option>
        </select>

        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground">
          <svg
            className="size-4"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>

      {isOtherSelected && (
        <div className="mt-2 flex flex-col gap-1.5 animate-in fade-in-50 slide-in-from-top-1">
          <label
            htmlFor={customInputId}
            className="text-xs font-medium text-muted-foreground"
          >
            Category name
          </label>
          <Input
            id={customInputId}
            type="text"
            placeholder="Type your category name"
            maxLength={40}
            value={customName}
            onChange={(e) => onCustomNameChange?.(e.target.value)}
            disabled={disabled}
            autoFocus
            className="h-10 rounded-xl"
            required={required}
          />
        </div>
      )}

      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
