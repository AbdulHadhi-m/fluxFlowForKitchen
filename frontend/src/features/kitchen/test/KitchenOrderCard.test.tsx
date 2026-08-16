import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { KitchenOrderCard } from "../components/KitchenOrderCard";
import { KitchenTicket } from "../types/kitchen.types";

describe("KitchenOrderCard Component", () => {
  const mockTicket: KitchenTicket = {
    id: "ticket-1",
    order_id: "order-1",
    order_number: "ORD-000001",
    table_name: "T04",
    server_name: "Chef Marco",
    status: "NEW",
    status_display: "New",
    priority: 0,
    notes: "Birthday table",
    items: [
      {
        id: "item-1",
        name: "Chicken Tikka",
        quantity: 2,
        notes: "No onions",
      },
    ],
    started_at: null,
    ready_at: null,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it("renders ticket card with items, table, notes and START PREP button", () => {
    render(
      <KitchenOrderCard
        ticket={mockTicket}
        onStart={vi.fn()}
        onReady={vi.fn()}
        onComplete={vi.fn()}
        isUpdating={false}
      />
    );

    expect(screen.getByText("ORD-000001")).toBeInTheDocument();
    expect(screen.getByText("Table T04")).toBeInTheDocument();
    expect(screen.getByText("Chicken Tikka")).toBeInTheDocument();
    expect(screen.getByText(/No onions/i)).toBeInTheDocument();
    expect(screen.getByText("START PREP")).toBeInTheDocument();
  });
});
