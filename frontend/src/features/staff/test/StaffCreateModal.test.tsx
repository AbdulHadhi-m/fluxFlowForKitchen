import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRoleStore } from "@/features/authorization/store/roleStore";
import { StaffCreateModal } from "../components/StaffCreateModal";

const queryClient = new QueryClient();

describe("StaffCreateModal Component", () => {
  it("renders modal form with primary role selector and inputs", () => {
    useRoleStore.getState().setRoleContext(
      { id: "r-1", name: "Restaurant Admin", code: "RESTAURANT_ADMIN", description: "", is_system: true },
      [
        { id: "r-1", name: "Restaurant Admin", code: "RESTAURANT_ADMIN", description: "", is_system: true },
        { id: "r-2", name: "Floor Waiter", code: "WAITER", description: "", is_system: true },
        { id: "r-3", name: "POS Cashier", code: "CASHIER", description: "", is_system: true },
      ],
      ["staff.create"]
    );

    render(
      <QueryClientProvider client={queryClient}>
        <StaffCreateModal isOpen={true} onClose={vi.fn()} />
      </QueryClientProvider>
    );

    expect(screen.getByText("Add Staff Member")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("staff@restaurant.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create Staff Account/i })).toBeInTheDocument();
  });
});
