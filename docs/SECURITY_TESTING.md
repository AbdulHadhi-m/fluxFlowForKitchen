# Security Verification & Testing Guide — Fluxiflow for Kitchen

## 1. Automated Security Test Suite
The security test suite (`backend/apps/security/tests/`) validates platform hardening across all attack vectors:

### 1.1 Authentication & Session Hardening
- **Test 1: Brute-Force Lockout**: Verifies 5 consecutive failed logins lock the account for 15 minutes.
- **Test 2: Session Revocation**: Verifies that terminating a session revokes the JWT access token immediately.
- **Test 3: Token Invalidation on Password Reset**: Verifies all active sessions are killed when a password is changed or reset.
- **Test 4: Refresh Token Rotation**: Verifies reusing an old refresh token fails and does not yield new access tokens.

### 1.2 Multi-Factor Authentication (MFA)
- **Test 5: TOTP Secret Generation & Verification**: Verifies valid 6-digit TOTP codes activate MFA.
- **Test 6: Invalid TOTP Rejection**: Verifies wrong codes cannot activate or bypass MFA.
- **Test 7: Recovery Code Single-Use**: Verifies hashed recovery codes work once and are consumed.
- **Test 8: Step-Up Auth Enforcement**: Verifies privileged actions require recent authentication.

### 1.3 Multi-Tenant Isolation & Anti-IDOR
- **Test 9: Cross-Tenant Data Access**: Verifies Tenant A user cannot access Tenant B security events, incidents, or policies.
- **Test 10: X-Tenant-ID Header Spoofing**: Verifies `SecureTenantContextMiddleware` strips unassigned tenant headers.

### 1.4 Input Validation, SSRF & File Uploads
- **Test 11: SSRF Validator**: Verifies private IP ranges (10.0.0.0/8, 192.168.0.0/16, 127.0.0.1, 169.254.169.254) are blocked.
- **Test 12: File Upload Extensions**: Verifies `.exe`, `.bat`, `.php`, `.sh` scripts are rejected.
- **Test 13: Path Traversal in Filenames**: Verifies `../../etc/passwd` is sanitized.

### 1.5 Security Headers & Responses
- **Test 14: Security Headers Middleware**: Verifies `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, and `Permissions-Policy` headers are attached to responses.
- **Test 15: Error Sanitization**: Verifies unhandled 500 exceptions return sanitized JSON without exposing python tracebacks.

## 2. Running Security Tests
```bash
# Run backend security unit and integration tests
cd backend
python -m pytest apps/security/tests/ -v

# Run full system test suite
python -m pytest
```
