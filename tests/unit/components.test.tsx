import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { DateField } from "@/components/date-field";
import { AmountField } from "@/components/amount-field";

describe("DateField component", () => {
  it("renders with DD-MM-YYYY placeholder", () => {
    render(<DateField label="Transaction Date" />);
    const input = screen.getByPlaceholderText("DD-MM-YYYY");
    expect(input).toBeInTheDocument();
    expect(screen.getByText("Transaction Date")).toBeInTheDocument();
  });

  it("formats ISO value to DD-MM-YYYY for display", () => {
    render(<DateField value="2026-10-20" />);
    const input = screen.getByDisplayValue("20-10-2026");
    expect(input).toBeInTheDocument();
  });

  it("masks typing and calls onChange with ISO date when complete", () => {
    const handleChange = vi.fn();
    render(<DateField onChange={handleChange} />);
    const input = screen.getByPlaceholderText("DD-MM-YYYY");

    // Type 20102026
    fireEvent.change(input, { target: { value: "20102026" } });
    expect(input).toHaveValue("20-10-2026");
    expect(handleChange).toHaveBeenCalledWith("2026-10-20");
  });
});

describe("AmountField component", () => {
  it("renders with currency symbol prefix and decimal inputmode", () => {
    render(<AmountField currency="NGN" label="Amount" />);
    expect(screen.getByText("₦")).toBeInTheDocument();
    const input = screen.getByPlaceholderText("0.00");
    expect(input).toHaveAttribute("inputmode", "decimal");
  });

  it("displays initial minor units with thousands separators", () => {
    render(<AmountField value={15000000} currency="NGN" />);
    expect(screen.getByDisplayValue("150,000.00")).toBeInTheDocument();
  });

  it("formats thousands separators while typing and emits minor units", () => {
    const handleChange = vi.fn();
    render(<AmountField currency="NGN" onChange={handleChange} />);
    const input = screen.getByPlaceholderText("0.00");

    // Type 1500.50
    fireEvent.change(input, { target: { value: "1500.50" } });
    expect(input).toHaveValue("1,500.50");
    expect(handleChange).toHaveBeenCalledWith(150050);
  });
});
