"use client";

import * as React from "react";
import { cn } from "cn";
import { fromMinor, toMinor } from "@/lib/format";

export interface AmountFieldProps {
  id?: string;
  name?: string;
  label?: string;
  value?: number; // Minor units integer (kobo, cents)
  defaultValue?: number;
  currency?: string;
  onChange?: (amountMinor: number) => void;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  className?: string;
  error?: string;
}

export function getCurrencySymbol(currency: string): string {
  const norm = (currency || "NGN").toUpperCase();
  switch (norm) {
    case "NGN":
      return "₦";
    case "USD":
      return "$";
    case "GBP":
      return "£";
    case "EUR":
      return "€";
    case "CAD":
      return "CA$";
    case "AUD":
      return "A$";
    case "JPY":
      return "¥";
    case "GHS":
      return "GH₵";
    case "KES":
      return "KSh";
    case "ZAR":
      return "R";
    case "INR":
      return "₹";
    default: {
      try {
        const parts = new Intl.NumberFormat("en", {
          style: "currency",
          currency: norm,
        }).formatToParts(0);
        const symbolPart = parts.find((p) => p.type === "currency");
        if (symbolPart) return symbolPart.value;
      } catch {}
      return norm;
    }
  }
}

/**
 * Live formatting of amount inputs with thousands separators while typing.
 * Accepts partial values like "1234567.5", numbers with commas, or pasted amounts with currency symbols.
 */
export function formatAmountLive(input: string): string {
  if (!input) return "";

  // 1. Strip everything except digits and decimal point
  let cleaned = input.replace(/[^0-9.]/g, "");
  if (!cleaned) return "";

  // 2. If it starts with a dot, prepend "0"
  if (cleaned.startsWith(".")) {
    cleaned = "0" + cleaned;
  }

  // 3. Separate integer and decimal parts
  const hasDot = cleaned.includes(".");
  const parts = cleaned.split(".");
  const intPart = parts[0].slice(0, 12); // Maximum 12 digits (999,999,999,999)

  // Format integer part with thousands commas
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (hasDot) {
    // Keep at most 2 decimal digits
    const decPart = parts.slice(1).join("").replace(/\./g, "").slice(0, 2);
    return `${formattedInt}.${decPart}`;
  }

  return formattedInt;
}

/**
 * Calculates the updated caret position when thousands commas are added or removed.
 */
export function calculateCaretPosition(
  oldValue: string,
  newValue: string,
  oldCaret: number,
): number {
  if (oldCaret <= 0) return 0;
  if (oldCaret >= oldValue.length) return newValue.length;

  // Count how many non-comma characters were to the left of oldCaret in oldValue
  let nonCommasBefore = 0;
  for (let i = 0; i < oldCaret && i < oldValue.length; i++) {
    if (oldValue[i] !== ",") {
      nonCommasBefore++;
    }
  }

  // Find index in newValue that has nonCommasBefore non-comma characters
  let newCaret = 0;
  let count = 0;
  while (newCaret < newValue.length && count < nonCommasBefore) {
    if (newValue[newCaret] !== ",") {
      count++;
    }
    newCaret++;
  }

  return newCaret;
}

export function AmountField({
  id,
  name,
  label,
  value,
  defaultValue,
  currency = "NGN",
  onChange,
  disabled = false,
  required = false,
  autoFocus = false,
  className,
  error,
}: AmountFieldProps) {
  const generatedId = React.useId();
  const inputId = id || generatedId;
  const symbol = getCurrencySymbol(currency);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const initialMinor = value ?? defaultValue;
  const initialText = React.useMemo(() => {
    if (initialMinor === undefined || initialMinor === 0) return "";
    return formatAmountLive(fromMinor(initialMinor));
  }, [initialMinor]);

  const [rawText, setRawText] = React.useState<string>(initialText);
  const lastEmittedRef = React.useRef<number | undefined>(initialMinor);

  React.useEffect(() => {
    if (value !== undefined && value !== lastEmittedRef.current) {
      lastEmittedRef.current = value;
      setRawText(value === 0 ? "" : formatAmountLive(fromMinor(value)));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const inputVal = input.value;
    const oldCaret = input.selectionStart ?? inputVal.length;

    if (inputVal === "") {
      setRawText("");
      lastEmittedRef.current = 0;
      onChange?.(0);
      return;
    }

    const formatted = formatAmountLive(inputVal);
    const newCaret = calculateCaretPosition(inputVal, formatted, oldCaret);

    setRawText(formatted);

    // Convert to integer minor units
    let minor = 0;
    const unformatted = formatted.replace(/,/g, "");
    if (unformatted && unformatted !== "0.") {
      try {
        minor = toMinor(unformatted);
      } catch {
        minor = 0;
      }
    }
    lastEmittedRef.current = minor;
    onChange?.(minor);

    // Restore caret position smoothly
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(newCaret, newCaret);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      const input = inputRef.current;
      if (input && input.selectionStart === input.selectionEnd) {
        const pos = input.selectionStart ?? 0;
        // If caret is positioned immediately after a comma, delete the digit before the comma
        if (pos > 1 && input.value[pos - 1] === ",") {
          e.preventDefault();
          const val = input.value;
          const updated = val.slice(0, pos - 2) + val.slice(pos);
          const formatted = formatAmountLive(updated);
          const newPos = calculateCaretPosition(val, formatted, pos - 2);

          setRawText(formatted);
          const unformatted = formatted.replace(/,/g, "");
          let minor = 0;
          if (unformatted && unformatted !== "0.") {
            try {
              minor = toMinor(unformatted);
            } catch {
              minor = 0;
            }
          }
          lastEmittedRef.current = minor;
          onChange?.(minor);

          requestAnimationFrame(() => {
            if (inputRef.current) {
              inputRef.current.setSelectionRange(newPos, newPos);
            }
          });
        }
      }
    }
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="cursor-pointer text-sm font-medium text-foreground"
        >
          {label} {required && <span className="text-destructive">*</span>}
        </label>
      )}

      <div className="relative flex items-center rounded-xl border border-input bg-background/50 px-3.5 py-2.5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
        <span
          className="mr-2 select-none text-2xl font-bold text-muted-foreground"
          aria-hidden="true"
        >
          {symbol}
        </span>

        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={rawText}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          required={required}
          autoFocus={autoFocus}
          aria-invalid={!!error}
          className="w-full bg-transparent text-3xl font-semibold tracking-tight text-foreground placeholder:text-muted-foreground/40 outline-none tabular-nums"
        />
      </div>

      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
