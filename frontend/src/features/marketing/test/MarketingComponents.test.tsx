import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PromotionStatusBadge } from "../components/PromotionStatusBadge";
import { MarketingMetricsCards } from "../components/MarketingMetricsCards";
import { TopPromotionsTable } from "../components/TopPromotionsTable";

const queryClient = new QueryClient();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <MemoryRouter>{children}</MemoryRouter>
  </QueryClientProvider>
);

describe("Marketing Components", () => {
  it("renders PromotionStatusBadge correctly for all statuses", () => {
    const { rerender } = render(<PromotionStatusBadge status="ACTIVE" />);
    expect(screen.getByText("ACTIVE")).toBeDefined();

    rerender(<PromotionStatusBadge status="PAUSED" />);
    expect(screen.getByText("PAUSED")).toBeDefined();

    rerender(<PromotionStatusBadge status="DRAFT" />);
    expect(screen.getByText("DRAFT")).toBeDefined();
  });

  it("renders MarketingMetricsCards with analytics figures", () => {
    const mockAnalytics = {
      active_promotions_count: 5,
      active_coupons_count: 12,
      total_campaigns_count: 3,
      total_segments_count: 4,
      total_redemptions: 48,
      total_discount_given: "340.50",
      promotional_revenue_influenced: "1850.00",
      top_promotions: [],
      top_coupons: [],
    };

    render(<MarketingMetricsCards analytics={mockAnalytics} />, { wrapper });
    expect(screen.getByText("Active Promotions")).toBeDefined();
    expect(screen.getByText("5")).toBeDefined();
    expect(screen.getByText("₹340.50")).toBeDefined();
    expect(screen.getByText("₹1850.00")).toBeDefined();
  });

  it("renders TopPromotionsTable with ranked promotion items", () => {
    const mockAnalytics = {
      active_promotions_count: 2,
      active_coupons_count: 2,
      total_campaigns_count: 1,
      total_segments_count: 1,
      total_redemptions: 15,
      total_discount_given: "120.00",
      promotional_revenue_influenced: "600.00",
      top_promotions: [
        {
          id: "p1",
          name: "Happy Hour 20%",
          type: "PERCENTAGE_DISCOUNT" as const,
          redemptions: 12,
          total_discount: "90.00",
        },
      ],
      top_coupons: [
        {
          id: "c1",
          code: "SUMMER20",
          promotion_name: "Happy Hour 20%",
          redemptions: 10,
          total_discount: "75.00",
        },
      ],
    };

    render(<TopPromotionsTable analytics={mockAnalytics} />, { wrapper });
    expect(screen.getByText("Top Performing Promotions")).toBeDefined();
    expect(screen.getAllByText("Happy Hour 20%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("SUMMER20")).toBeDefined();
    expect(screen.getByText("12 uses")).toBeDefined();
  });
});
