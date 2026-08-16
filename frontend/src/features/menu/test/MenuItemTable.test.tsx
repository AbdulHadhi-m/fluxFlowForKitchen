import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MenuItemTable } from "../components/MenuItemTable";
import { MenuItem } from "../types/menu.types";

const queryClient = new QueryClient();

describe("MenuItemTable Component", () => {
  const mockItems: MenuItem[] = [
    {
      id: "item-1",
      category_id: "cat-1",
      category_name: "Pizzas",
      name: "Margherita Pizza",
      description: "Tomato sauce, mozzarella, basil",
      price: "14.50",
      is_available: true,
      is_active: true,
      display_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  it("renders menu items with formatted currency and availability status", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MenuItemTable items={mockItems} onEdit={vi.fn()} />
      </QueryClientProvider>
    );

    expect(screen.getByText("Margherita Pizza")).toBeInTheDocument();
    expect(screen.getByText("Pizzas")).toBeInTheDocument();
    expect(screen.getByText("$14.50")).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
  });
});
