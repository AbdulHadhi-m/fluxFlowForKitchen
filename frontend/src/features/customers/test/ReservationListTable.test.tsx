import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReservationListTable } from "../components/ReservationListTable";

describe("ReservationListTable Component", () => {
  it("renders reservation row and executes check-in action", () => {
    const handleUpdate = vi.fn();
    const reservations = [
      {
        id: "res-1",
        reservation_number: "RES-20260820-001",
        customer: "cust-1",
        customer_name: "Henry Jones",
        customer_phone: "+1222333444",
        table: "tbl-1",
        table_name: "T04",
        reservation_date: "2026-08-20",
        reservation_time: "19:30",
        party_size: 4,
        status: "CONFIRMED" as const,
        special_requests: "",
        cancellation_reason: "",
        created_at: "",
        updated_at: "",
      },
    ];

    render(
      <ReservationListTable
        reservations={reservations}
        onUpdateStatus={handleUpdate}
      />
    );

    expect(screen.getByText("RES-20260820-001")).toBeInTheDocument();
    expect(screen.getByText("Henry Jones")).toBeInTheDocument();
    expect(screen.getByText("T04")).toBeInTheDocument();

    const checkInBtn = screen.getByRole("button", { name: /Check In/i });
    fireEvent.click(checkInBtn);
    expect(handleUpdate).toHaveBeenCalledWith("res-1", "CHECKED_IN");
  });
});
