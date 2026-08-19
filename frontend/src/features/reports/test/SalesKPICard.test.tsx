import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SalesKPICard } from "../components/SalesKPICard";
import { IndianRupee } from "lucide-react";

describe("SalesKPICard Component", () => {
  it("renders metric title, value, and subtitle", () => {
    render(
      <SalesKPICard
        title="Net Revenue"
        value="₹1,240.50"
        subtitle="Gross: $1,300.00"
        icon={IndianRupee}
      />
    );

    expect(screen.getByText("Net Revenue")).toBeInTheDocument();
    expect(screen.getByText("₹1,240.50")).toBeInTheDocument();
    expect(screen.getByText("Gross: $1,300.00")).toBeInTheDocument();
  });
});
