export interface HealthDependencies {
  database: string;
  redis: string;
}

export interface HealthData {
  status: "healthy" | "degraded" | "unhealthy";
  service: string;
  version: string;
  timestamp: string;
  dependencies: HealthDependencies;
}

export interface HealthResponse {
  success: boolean;
  data: HealthData;
}
