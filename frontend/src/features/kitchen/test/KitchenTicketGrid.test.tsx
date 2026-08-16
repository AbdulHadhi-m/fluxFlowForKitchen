import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { KitchenTicketGrid } from "../components/KitchenTicketGrid";
import { KitchenTicket } from "../types/kitchen.types";

describe("KitchenTicketGrid Component", () => {
  const mockTickets: KitchenTicket[] = [
    {
      id: "ticket-1",
      order_id: "order-1",
      order_number: "ORD-000001",
      table_name: "T04",
      server_name: "Chef Marco",
      status: "PREPARING",
      status_display: "Preparing",
      priority: 0,
      notes: "",
      items: [
        {
          id: "item-1",
          name: "Spaghetti Bolognese",
          quantity: 1,
          notes: "",
        },
      ],
      started_at: new Date().toISOString(),
      ready_at: null,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  it("renders ticket grid with tickets", () => {
    render(
      <KitchenTicketGrid
        tickets={mockTickets}
        onStart={vi.fn()}
        onReady={vi.fn()}
        onComplete={vi.fn()}
        isUpdating={false}
      />
    );

    expect(screen.getByText("ORD-000001")).toBeInTheDocument();
    expect(screen.getByText("Spaghetti Bolognese")).toBeInTheDocument();
    expect(screen.getByText("MARK READY ON PASS")).toBeInTheDocument();
  });

  it("renders empty pass state when no tickets exist", () => {
    render(
      <KitchenTicketGrid
        tickets={[]}
        onStart={vi.fn()}
        onReady={vi.fn()}
        onComplete={vi.fn()}
        isUpdating={false}
      />
    );

    expect(screen.getByText("Kitchen Pass is Clear")).toBeInTheDocument();
  });
});
