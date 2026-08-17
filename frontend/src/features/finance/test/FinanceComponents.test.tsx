import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OpenCashSessionModal } from "../components/OpenCashSessionModal";
import { CreateExpenseModal } from "../components/CreateExpenseModal";
import { CloseCashSessionModal } from "../components/CloseCashSessionModal";
import { CashSession } from "../types/finance.types";

const queryClient = new QueryClient();

const mockSession: CashSession = {
  id: "session-1",
  register_name: "Front Counter POS #1",
  opened_by: "user-1",
  opened_by_name: "Luigi",
  closed_by: null,
  closed_by_name: null,
  approved_by: null,
  approved_by_name: null,
  opened_at: "2026-08-17T09:00:00Z",
  closed_at: null,
  opening_balance: "200.00",
  cash_sales: "150.00",
  cash_payouts: "25.00",
  cash_refunds: "0.00",
  expected_cash: "325.00",
  counted_cash: null,
  variance: "0.00",
  status: "OPEN",
  notes: "",
  approval_notes: "",
  transactions: [],
  created_at: "2026-08-17T09:00:00Z",
  updated_at: "2026-08-17T09:00:00Z",
};

describe("Finance Cash & Expense Components", () => {
  it("renders OpenCashSessionModal fields", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <OpenCashSessionModal isOpen={true} onClose={vi.fn()} />
      </QueryClientProvider>
    );

    expect(screen.getByText("Open Cash Drawer Session")).toBeInTheDocument();
    expect(screen.getByText("Starting Cash Float ($)")).toBeInTheDocument();
  });

  it("renders CloseCashSessionModal with expected cash calculations", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <CloseCashSessionModal session={mockSession} isOpen={true} onClose={vi.fn()} />
      </QueryClientProvider>
    );

    expect(screen.getByText("Close & Reconcile Drawer")).toBeInTheDocument();
    expect(screen.getByText(/Expected Cash in Drawer:/i)).toBeInTheDocument();
    expect(screen.getByText("Actual Counted Cash ($)")).toBeInTheDocument();
  });

  it("renders CreateExpenseModal with operational expense categories", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <CreateExpenseModal isOpen={true} onClose={vi.fn()} />
      </QueryClientProvider>
    );

    expect(screen.getByText("Record Operating Expense")).toBeInTheDocument();
    expect(screen.getByText("Expense Category")).toBeInTheDocument();
    expect(screen.getByText("Vendor / Payee")).toBeInTheDocument();
  });
});
