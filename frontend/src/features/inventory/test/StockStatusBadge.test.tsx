import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StockStatusBadge } from "../components/StockStatusBadge";

describe("StockStatusBadge Component", () => {
  it("renders In Stock badge properly", () => {
    render(<StockStatusBadge status="IN_STOCK" />);
    expect(screen.getByText("In Stock")).toBeInTheDocument();
  });

  it("renders Low Stock alert badge properly", () => {
    render(<StockStatusBadge status="LOW_STOCK" />);
    expect(screen.getByText("Low Stock")).toBeInTheDocument();
  });

  it("renders Out of Stock badge properly", () => {
    render(<StockStatusBadge status="OUT_OF_STOCK" />);
    expect(screen.getByText("Out of Stock")).toBeInTheDocument();
  });
});
