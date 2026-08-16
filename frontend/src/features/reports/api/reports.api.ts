import { apiClient } from "@/lib/api-client";
import {
  DatePreset,
  DashboardSummaryData,
  SalesReportData,
  PaymentBreakdownItem,
  PopularMenuItem,
} from "../types/reports.types";

export const reportsApi = {
  async getDashboardSummary(
    preset: DatePreset = "LAST_7_DAYS",
    startDate?: string,
    endDate?: string
  ): Promise<{ success: boolean; data: DashboardSummaryData }> {
    const params = {
      preset,
      ...(startDate ? { start_date: startDate } : {}),
      ...(endDate ? { end_date: endDate } : {}),
    };
    const response = await apiClient.get<{ success: boolean; data: DashboardSummaryData }>(
      "/reports/dashboard/",
      { params }
    );
    return response.data;
  },

  async getSalesReport(
    preset: DatePreset = "LAST_7_DAYS",
    startDate?: string,
    endDate?: string
  ): Promise<{ success: boolean; data: SalesReportData }> {
    const params = {
      preset,
      ...(startDate ? { start_date: startDate } : {}),
      ...(endDate ? { end_date: endDate } : {}),
    };
    const response = await apiClient.get<{ success: boolean; data: SalesReportData }>(
      "/reports/sales/",
      { params }
    );
    return response.data;
  },

  async getPaymentReport(
    preset: DatePreset = "LAST_7_DAYS",
    startDate?: string,
    endDate?: string
  ): Promise<{ success: boolean; data: { total_amount: string; total_transactions: number; breakdown: PaymentBreakdownItem[] } }> {
    const params = {
      preset,
      ...(startDate ? { start_date: startDate } : {}),
      ...(endDate ? { end_date: endDate } : {}),
    };
    const response = await apiClient.get<{
      success: boolean;
      data: { total_amount: string; total_transactions: number; breakdown: PaymentBreakdownItem[] };
    }>("/reports/payments/", { params });
    return response.data;
  },

  async getPopularMenuItems(
    preset: DatePreset = "LAST_7_DAYS",
    startDate?: string,
    endDate?: string,
    limit: number = 10
  ): Promise<{ success: boolean; data: PopularMenuItem[] }> {
    const params = {
      preset,
      limit,
      ...(startDate ? { start_date: startDate } : {}),
      ...(endDate ? { end_date: endDate } : {}),
    };
    const response = await apiClient.get<{ success: boolean; data: PopularMenuItem[] }>(
      "/reports/menu/popular/",
      { params }
    );
    return response.data;
  },
};
