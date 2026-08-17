import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  RequisitionStatusBadge,
  RequisitionPriorityBadge,
} from "../components/RequisitionStatusBadge";

describe("RequisitionStatusBadge Component", () => {
  it("renders draft and submitted requisition badges", () => {
    const { rerender } = render(<RequisitionStatusBadge status="DRAFT" />);
    expect(screen.getByText("Draft")).toBeInTheDocument();

    rerender(<RequisitionStatusBadge status="SUBMITTED" />);
    expect(screen.getByText("Submitted")).toBeInTheDocument();

    rerender(<RequisitionStatusBadge status="APPROVED" />);
    expect(screen.getByText("Approved")).toBeInTheDocument();

    rerender(<RequisitionStatusBadge status="CONVERTED_TO_PO" />);
    expect(screen.getByText("PO Generated")).toBeInTheDocument();
  });

  it("renders priority badges correctly", () => {
    const { rerender } = render(<RequisitionPriorityBadge priority="NORMAL" />);
    expect(screen.getByText("Normal")).toBeInTheDocument();

    rerender(<RequisitionPriorityBadge priority="EMERGENCY" />);
    expect(screen.getByText("Emergency")).toBeInTheDocument();
  });
});
