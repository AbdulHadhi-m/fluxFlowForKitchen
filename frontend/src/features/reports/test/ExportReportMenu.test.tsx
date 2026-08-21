import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExportReportMenu } from "../components/ExportReportMenu";

describe("ExportReportMenu Component", () => {
  it("renders export button and opens dropdown menu options", () => {
    render(
      <ExportReportMenu
        preset="LAST_7_DAYS"
        dashboardData={{
          sales: {
            gross_sales: "6840.00",
            net_sales: "6424.00",
            total_paid: "6424.00",
            balance_due: "0.00",
            average_order_value: "6424.00",
            total_bills: 1,
          },
          orders: {
            total_orders: 5,
            completed_orders: 2,
            cancelled_orders: 0,
            active_orders: 3,
            completion_rate: 40,
          },
          payments: [
            { payment_method: "CARD", total_amount: "6424.00", count: 1, percentage: "100.0" },
          ],
          inventory: {
            total_items: 12,
            in_stock: 12,
            low_stock: 0,
            out_of_stock: 0,
          },
          procurement: {
            open_purchase_orders: 0,
            pending_approval: 0,
          },
        }}
      />
    );

    const exportBtn = screen.getByRole("button", { name: /Export/i });
    expect(exportBtn).toBeInTheDocument();

    fireEvent.click(exportBtn);

    expect(screen.getByText(/Excel Workbook/i)).toBeInTheDocument();
    expect(screen.getByText(/Daily Sales Trend/i)).toBeInTheDocument();
    expect(screen.getByText(/Top-Selling Menu Items/i)).toBeInTheDocument();
    expect(screen.getByText(/Payment Settlements/i)).toBeInTheDocument();
  });
});
