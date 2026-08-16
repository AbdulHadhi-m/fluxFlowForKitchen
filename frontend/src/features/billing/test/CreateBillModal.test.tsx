import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CreateBillModal } from "../components/CreateBillModal";
import { Order } from "@/features/orders/types/order.types";

describe("CreateBillModal Component", () => {
  const mockOrders: Order[] = [
    {
      id: "99999999-9999-9999-9999-999999999999",
      order_number: "ORD-000001",
      table: "table-1",
      table_name: "T04",
      created_by: "user-1",
      created_by_name: "John Waiter",
      status: "PLACED",
      status_display: "Placed",
      is_editable: false,
      subtotal: "50.00",
      total: "50.00",
      notes: "",
      items: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  it("renders CreateBillModal with order selector and discount options", () => {
    render(
      <CreateBillModal
        isOpen={true}
        onClose={vi.fn()}
        orders={mockOrders}
        onSubmit={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByText("Generate Bill / Invoice")).toBeInTheDocument();
    expect(screen.getByText(/ORD-000001/i)).toBeInTheDocument();
    expect(screen.getByText("Discount Type")).toBeInTheDocument();
  });
});
