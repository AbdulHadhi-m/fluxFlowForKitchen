import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CustomerListTable } from "../components/CustomerListTable";

describe("CustomerListTable Component", () => {
  it("renders customer rows with contact, visits, and total spend", () => {
    const customers = [
      {
        id: "cust-1",
        first_name: "Eleanor",
        last_name: "Vance",
        full_name: "Eleanor Vance",
        phone: "+1555888999",
        email: "eleanor@hillhouse.com",
        gender: "FEMALE" as const,
        dietary_preferences: ["Vegetarian"],
        allergies: ["Peanuts"],
        tags: [{ id: "tag-1", name: "VIP", color: "purple", created_at: "" }],
        internal_notes: "",
        total_visits: 5,
        total_spend: "450.00",
        last_visit_at: "2026-08-16T12:00:00Z",
        is_active: true,
        created_at: "",
        updated_at: "",
      },
    ];

    render(<CustomerListTable customers={customers} />);

    expect(screen.getByText("Eleanor Vance")).toBeInTheDocument();
    expect(screen.getByText("+1555888999")).toBeInTheDocument();
    expect(screen.getByText("VIP")).toBeInTheDocument();
    expect(screen.getByText("₹450.00")).toBeInTheDocument();
  });
});
