import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OperationalPoliciesForm } from "../components/OperationalPoliciesForm";

describe("OperationalPoliciesForm Component", () => {
  it("renders billing and KDS threshold settings form inputs", () => {
    render(
      <OperationalPoliciesForm
        initialData={{
          id: "cfg-1",
          allow_order_cancellation: true,
          cancellation_window_minutes: 10,
          require_order_confirmation: false,
          allow_table_orders: true,
          allow_takeaway: true,
          default_prep_time_minutes: 15,
          kds_warning_threshold_minutes: 15,
          kds_critical_threshold_minutes: 30,
          auto_refresh_interval_seconds: 15,
          tax_enabled: true,
          default_tax_rate: "5.00",
          tax_name: "GST / VAT",
          tax_registration_number: "",
          tax_inclusive_pricing: false,
          invoice_prefix: "INV",
          receipt_prefix: "RCP",
          invoice_footer_notes: "Thanks",
          allow_negative_stock: false,
          require_wastage_reason: true,
          low_stock_threshold_default: "10.00",
          po_approval_required: true,
          po_approval_threshold: "10000.00",
          default_delivery_lead_days: 3,
          inventory_alerts_enabled: true,
          order_alerts_enabled: true,
          procurement_alerts_enabled: true,
        }}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText("Billing & Tax Configuration")).toBeInTheDocument();
    expect(screen.getByText("Kitchen Display System (KDS) Parameters")).toBeInTheDocument();
    expect(screen.getByText("Procurement & Purchase Orders")).toBeInTheDocument();
  });
});
