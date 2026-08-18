# Security Architecture — Fluxiflow for Kitchen

## 1. Architectural Layers & Defense-in-Depth

```
                     ┌──────────────────────────────────────────────┐
                     │            Clients & Browsers                │
                     └──────────────────────┬───────────────────────┘
                                            │ HTTPS / WSS
                                            ▼
                     ┌──────────────────────────────────────────────┐
                     │             Reverse Proxy (Nginx)            │
                     │  - Rate Limiting Zones                       │
                     │  - Body Size Caps (15MB)                     │
                     │  - Security Headers (HSTS, CSP, etc.)        │
                     └──────────────────────┬───────────────────────┘
                                            │ Internal Network
                                            ▼
                     ┌──────────────────────────────────────────────┐
                     │           Django / DRF Application           │
                     │  - CorrelationIDMiddleware                   │
                     │  - SecurityHeadersMiddleware                 │
                     │  - Authentication & Session Validation       │
                     │  - SecureTenantContextMiddleware             │
                     │  - Granular RBAC Permissions Check           │
                     │  - Custom Exception Handler (No Leaks)       │
                     └──────────────────────┬───────────────────────┘
                                            │
                     ┌──────────────────────┴───────────────────────┐
                     ▼                                              ▼
       ┌───────────────────────────┐                  ┌───────────────────────────┐
       │   PostgreSQL (Multi-Tenant)│                 │   Redis (Channels & Auth) │
       │   - TenantScoped Managers │                  │   - Redis password / auth │
       │   - Immutable Audit Logs  │                  │   - Ephemeral cache data  │
       │   - Encrypted MFA Secrets │                  └───────────────────────────┘
       └───────────────────────────┘
```

## 2. Cross-Cutting Security Layer (`apps/security`)
The `apps/security` application acts as the governance and monitoring layer:
- **`SecurityEvent`**: Append-only log recording security events (login success/failure, lockouts, password resets, MFA status changes, privilege adjustments).
- **`MFADevice` & `MFARecoveryCode`**: Manages TOTP credentials. Seeds are encrypted using Fernet keys; backup codes are stored as SHA-256 hashes.
- **`SecurityPolicy`**: Per-tenant configurable password rules, session timeouts, and lockout parameters.
- **`SecurityIncident`**: Incident response workflow model tracking triage, containment, notes, and resolution.
- **`DataRetentionPolicy`**: Automated data cleanup rules per tenant.

## 3. Threat Modeling & Mitigation Summary

| Threat | Potential Impact | Fluxiflow Architectural Mitigation |
|---|---|---|
| Tenant Data Leakage | Cross-tenant data exposure | Strict `TenantAwareModel` query scoping + `SecureTenantContextMiddleware` membership validation |
| Credential Stuffing / Brute Force | Account takeover | 5-attempt threshold lockout, rate limiting (`PublicAuthThrottle`), suspicious activity detection |
| Session Hijacking | Unauthorized API operations | In-memory JWT access token, HttpOnly/SameSite/Secure refresh cookie, server-side `UserSession` state check on every request |
| Privilege Escalation | Unauthorized administrative actions | Server-side RBAC validation with active role scoping; client cannot alter permissions claim |
| Server-Side Request Forgery (SSRF) | Internal network port scanning | `SSRFValidator` blocks loopback, RFC 1918 private IPs, and cloud metadata addresses |
| Malicious File Upload | Remote code execution | `FileUploadValidator` blocks executable extensions, enforces filename sanitization and size caps |
| Information Leakage via Stack Traces | Reconnaissance | `custom_exception_handler` formats all 500 errors into sanitized JSON with correlation IDs |
