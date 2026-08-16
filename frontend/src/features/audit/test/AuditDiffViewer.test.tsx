import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuditDiffViewer } from "../components/AuditDiffViewer";

describe("AuditDiffViewer Component", () => {
  it("renders diff comparing before and after properties", () => {
    render(
      <AuditDiffViewer
        beforeData={{ price: "10.00", status: "PENDING" }}
        afterData={{ price: "15.00", status: "CONFIRMED" }}
      />
    );

    expect(screen.getByText("price")).toBeInTheDocument();
    expect(screen.getByText('"10.00"')).toBeInTheDocument();
    expect(screen.getByText('"15.00"')).toBeInTheDocument();
  });
});
