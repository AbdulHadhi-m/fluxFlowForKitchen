import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReceiveGoodsModal } from "../components/ReceiveGoodsModal";
import { CreateReturnModal } from "../components/CreateReturnModal";
import { CreateBudgetModal } from "../components/CreateBudgetModal";
import { PurchaseOrder } from "../types/procurement.types";

const queryClient = new QueryClient();

const mockPO: PurchaseOrder = {
  id: "po-123",
  po_number: "PO-000100",
  supplier: "sup-1",
  supplier_name: "Tuscan Farms",
  supplier_code: "SUP-000001",
  status: "APPROVED",
  status_display: "Approved",
  version: 1,
  location: "MAIN_STORE" as any,
  currency: "USD",
  payment_terms: "NET_30",
  order_date: "2026-08-17",
  expected_delivery_date: "2026-08-19",
  subtotal: "200.00",
  tax_amount: "0.00",
  discount_amount: "0.00",
  total_amount: "200.00",
  acknowledgement_status: "PENDING",
  acknowledged_at: null,
  supplier_notes: "",
  notes: "Handle with care",
  created_by_name: "Chef",
  approved_by_name: "Manager",
  approved_at: "2026-08-17T12:00:00Z",
  sent_by_name: null,
  sent_at: null,
  items: [
    {
      id: "line-1",
      inventory_item: "item-1",
      item_name_snapshot: "San Marzano Tomatoes",
      inventory_item_sku: "TOM-001",
      quantity_ordered: "20.000",
      quantity_received: "0.000",
      remaining_quantity: "20.000",
      unit: "kg" as any,
      unit_cost: "10.00",
      line_total: "200.00",
    },
  ],
  receipts: [],
  revisions: [],
  created_at: "2026-08-17T10:00:00Z",
  updated_at: "2026-08-17T12:00:00Z",
};

describe("Procurement Modals & Workflows", () => {
  it("renders ReceiveGoodsModal with inspection fields", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ReceiveGoodsModal
          purchaseOrder={mockPO}
          isOpen={true}
          onClose={vi.fn()}
        />
      </QueryClientProvider>
    );

    expect(screen.getByText(/Receive Goods Intake/i)).toBeInTheDocument();
    expect(screen.getByText("San Marzano Tomatoes")).toBeInTheDocument();
    expect(screen.getByText(/Accepted Qty/i)).toBeInTheDocument();
    expect(screen.getByText(/Rejected Qty/i)).toBeInTheDocument();
  });

  it("renders CreateReturnModal with reason selection", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <CreateReturnModal isOpen={true} onClose={vi.fn()} />
      </QueryClientProvider>
    );

    expect(screen.getByText("Create Purchase Return")).toBeInTheDocument();
    expect(screen.getByText("Return Reason")).toBeInTheDocument();
  });

  it("renders CreateBudgetModal with period and allocation", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <CreateBudgetModal isOpen={true} onClose={vi.fn()} />
      </QueryClientProvider>
    );

    expect(screen.getByText("Create Procurement Budget")).toBeInTheDocument();
    expect(screen.getByText("Allocated Cap ($)")).toBeInTheDocument();
    expect(screen.getByText("Period")).toBeInTheDocument();
  });
});
