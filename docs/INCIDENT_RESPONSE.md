# Security Incident Response Plan (SIRT) — Fluxiflow for Kitchen

## 1. Incident Lifecycle Overview

```
 ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
 │  Detection   │ ──► │    Triage    │ ──► │ Containment  │ ──► │  Remediation │ ──► │ Post-Mortem  │
 │ & Reporting  │     │ & Assessment │     │ & Mitigation │     │ & Recovery   │     │  & Lessons   │
 └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

## 2. Phase 1: Detection & Reporting
Incidents are detected through:
- Automated anomaly detection (`SuspiciousActivityDetector` Celery tasks)
- Brute-force account lockout alerts (`ACCOUNT_LOCKED` events)
- Administrative reports via the Security Incidents UI (`/security/incidents`)
- External vulnerability disclosure emails to `security@fluxiflow.com`

## 3. Phase 2: Triage & Severity Classification

| Severity | Definition | Response Target | Example |
|---|---|---|---|
| **P1 - Critical** | Active data breach, remote code execution, or total service compromise. | < 30 Minutes | Unauthorized access to multi-tenant database records. |
| **P2 - High** | Privileged account takeover, credential exposure, or severe authentication flaw. | < 2 Hours | Compromised manager account without MFA. |
| **P3 - Medium** | Localized privilege escalation, repetitive brute force attacks, or rate-limit bypass. | < 8 Hours | Excessive failed logins against single staff account. |
| **P4 - Low** | Minor security misconfiguration or informational alert. | < 24 Hours | Missing header on non-critical static resource. |

## 4. Phase 3: Containment & Mitigation
- **Session Revocation**: Admin terminates all active sessions for the affected user via `/api/v1/security/admin/sessions/<id>/revoke/`.
- **Account Disablement**: The affected user account is set to `is_active=False`.
- **Credential Rotation**: All associated JWT refresh tokens and API credentials are invalidated immediately.
- **IP Blocking**: Malicious IP addresses are blocked at the Nginx reverse proxy level.

## 5. Phase 4: Remediation & Recovery
- Patch the root vulnerability.
- Verify data integrity against immutable audit logs.
- Assist the restaurant administrator with secure credential resets and mandatory 2FA enrollment.

## 6. Phase 5: Post-Incident Review
- Create a post-mortem incident report documenting timeline, root cause, impact, and preventive action items.
- Update security detection rules to prevent recurrence.
