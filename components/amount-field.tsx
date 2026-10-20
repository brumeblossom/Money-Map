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

function getCurrencySymbol(currency: string): string {
  switch (currency.toUpperCase()) {
    case "NGN":
      return "₦";
    case "USD":
      return "$";
    case "GBP":
      return "£";
    case "EUR":
      return "€";
    default:
      return currency;
  }
}

export function formatAmountWithCommas(raw: string): string {
  if (!raw) return "";
  const cleaned = raw.replace(/,/g, "");
  const parts = cleaned.split(".");
  const intPart = parts[0] ? BigInt(parts[0]).toLocaleString("en-US") : "0";
  if (parts.length > 1) {
    return `${intPart}.${parts[1]}`;
  }
  return intPart;
}

export function sanitizeAmountInput(input: string): string {
  // Strip currency symbols, spaces, commas, etc.
  let cleaned = input.replace(/[^0-9.]/g, "");

  // If starts with ".", prepend "0"
  if (cleaned.startsWith(".")) {
    cleaned = "0" + cleaned;
  }

  // At most one decimal point and at most 2 decimal digits
  const dotIndex = cleaned.indexOf(".");
  if (dotIndex !== -1) {
    const intPart = cleaned.slice(0, dotIndex);
    const decPart = cleaned.slice(dotIndex + 1).replace(/\./g, "").slice(0, 2);
    // Integer part up to 12 digits (999,999,999,999)
    const cappedInt = intPart.slice(0, 12);
    return `${cappedInt}.${decPart}`;
  }

  // Up to 12 integer digits
  return cleaned.slice(0, 12);
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

  const initialMinor = value ?? defaultValue;
  const initialText = React.useMemo(() => {
    if (initialMinor === undefined || initialMinor === 0) return "";
    return formatAmountWithCommas(fromMinor(initialMinor));
  }, [initialMinor]);

  const [rawText, setRawText] = React.useState<string>(initialText);
  const [lastEmittedMinor, setLastEmittedMinor] = React.useState<number | undefined>(initialMinor);
  const [prevValue, setPrevValue] = React.useState(value);

  if (value !== undefined && value !== prevValue) {
    setPrevValue(value);
    if (value !== lastEmittedMinor) {
      setLastEmittedMinor(value);
      setRawText(value === 0 ? "" : formatAmountWithCommas(fromMinor(value)));
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;

    if (inputVal === "") {
      setRawText("");
      setLastEmittedMinor(0);
      onChange?.(0);
      return;
    }

    const sanitized = sanitizeAmountInput(inputVal);
    setRawText(sanitized);

    // Convert to minor units
    let minor = 0;
    if (sanitized && sanitized !== "0.") {
      try {
        minor = toMinor(sanitized);
      } catch {
        minor = 0;
      }
    }
    setLastEmittedMinor(minor);
    onChange?.(minor);
  };

  const handleBlur = () => {
    if (rawText && rawText !== "0.") {
      setRawText(formatAmountWithCommas(rawText));
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
          id={inputId}
          name={name}
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={rawText}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          required={required}
          autoFocus={autoFocus}
          aria-invalid={!!error}
          className="w-full bg-transparent text-3xl font-semibold tracking-tight text-foreground placeholder:text-muted-foreground/40 outline-none"
        />
      </div>

      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
