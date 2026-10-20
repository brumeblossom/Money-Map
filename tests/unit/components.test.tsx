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

  it("typing '2500' gives 250000 minor and formats on blur", () => {
    const handleChange = vi.fn();
    render(<AmountField currency="NGN" onChange={handleChange} />);
    const input = screen.getByPlaceholderText("0.00");

    fireEvent.change(input, { target: { value: "2500" } });
    expect(input).toHaveValue("2500");
    expect(handleChange).toHaveBeenCalledWith(250000);

    fireEvent.blur(input);
    expect(input).toHaveValue("2,500");
  });

  it("typing '1234567.89' gives 123456789 minor and formats on blur", () => {
    const handleChange = vi.fn();
    render(<AmountField currency="NGN" onChange={handleChange} />);
    const input = screen.getByPlaceholderText("0.00");

    fireEvent.change(input, { target: { value: "1234567.89" } });
    expect(input).toHaveValue("1234567.89");
    expect(handleChange).toHaveBeenCalledWith(123456789);

    fireEvent.blur(input);
    expect(input).toHaveValue("1,234,567.89");
  });

  it("ignores a third decimal digit", () => {
    const handleChange = vi.fn();
    render(<AmountField currency="NGN" onChange={handleChange} />);
    const input = screen.getByPlaceholderText("0.00");

    fireEvent.change(input, { target: { value: "12.345" } });
    expect(input).toHaveValue("12.34");
    expect(handleChange).toHaveBeenCalledWith(1234);
  });

  it("converts leading '.' to '0.'", () => {
    const handleChange = vi.fn();
    render(<AmountField currency="NGN" onChange={handleChange} />);
    const input = screen.getByPlaceholderText("0.00");

    fireEvent.change(input, { target: { value: "." } });
    expect(input).toHaveValue("0.");
    expect(handleChange).toHaveBeenCalledWith(0);

    fireEvent.change(input, { target: { value: ".5" } });
    expect(input).toHaveValue("0.5");
    expect(handleChange).toHaveBeenCalledWith(50);
  });

  it("handles backspace properly", () => {
    const handleChange = vi.fn();
    render(<AmountField currency="NGN" onChange={handleChange} />);
    const input = screen.getByPlaceholderText("0.00");

    fireEvent.change(input, { target: { value: "2500" } });
    expect(handleChange).toHaveBeenCalledWith(250000);

    // Backspace: "250"
    fireEvent.change(input, { target: { value: "250" } });
    expect(input).toHaveValue("250");
    expect(handleChange).toHaveBeenCalledWith(25000);

    // Backspace to empty
    fireEvent.change(input, { target: { value: "" } });
    expect(input).toHaveValue("");
    expect(handleChange).toHaveBeenCalledWith(0);
  });

  it("handles pasting '₦2,500.50'", () => {
    const handleChange = vi.fn();
    render(<AmountField currency="NGN" onChange={handleChange} />);
    const input = screen.getByPlaceholderText("0.00");

    fireEvent.change(input, { target: { value: "₦2,500.50" } });
    expect(input).toHaveValue("2500.50");
    expect(handleChange).toHaveBeenCalledWith(250050);

    fireEvent.blur(input);
    expect(input).toHaveValue("2,500.50");
  });
});
