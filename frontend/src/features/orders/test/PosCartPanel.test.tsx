import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PosCartPanel } from "../components/PosCartPanel";
import { usePosCartStore } from "../store/posCartStore";

describe("PosCartPanel Component", () => {
  beforeEach(() => {
    usePosCartStore.getState().clearCart();
  });

  it("renders cart items, subtotal and enables submit", () => {
    usePosCartStore.getState().addItem({ id: "item-1", name: "Truffle Pasta", price: "22.00" });

    render(
      <PosCartPanel
        onPlaceOrder={vi.fn()}
        isSubmitting={false}
        errorMessage={null}
      />
    );

    expect(screen.getByText("Truffle Pasta")).toBeInTheDocument();
    expect(screen.getAllByText("$22.00").length).toBeGreaterThan(0);
    expect(screen.getByText(/Place Order/i)).toBeInTheDocument();
  });
});
