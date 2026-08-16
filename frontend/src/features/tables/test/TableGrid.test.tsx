import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TableGrid } from "../components/TableGrid";
import { RestaurantTable } from "../types/table.types";

describe("TableGrid Component", () => {
  const mockTables: RestaurantTable[] = [
    {
      id: "table-1",
      name: "T-01",
      capacity: 4,
      section: "Main Dining",
      status: "AVAILABLE",
      status_display: "Available",
      is_active: true,
      display_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "table-2",
      name: "VIP-1",
      capacity: 8,
      section: "VIP Lounge",
      status: "OCCUPIED",
      status_display: "Occupied",
      is_active: true,
      display_order: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  it("renders section headers and table cards", () => {
    render(
      <TableGrid
        tables={mockTables}
        onEdit={vi.fn()}
        onStatusClick={vi.fn()}
      />
    );

    expect(screen.getAllByText("Main Dining").length).toBeGreaterThan(0);
    expect(screen.getAllByText("VIP Lounge").length).toBeGreaterThan(0);
    expect(screen.getByText("T-01")).toBeInTheDocument();
    expect(screen.getByText("VIP-1")).toBeInTheDocument();
  });
});
