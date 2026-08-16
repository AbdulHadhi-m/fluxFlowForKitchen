import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StaffListTable } from "../components/StaffListTable";
import { StaffMember } from "../types/staff.types";

describe("StaffListTable Component", () => {
  const mockStaffList: StaffMember[] = [
    {
      id: "staff-1",
      employee_id: "EMP-001",
      first_name: "Giovanni",
      last_name: "Ferrari",
      display_name: "Giovanni Ferrari",
      email: "giovanni@restaurant.com",
      phone: "+1 555-1122",
      primary_role: {
        id: "role-1",
        name: "Floor Waiter",
        code: "WAITER",
        description: "",
        is_system: true,
      },
      secondary_roles: [
        {
          id: "role-2",
          name: "POS Cashier",
          code: "CASHIER",
          description: "",
          is_system: true,
        },
      ],
      status: "ACTIVE",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  it("renders employee roster with role badges and contact information", () => {
    render(
      <StaffListTable
        staffList={mockStaffList}
        onEdit={vi.fn()}
        onDisable={vi.fn()}
        onReactivate={vi.fn()}
      />
    );

    expect(screen.getByText("Giovanni Ferrari")).toBeInTheDocument();
    expect(screen.getByText("EMP-001")).toBeInTheDocument();
    expect(screen.getByText("giovanni@restaurant.com")).toBeInTheDocument();
    expect(screen.getByText("Floor Waiter")).toBeInTheDocument();
    expect(screen.getByText("POS Cashier")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});
