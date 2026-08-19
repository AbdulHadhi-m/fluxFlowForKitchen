import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GiftCardsTable } from "../components/GiftCardsTable";

describe("GiftCardsTable Component", () => {
  it("renders gift card rows with card number and current balance", () => {
    const giftCards = [
      {
        id: "gc-1",
        card_number: "GC-4819-2049-1184",
        customer_name: "Selina Kyle",
        initial_balance: "100.00",
        current_balance: "75.50",
        currency: "USD",
        status: "ACTIVE" as const,
        created_at: "2026-08-16T12:00:00Z",
        updated_at: "",
      },
    ];

    render(<GiftCardsTable giftCards={giftCards} />);

    expect(screen.getByText("GC-4819-2049-1184")).toBeInTheDocument();
    expect(screen.getByText("Selina Kyle")).toBeInTheDocument();
    expect(screen.getByText("₹75.50 USD")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});
