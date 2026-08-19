import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "../api/reports.api";
import { DatePreset } from "../types/reports.types";
import { useAuthStore } from "@/features/auth/store/authStore";

export const useReports = (
  preset: DatePreset = "LAST_7_DAYS",
  startDate?: string,
  endDate?: string,
  enabled = true
) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const canFetch = enabled && isAuthenticated;

  const dashboardQuery = useQuery({
    queryKey: ["reportsDashboard", preset, startDate, endDate],
    queryFn: () => reportsApi.getDashboardSummary(preset, startDate, endDate),
    enabled: canFetch,
  });

  const salesReportQuery = useQuery({
    queryKey: ["reportsSales", preset, startDate, endDate],
    queryFn: () => reportsApi.getSalesReport(preset, startDate, endDate),
    enabled: canFetch,
  });

  const popularMenuQuery = useQuery({
    queryKey: ["reportsPopularMenu", preset, startDate, endDate],
    queryFn: () => reportsApi.getPopularMenuItems(preset, startDate, endDate),
    enabled: canFetch,
  });

  return {
    dashboardData: dashboardQuery.data?.data,
    isLoadingDashboard: dashboardQuery.isLoading,
    salesData: salesReportQuery.data?.data,
    isLoadingSales: salesReportQuery.isLoading,
    popularItems: popularMenuQuery.data?.data || [],
    isLoadingPopular: popularMenuQuery.isLoading,
  };
};
