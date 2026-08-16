import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuditActionBadge } from "../components/AuditActionBadge";

describe("AuditActionBadge Component", () => {
  it("renders Create action badge", () => {
    render(<AuditActionBadge action="CREATE" />);
    expect(screen.getByText("Create")).toBeInTheDocument();
  });

  it("renders Failed Login action badge", () => {
    render(<AuditActionBadge action="LOGIN_FAILED" />);
    expect(screen.getByText("Failed Login")).toBeInTheDocument();
  });

  it("renders Update action badge", () => {
    render(<AuditActionBadge action="UPDATE" />);
    expect(screen.getByText("Update")).toBeInTheDocument();
  });
});
