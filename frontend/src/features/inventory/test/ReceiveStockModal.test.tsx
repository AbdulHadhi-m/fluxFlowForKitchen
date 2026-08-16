import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReceiveStockModal } from "../components/ReceiveStockModal";
import { InventoryItem } from "../types/inventory.types";

describe("ReceiveStockModal Component", () => {
  const mockItem: InventoryItem = {
    id: "item-1",
    name: "Parmigiano Reggiano",
    sku: "CH-01",
    unit: "kg",
    current_quantity: "10.000",
    minimum_stock_level: "5.000",
    cost_per_unit: "22.50",
    is_active: true,
    stock_status: "IN_STOCK",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it("renders ReceiveStockModal with current stock and input fields", () => {
    render(
      <ReceiveStockModal
        isOpen={true}
        onClose={vi.fn()}
        item={mockItem}
        onSubmit={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByText(/Receive Stock — Parmigiano Reggiano/i)).toBeInTheDocument();
    expect(screen.getByText(/10.000 kg/i)).toBeInTheDocument();
    expect(screen.getByText("Quantity Received")).toBeInTheDocument();
  });
});
