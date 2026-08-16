import { apiClient } from "@/lib/api-client";
import { HealthResponse } from "@/types/health.types";

export const healthService = {
  async getHealth(): Promise<HealthResponse> {
    const response = await apiClient.get<HealthResponse>("/health/");
    return response.data;
  },
};
