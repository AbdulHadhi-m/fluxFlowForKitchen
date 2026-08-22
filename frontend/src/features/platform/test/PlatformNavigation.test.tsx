import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SaasOwnerDashboardPanel } from "@/features/authorization/components/SaasOwnerDashboardPanel";

describe("SaaS Platform Owner Responsibilities & Restrictions", () => {
  it("renders all 8 SaaS Owner Platform Responsibilities", () => {
    render(
      <MemoryRouter>
        <SaasOwnerDashboardPanel />
      </MemoryRouter>
    );

    // 8 Core Responsibilities
    expect(screen.getByText("View All Restaurants")).toBeDefined();
    expect(screen.getByText("Monitor Subscriptions")).toBeDefined();
    expect(screen.getByText("Monitor System Health")).toBeDefined();
    expect(screen.getByText("View Platform Analytics")).toBeDefined();
    expect(screen.getByText("Impersonate Restaurant Users")).toBeDefined();
    expect(screen.getByText("Enable Feature Flags")).toBeDefined();
    expect(screen.getByText("View Audit Logs")).toBeDefined();
    expect(screen.getByText("Platform Maintenance")).toBeDefined();
  });

  it("renders Segregation of Duties and Operational Restrictions", () => {
    render(
      <MemoryRouter>
        <SaasOwnerDashboardPanel />
      </MemoryRouter>
    );

    // 4 Operational Restrictions
    expect(screen.getByText(/Cannot participate in restaurant operations/i)).toBeDefined();
    expect(screen.getByText(/Cannot create customer orders/i)).toBeDefined();
    expect(screen.getByText(/Cannot process payments/i)).toBeDefined();
    expect(screen.getByText(/Cannot modify operational data while impersonating/i)).toBeDefined();
  });
});
