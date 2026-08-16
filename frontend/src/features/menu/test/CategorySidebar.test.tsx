import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CategorySidebar } from "../components/CategorySidebar";
import { MenuCategory } from "../types/menu.types";

describe("CategorySidebar Component", () => {
  const mockCategories: MenuCategory[] = [
    {
      id: "cat-1",
      name: "Starters",
      description: "Appetizers",
      display_order: 1,
      is_active: true,
      item_count: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "cat-2",
      name: "Main Course",
      description: "Pizzas and Pastas",
      display_order: 2,
      is_active: true,
      item_count: 12,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  it("renders category list with items count and selection state", () => {
    render(
      <CategorySidebar
        categories={mockCategories}
        selectedCategoryId="cat-1"
        onSelectCategory={vi.fn()}
        onAddCategory={vi.fn()}
        onEditCategory={vi.fn()}
      />
    );

    expect(screen.getByText("All Categories")).toBeInTheDocument();
    expect(screen.getByText("Starters")).toBeInTheDocument();
    expect(screen.getByText("Main Course")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });
});
