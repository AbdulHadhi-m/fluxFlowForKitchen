import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TableCard } from "../components/TableCard";
import { RestaurantTable } from "../types/table.types";

describe("TableCard Component", () => {
  const mockTable: RestaurantTable = {
    id: "table-1",
    name: "T-01",
    capacity: 4,
    section: "Patio",
    status: "AVAILABLE",
    status_display: "Available",
    is_active: true,
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it("renders table card with name, capacity, section and status", () => {
    render(
      <TableCard
        table={mockTable}
        onEdit={vi.fn()}
        onStatusClick={vi.fn()}
      />
    );

    expect(screen.getByText("T-01")).toBeInTheDocument();
    expect(screen.getByText("Patio")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
  });
});
