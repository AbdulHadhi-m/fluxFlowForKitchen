# Fluxiflow for Kitchen — Authentication & Session Architecture

---

## 1. Authentication Strategy Overview
- **Protocol**: JWT over HTTPS with dual Access & Refresh token rotation.
- **Identity Field**: Case-insensitive normalized Email.
- **Access Token Lifetime**: 15 minutes (in-memory only).
- **Refresh Token Lifetime**: 7 days (stored in `HttpOnly`, `SameSite=Lax`, `Secure` cookie).
- **Password Storage**: Argon2 / PBKDF2 with SHA-256 via Django default password hashers.

---

## 2. Session Model & Replay Protection

```
Client Login ────────► UserSession created with hash(refresh_token)
                           │
                           ▼
Token Refresh Request ──► Compare hash(received_token) with Session
                           │ Valid
                           ▼
                      Rotate: Issue new refresh_token
                      Update: Session.refresh_token_hash = hash(new_refresh_token)
                      Return: New access_token + refreshed cookie
```
- **Replay Protection**: If an old refresh token is reused, the session hash does not match, instantly returning `401 Unauthorized`.
- **Remote Logout**: Terminating a session marks `is_revoked = True` in the database, blocking all subsequent refresh attempts from that device.

---

## 3. Account Lockout Policy
- **Threshold**: 5 consecutive failed login attempts.
- **Lockout Window**: 15 minutes.
- **Reset**: Successful authentication immediately clears the failed counter and unlocks the account.

---

## 4. Anti-Enumeration & Password Reset
- `POST /api/v1/auth/forgot-password/` always returns `200 OK` with a generic message:
  *"If an account exists with this email, password reset instructions have been dispatched."*
- Reset tokens are cryptographically random 32-byte tokens, hashed with SHA-256 in the database, expire in 15 minutes, and are single-use only.
- Consuming a reset token revokes all existing device sessions for the account.

---

## 5. API Endpoint Reference

| Method | Endpoint | Description | Auth Required | Throttle |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login/` | Authenticate user & issue tokens | No | 60/min |
| `POST` | `/api/v1/auth/refresh/` | Rotate & refresh access token | No (Cookie) | None |
| `POST` | `/api/v1/auth/logout/` | Revoke current session | Yes | None |
| `GET` | `/api/v1/auth/me/` | Fetch current user profile | Yes | None |
| `GET` | `/api/v1/auth/sessions/` | List active sessions | Yes | None |
| `DELETE`| `/api/v1/auth/sessions/{id}/` | Revoke specific session | Yes | None |
| `DELETE`| `/api/v1/auth/sessions/other/` | Revoke all other sessions | Yes | None |
| `POST` | `/api/v1/auth/forgot-password/`| Trigger password reset email | No | 60/min |
| `POST` | `/api/v1/auth/reset-password/` | Set new password with token | No | 60/min |
