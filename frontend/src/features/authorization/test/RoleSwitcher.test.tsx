import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useRoleStore } from "../store/roleStore";
import { RoleSwitcher } from "../components/RoleSwitcher";

const queryClient = new QueryClient();

describe("RoleSwitcher Component", () => {
  beforeEach(() => {
    useAuthStore.getState().setAuth(
      {
        id: "u-1",
        email: "staff@fluxiflow.com",
        first_name: "Staff",
        last_name: "Member",
        full_name: "Staff Member",
        is_active: true,
        is_staff: false,
        last_login: null,
        created_at: new Date().toISOString(),
      },
      "fake-token"
    );

    useRoleStore.getState().setRoleContext(
      { id: "r-1", name: "Floor Waiter", code: "WAITER", description: "", is_system: true },
      [
        { id: "r-1", name: "Floor Waiter", code: "WAITER", description: "", is_system: true },
        { id: "r-2", name: "Store Manager", code: "MANAGER", description: "", is_system: true },
      ],
      ["orders.create"]
    );
  });

  it("renders the active role name", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <RoleSwitcher />
      </QueryClientProvider>
    );

    expect(screen.getByText("Floor Waiter")).toBeInTheDocument();
  });
});
