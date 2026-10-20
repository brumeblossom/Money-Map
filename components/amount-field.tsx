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

function formatNumberWithCommas(raw: string): string {
  if (!raw) return "";
  const parts = raw.split(".");
  const intPart = parts[0] ? BigInt(parts[0]).toLocaleString("en-US") : "0";
  if (parts.length > 1) {
    return `${intPart}.${parts[1].slice(0, 2)}`;
  }
  return intPart;
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

  const [userText, setUserText] = React.useState<string | null>(null);

  // Reset userText when controlled value changes from outside
  const [prevValue, setPrevValue] = React.useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setUserText(null);
  }

  // Derive displayValue
  const displayValue = React.useMemo(() => {
    if (userText !== null) return userText;
    const initialMinor = value ?? defaultValue;
    if (initialMinor === undefined || initialMinor === 0) return "";
    const majorStr = fromMinor(initialMinor);
    return formatNumberWithCommas(majorStr);
  }, [userText, value, defaultValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;

    const cleaned = inputVal.replace(/[^0-9.]/g, "");

    const parts = cleaned.split(".");
    let normalized = cleaned;
    if (parts.length > 2) {
      normalized = `${parts[0]}.${parts.slice(1).join("")}`;
    }

    if (normalized === "" || normalized === ".") {
      const nextDisplay = normalized === "." ? "0." : "";
      setUserText(nextDisplay);
      onChange?.(0);
      return;
    }

    const decimalParts = normalized.split(".");
    const rawInt = decimalParts[0] || "0";
    const hasDecimal = decimalParts.length > 1;
    const decimalDigits = hasDecimal ? decimalParts[1].slice(0, 2) : "";

    let formatted = "";
    try {
      const intBig = BigInt(rawInt);
      formatted = intBig.toLocaleString("en-US");
    } catch {
      formatted = rawInt;
    }

    if (hasDecimal) {
      formatted = `${formatted}.${decimalDigits}`;
    }

    setUserText(formatted);

    const minorUnits = toMinor(formatted);
    onChange?.(minorUnits);
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
          value={displayValue}
          onChange={handleChange}
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
