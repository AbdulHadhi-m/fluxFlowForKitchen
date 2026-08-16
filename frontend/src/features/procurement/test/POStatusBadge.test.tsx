import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { POStatusBadge } from "../components/POStatusBadge";

describe("POStatusBadge Component", () => {
  it("renders Draft status badge correctly", () => {
    render(<POStatusBadge status="DRAFT" />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("renders Submitted status badge correctly", () => {
    render(<POStatusBadge status="SUBMITTED" />);
    expect(screen.getByText("Submitted")).toBeInTheDocument();
  });

  it("renders Approved status badge correctly", () => {
    render(<POStatusBadge status="APPROVED" />);
    expect(screen.getByText("Approved")).toBeInTheDocument();
  });

  it("renders Fully Received badge correctly", () => {
    render(<POStatusBadge status="RECEIVED" />);
    expect(screen.getByText("Fully Received")).toBeInTheDocument();
  });
});
