import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PaymentModal } from "../components/PaymentModal";
import { Bill } from "../types/billing.types";

describe("PaymentModal Component", () => {
  const mockBill: Bill = {
    id: "bill-1",
    bill_number: "BILL-000001",
    order_id: "order-1",
    order_number: "ORD-000001",
    table_name: "T04",
    cashier_name: "Alice Cashier",
    status: "FINALIZED",
    status_display: "Finalized",
    subtotal: "50.00",
    discount_type: "NONE",
    discount_value: "0.00",
    discount_amount: "0.00",
    service_charge_rate: "0.00",
    service_charge_amount: "0.00",
    tax_rate_snapshot: "5.00",
    tax_amount: "2.50",
    rounding_adjustment: "0.00",
    grand_total: "52.50",
    total_paid: "0.00",
    balance_due: "52.50",
    notes: "",
    items: [],
    payments: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it("renders PaymentModal with balance due and tender buttons", () => {
    render(
      <PaymentModal
        isOpen={true}
        onClose={vi.fn()}
        bill={mockBill}
        onSubmit={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByText("Process Payment — BILL-000001")).toBeInTheDocument();
    expect(screen.getByText("₹52.50")).toBeInTheDocument();
    expect(screen.getByText("Cash")).toBeInTheDocument();
    expect(screen.getByText("Card")).toBeInTheDocument();
    expect(screen.getByText("UPI / QR")).toBeInTheDocument();
  });
});
