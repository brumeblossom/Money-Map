import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("Home page", () => {
  it("renders heading and hint", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "What are we recording today?",
      }),
    ).toBeInTheDocument();

    expect(screen.getByText("Tap a card to add an entry")).toBeInTheDocument();
  });

  it("renders month switcher strip with Income, Expenses, Left over", () => {
    render(<Home />);
    expect(screen.getByTestId("month-switcher-current")).toBeInTheDocument();
    expect(screen.getByTestId("month-strip-income")).toBeInTheDocument();
    expect(screen.getByTestId("month-strip-expenses")).toBeInTheDocument();
    expect(screen.getByTestId("month-strip-left-over")).toBeInTheDocument();
  });

  it("renders the 4 action cards in order", () => {
    render(<Home />);
    const incomeContainer = screen.getByTestId("action-card-income");
    const expenseContainer = screen.getByTestId("action-card-expense");
    const givingContainer = screen.getByTestId("action-card-giving");
    const lentContainer = screen.getByTestId("action-card-lent");

    expect(incomeContainer).toBeInTheDocument();
    expect(expenseContainer).toBeInTheDocument();
    expect(givingContainer).toBeInTheDocument();
    expect(lentContainer).toBeInTheDocument();

    expect(incomeContainer).toHaveTextContent("Income");
    expect(expenseContainer).toHaveTextContent("Expenses");
    expect(givingContainer).toHaveTextContent("Giving");
    expect(lentContainer).toHaveTextContent("Money I lent");

    const incomeCard = incomeContainer.querySelector("a");
    const expenseCard = expenseContainer.querySelector("a");
    const givingCard = givingContainer.querySelector("a");
    const lentCard = lentContainer.querySelector("a");

    expect(incomeCard?.getAttribute("href")).toBe("/new/income");
    expect(expenseCard?.getAttribute("href")).toBe("/new/expense");
    expect(givingCard?.getAttribute("href")).toBe("/new/giving");
    expect(lentCard?.getAttribute("href")).toBe("/records?tab=lent");
  });
});
