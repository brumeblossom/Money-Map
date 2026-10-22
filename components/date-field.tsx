"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { cn } from "cn";
import {
  formatDate,
  isValidDisplayDate,
  parseDisplayDate,
  tryParseDisplayDate,
} from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

export interface DateFieldProps {
  id?: string;
  name?: string;
  label?: string;
  value?: string; // ISO date string (YYYY-MM-DD)
  defaultValue?: string; // ISO date string (YYYY-MM-DD)
  onChange?: (isoDate: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  error?: string;
  "data-testid"?: string;
}

export function DateField({
  id,
  name,
  label,
  value,
  defaultValue,
  onChange,
  disabled = false,
  required = false,
  className,
  error,
  "data-testid": dataTestId,
}: DateFieldProps) {
  const generatedId = React.useId();
  const inputId = id || generatedId;

  const [isOpen, setIsOpen] = React.useState(false);
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
    const initialIso = value ?? defaultValue ?? "";
    if (!initialIso) return "";
    try {
      return formatDate(initialIso);
    } catch {
      return "";
    }
  }, [userText, value, defaultValue]);

  // Masking handler for user typing DD-MM-YYYY
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, "").slice(0, 8);

    let masked = "";
    if (digits.length <= 2) {
      masked = digits;
    } else if (digits.length <= 4) {
      masked = `${digits.slice(0, 2)}-${digits.slice(2)}`;
    } else {
      masked = `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
    }

    setUserText(masked);

    if (masked.length === 10 && isValidDisplayDate(masked)) {
      try {
        const iso = parseDisplayDate(masked);
        onChange?.(iso);
      } catch {
        // incomplete or invalid date
      }
    } else if (masked.length === 0) {
      onChange?.("");
    }
  };

  // When a day is selected in the popover calendar
  const handleSelectDate = (selectedDay: Date | undefined) => {
    if (!selectedDay) return;
    const year = selectedDay.getFullYear();
    const month = String(selectedDay.getMonth() + 1).padStart(2, "0");
    const day = String(selectedDay.getDate()).padStart(2, "0");
    const iso = `${year}-${month}-${day}`;
    const display = `${day}-${month}-${year}`;

    setUserText(display);
    onChange?.(iso);
    setIsOpen(false);
  };

  // Convert current ISO or display value into a Date object for Calendar preview
  const calendarSelected = React.useMemo(() => {
    const currentIso = value || tryParseDisplayDate(displayValue);
    if (!currentIso) return undefined;
    const parts = currentIso.split("-").map(Number);
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return undefined;
  }, [value, displayValue]);

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

      <div className="relative flex items-center">
        <Input
          id={inputId}
          data-testid={dataTestId}
          name={name}
          type="text"
          inputMode="numeric"
          placeholder="DD-MM-YYYY"
          maxLength={10}
          value={displayValue}
          onChange={handleInputChange}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          className="pr-10 font-mono tracking-wider"
        />

        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              className="absolute right-0 size-9 text-muted-foreground hover:text-foreground"
              aria-label="Open calendar"
            >
              <CalendarIcon className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={calendarSelected}
              onSelect={handleSelectDate}
            />
          </PopoverContent>
        </Popover>
      </div>

      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
