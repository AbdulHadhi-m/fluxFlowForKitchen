import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReceiveStockModal } from "../components/ReceiveStockModal";
import { InventoryItem } from "../types/inventory.types";

describe("ReceiveStockModal Component", () => {
  const mockItem: InventoryItem = {
    id: "item-1",
    name: "Parmigiano Reggiano",
    sku: "CH-01",
    item_type: "RAW_INGREDIENT",
    unit: "kg",
    purchase_unit: "kg",
    purchase_to_stock_factor: "1.0000",
    storage_location: "MAIN_STORE",
    storage_condition: "AMBIENT",
    current_quantity: "10.000",
    minimum_stock_level: "5.000",
    par_level: "10.000",
    max_stock_level: "100.000",
    cost_per_unit: "22.50",
    last_purchase_cost: "22.50",
    weighted_average_cost: "22.5000",
    yield_percentage: "100.00",
    track_expiry: false,
    track_batch: false,
    is_active: true,
    stock_status: "IN_STOCK",
    total_valuation: "225.00",
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
