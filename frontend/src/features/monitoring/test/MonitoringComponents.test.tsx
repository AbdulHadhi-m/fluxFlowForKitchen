import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeverityBadge, StatusBadge, HealthBadge } from "../components/MonitoringBadges";
import { MetricCard } from "../components/MetricCard";

describe("MonitoringBadges", () => {
  it("renders severity badge with severity label", () => {
    render(<SeverityBadge severity="CRITICAL" />);
    expect(screen.getByText("CRITICAL")).toBeInTheDocument();
  });

  it("renders status badge with status label", () => {
    render(<StatusBadge status="RESOLVED" />);
    expect(screen.getByText("RESOLVED")).toBeInTheDocument();
  });

  it("renders health badge with health label", () => {
    render(<HealthBadge status="HEALTHY" />);
    expect(screen.getByText("HEALTHY")).toBeInTheDocument();
  });
});

describe("MetricCard", () => {
  it("renders label and value", () => {
    render(<MetricCard label="Requests" value={42} sub="Errors: 2" />);
    expect(screen.getByText("Requests")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Errors: 2")).toBeInTheDocument();
  });

  it("applies bad tone for unhealthy values", () => {
    const { container } = render(<MetricCard label="Failure Rate" value="12.5%" tone="bad" />);
    expect(container.querySelector(".text-rose-600")).not.toBeNull();
  });
});