import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LoyaltyAccountsTable } from "../components/LoyaltyAccountsTable";

describe("LoyaltyAccountsTable Component", () => {
  it("renders loyalty accounts and triggers points adjustment", () => {
    const handleAdjust = vi.fn();
    const accounts = [
      {
        id: "acc-1",
        customer: "cust-1",
        customer_name: "Bruce Wayne",
        customer_phone: "+1999888777",
        tier_name: "Platinum VIP",
        points_balance: 1250,
        lifetime_points_earned: 2500,
        lifetime_points_redeemed: 1250,
        status: "ACTIVE" as const,
        created_at: "",
        updated_at: "",
      },
    ];

    render(
      <LoyaltyAccountsTable
        accounts={accounts}
        onAdjustPoints={handleAdjust}
      />
    );

    expect(screen.getByText("Bruce Wayne")).toBeInTheDocument();
    expect(screen.getByText("Platinum VIP")).toBeInTheDocument();
    expect(screen.getByText("1250 pts")).toBeInTheDocument();

    const adjustBtn = screen.getByRole("button", { name: /Adjust Points/i });
    fireEvent.click(adjustBtn);
    expect(handleAdjust).toHaveBeenCalledWith(accounts[0]);
  });
});
