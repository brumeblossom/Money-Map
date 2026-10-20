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

  it("renders this-month strip with In, Out, Left over", () => {
    render(<Home />);
    expect(screen.getByText("This month")).toBeInTheDocument();
    expect(screen.getByTestId("month-strip-money-in")).toBeInTheDocument();
    expect(screen.getByTestId("month-strip-money-out")).toBeInTheDocument();
    expect(screen.getByTestId("month-strip-left-over")).toBeInTheDocument();
  });

  it("renders the 4 action cards in order", () => {
    render(<Home />);
    expect(screen.getByTestId("action-card-income")).toBeInTheDocument();
    expect(screen.getByTestId("action-card-expense")).toBeInTheDocument();
    expect(screen.getByTestId("action-card-giving")).toBeInTheDocument();
    expect(screen.getByTestId("action-card-lent")).toBeInTheDocument();

    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toEqual([
      "/new/income",
      "/new/expense",
      "/new/giving",
      "/new/lent",
    ]);
  });
});
