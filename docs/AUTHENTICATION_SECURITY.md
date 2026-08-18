# Authentication Security — Fluxiflow for Kitchen

## 1. Authentication Lifecycle

```
[Client] ──── POST /api/v1/auth/login/ ───► [Auth Service]
                                                  │
                                            Verify Password
                                            Check Lockout Status
                                                  │
[Client] ◄── 200 OK + JWT (Body) + Cookie ────────┤ (Creates UserSession in DB)
           (Access Token in memory)
           (Refresh Token HttpOnly Cookie)
```

### 1.1 Token Management
- **Access Tokens**: Short-lived (15 minutes). Transmitted via `Authorization: Bearer <token>` header. Stored solely in browser client memory (Zustand state).
- **Refresh Tokens**: Long-lived (7 days). Stored in an `HttpOnly`, `SameSite=Lax`, `Secure` cookie scoped strictly to `/api/v1/auth/refresh/`.
- **Token Rotation**: Every refresh request rotates the token hash in the database, invalidating the previous token.

### 1.2 Session Revocation & Validation
Unlike standard stateless JWTs, Fluxiflow enforces stateful session checks via `SessionValidatingJWTAuthentication`:
1. The JWT payload embeds the unique `session_id`.
2. On every incoming API request, the authentication backend queries `UserSession`.
3. If `is_revoked == True` or `expires_at < now()`, the request is immediately rejected with HTTP 401.
4. When a user logs out, resets their password, or an admin revokes their sessions, `UserSession.is_revoked` is set to `True`, instantly terminating access across all devices.

## 2. Multi-Factor Authentication (MFA)
- **Standard**: RFC 6238 Time-Based One-Time Password (TOTP) algorithm.
- **Secret Encryption**: Stored using Fernet symmetric encryption with environment-derived or configured keys.
- **Recovery Codes**: 10 single-use recovery codes generated on activation, stored as one-way SHA-256 hashes.
- **Step-Up Authentication**: Critical actions (MFA disabling, bank account edits, role promotions) require password confirmation or recent authentication (`RequireRecentAuth`).

## 3. Account Protection & Lockout
- **Threshold**: 5 consecutive failed login attempts locks the account for 15 minutes.
- **Tracking**: Failures are tracked both on the `User` model and in `LoginAttemptLog` for anomaly detection.
- **Password Reset**: Cryptographic random tokens with 15-minute validity, single-use enforcement, and full session termination upon completion.
