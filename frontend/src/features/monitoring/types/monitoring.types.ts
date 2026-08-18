export type ErrorSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ErrorStatus = "NEW" | "ACKNOWLEDGED" | "INVESTIGATING" | "RESOLVED" | "IGNORED";
export type ErrorModule = "api" | "celery" | "workflow" | "database" | "notification" | "webhook" | "integration" | "frontend" | "security" | "other";
export type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
export type IncidentStatus = "OPEN" | "INVESTIGATING" | "RESOLVED" | "CLOSED";

export interface ErrorEvent {
  id: string;
  fingerprint: string;
  error_type: string;
  message: string;
  module: ErrorModule;
  endpoint: string;
  severity: ErrorSeverity;
  status: ErrorStatus;
  count: number;
  first_seen: string;
  last_seen: string;
  environment: string;
  version: string;
  restaurant: string | null;
  correlation_id: string;
  metadata: Record<string, unknown>;
}

export interface RequestSummary {
  total: number;
  errors: number;
  error_rate: number;
  by_class: Record<string, number>;
}

export interface LatencyStats {
  p50?: number;
  p95?: number;
  p99?: number;
  samples?: number;
}

export interface MonitoringOverview {
  scope: "restaurant" | "system";
  status: string;
  version: { version: string; commit_sha: string; build_timestamp: string; environment: string };
  uptime_seconds: number;
  requests: RequestSummary;
  latency: LatencyStats;
  errors: { count: number; new?: number; critical?: number; high?: number; by_module?: Array<{ module: string; total: number }> };
  jobs: { tasks: CeleryStats } | null;
  alerts: { active: number; acknowledged: number; critical: number };
  incidents: { open: number; recent: IncidentSummary[] };
  incident_metrics: IncidentMetrics | null;
  dependencies: Record<string, { status: string; latency_ms: number; critical: boolean; workers?: number }> | null;
}

export interface IncidentSummary {
  id: string;
  title: string;
  severity: ErrorSeverity;
  status: IncidentStatus;
  affected_service: string;
  detected_at: string;
  mtta_minutes: number | null;
  mttr_minutes: number | null;
}

export interface IncidentDetail extends IncidentSummary {
  description: string;
  source_alert: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  mtta_minutes: number | null;
  mttr_minutes: number | null;
  resolution_notes: string;
  timeline: Array<{ timestamp: string; type: string; actor: string; text: string }>;
}

export interface IncidentMetrics {
  window_days: number;
  incident_count: number;
  open_count: number;
  mtta_minutes: number | null;
  mttr_minutes: number | null;
  by_severity: Record<string, number>;
}

export interface CeleryStats {
  total: number;
  success: number;
  failed: number;
  failure_rate: number;
  retried: number;
}

export interface CeleryTaskRow {
  task_name: string;
  status: string;
  correlation_id: string;
  started_at: string;
}

export interface JobsData {
  workers: { status: string; workers: number };
  queue: { name: string; depth: number; oldest_seconds: number; status: string };
  tasks: CeleryStats;
  stuck: { count: number; threshold_minutes: number; recent: CeleryTaskRow[] };
}

export interface ExternalMetricRow {
  service: string;
  total: number;
  failed: number;
  failure_rate: number;
}

export interface IntegrationsData {
  external: ExternalMetricRow[];
  webhooks: { total: number; success_rate: number; failed: number };
  websockets: { active_by_type: Record<string, number>; total_connections: number; status: string };
}

export interface AlertRule {
  id: string;
  name: string;
  code: string;
  description: string;
  service: string;
  metric_type: string;
  operator: string;
  threshold: number;
  window_minutes: number;
  severity: ErrorSeverity;
  cooldown_minutes: number;
  auto_resolve_minutes: number;
  create_incident: boolean;
  is_active: boolean;
}

export interface Alert {
  id: string;
  rule: string;
  rule_code?: string;
  status: AlertStatus;
  severity: ErrorSeverity;
  title: string;
  message: string;
  metric_value: number | null;
  trigger_count: number;
  first_triggered_at: string;
  last_triggered_at: string;
  resolved_at: string | null;
  resolution_note: string;
  acknowledged_at: string | null;
  incident: string | null;
}

export interface ServiceSLO {
  id: string;
  name: string;
  code: string;
  description: string;
  service: string;
  slo_type: string;
  target: number;
  window_days: number;
  is_contractual: boolean;
  is_active: boolean;
  latest_sli: number | null;
  latest_error_budget_remaining: number | null;
  evaluated_at: string | null;
}

export interface MonitoringConfig {
  id: string;
  metrics_enabled: boolean;
  request_logging_enabled: boolean;
  latency_sample_rate: number;
  slow_query_threshold_ms: number;
  error_min_status: number;
  celery_stuck_threshold_minutes: number;
  retention_days: Record<string, number>;
}

export interface HealthDependency {
  status: string;
  latency_ms: number;
  critical: boolean;
  workers?: number;
  details?: string;
  error?: string;
}

export interface HealthData {
  status: string;
  ready: boolean;
  version: { version: string; commit_sha: string; environment: string };
  checked_at: string;
  uptime_seconds?: number;
  dependencies: Record<string, HealthDependency>;
}

export interface DatabaseStats {
  slow_queries: { total: number; p95_ms: number | null; recent: Array<{ signature: string; duration_ms: number; count: number; last_seen: string }> };
}

export interface WorkflowStats {
  total: number;
  completed: number;
  failed: number;
  failure_rate: number;
  running: number;
  waiting: number;
  timed_out: number;
  avg_duration_ms: number | null;
}

export interface NotificationStats {
  total: number;
  sent: number;
  failed: number;
  failure_rate: number;
  by_channel: Array<{ channel: string; total: number; failed: number }>;
}

export interface MetricsData {
  requests: RequestSummary;
  latency: LatencyStats;
  top_slow_endpoints: Array<{ endpoint: string; total: number; error_rate: number; avg_duration_ms: number; max_duration_ms: number }>;
}