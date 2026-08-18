export interface SecurityDashboardMetrics {
  failed_logins_24h: number;
  successful_logins_24h: number;
  active_sessions: number;
  total_staff: number;
  mfa_enabled_count: number;
  mfa_adoption_percent: number;
  open_incidents: number;
  permission_denials_24h: number;
  suspicious_alerts: Array<{
    rule: string;
    email?: string;
    ip_address?: string;
    user_id?: string;
    count: number;
    window_minutes: number;
  }>;
}

export interface SecurityEventItem {
  id: string;
  event_type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  user_email: string;
  ip_address: string;
  correlation_id: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface MFADeviceInfo {
  id: string;
  is_verified: boolean;
  is_active: boolean;
  verified_at: string | null;
  last_used_at: string | null;
  remaining_recovery_codes: number;
  created_at: string;
}

export interface MFASetupResponse {
  secret: string;
  provisioning_uri: string;
  device: MFADeviceInfo;
}

export interface MFAVerifyResponse {
  device: MFADeviceInfo;
  recovery_codes: string[];
  message: string;
}

export interface SecurityPolicyData {
  id?: string;
  password_min_length: number;
  password_require_uppercase: boolean;
  password_require_number: boolean;
  password_require_special: boolean;
  password_reject_common: boolean;
  mfa_required_for_admins: boolean;
  mfa_required_for_all: boolean;
  session_timeout_minutes: number;
  max_concurrent_sessions: number;
  max_failed_login_attempts: number;
  lockout_duration_minutes: number;
  notify_on_failed_logins: boolean;
  failed_login_alert_threshold: number;
  notify_on_privilege_changes: boolean;
  notify_on_mfa_changes: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SecurityIncidentItem {
  id: string;
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "INVESTIGATING" | "CONTAINED" | "RESOLVED" | "CLOSED";
  reported_by_email: string;
  assigned_to_email: string;
  affected_user_email: string;
  notes: Array<{
    timestamp: string;
    author: string;
    text: string;
    status_change?: string;
  }>;
  actions_taken: Array<{
    timestamp: string;
    author: string;
    action: string;
  }>;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccessReviewUser {
  user_id: string;
  email: string;
  full_name: string;
  active_role: string | null;
  mfa_enabled: boolean;
  active_sessions: number;
  last_login: string | null;
  is_active: boolean;
}

export interface DataRetentionPolicyItem {
  id: string;
  category: string;
  retention_days: number;
  is_active: boolean;
  auto_delete: boolean;
  created_at: string;
  updated_at: string;
}
