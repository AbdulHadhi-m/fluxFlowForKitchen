import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotificationSeverityBadge } from "../components/NotificationSeverityBadge";

describe("NotificationSeverityBadge Component", () => {
  it("renders warning severity badge", () => {
    render(<NotificationSeverityBadge severity="WARNING" />);
    expect(screen.getByText("Warning")).toBeInTheDocument();
  });

  it("renders critical severity badge", () => {
    render(<NotificationSeverityBadge severity="CRITICAL" />);
    expect(screen.getByText("Critical")).toBeInTheDocument();
  });

  it("renders info severity badge", () => {
    render(<NotificationSeverityBadge severity="INFO" />);
    expect(screen.getByText("Info")).toBeInTheDocument();
  });
});
