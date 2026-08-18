# Security Policy & Overview — Fluxiflow for Kitchen

## 1. Overview
Fluxiflow for Kitchen is a multi-tenant, cloud-native restaurant operations management platform designed with security-by-design and defense-in-depth principles. This document outlines our security governance, vulnerability reporting policies, and compliance architecture.

## 2. Core Security Guarantees
- **Authentication**: JWT access tokens (15m lifetime) with in-memory storage, HttpOnly refresh cookies with cryptographic token rotation, and active session revocation validation on every request.
- **Multi-Factor Authentication (MFA)**: Standard TOTP (RFC 6238) support with Fernet-encrypted secret storage and single-use hashed recovery codes.
- **Tenant Isolation**: Strict tenant scoping across database querysets (`TenantAwareModel`, `TenantSoftDeleteManager`), RBAC evaluation, and websocket connection groups.
- **Authorization**: Granular Role-Based Access Control (RBAC) with dynamic active role switching and least-privilege permission validation.
- **Audit & Forensics**: Append-only, tamper-resistant audit logs (`AuditLog`) and security event ledger (`SecurityEvent`) tracking all authentication, authorization, and configuration actions.
- **Data Protection**: PII masking utilities, strict SSL/TLS enforcement, automated data retention policies, and defense against OWASP Top 10 vulnerabilities.

## 3. Reporting a Security Vulnerability
We take the security of Fluxiflow and our restaurant partners seriously. If you discover a vulnerability, please report it responsibly:

- **Email**: `security@fluxiflow.com`
- **PGP Key**: Available upon request for encrypted disclosure
- **Response SLA**: Initial acknowledgement within 24 hours; triage within 72 hours.
- **Safe Harbor**: We commit not to pursue legal action against security researchers who follow responsible disclosure guidelines and test only on authorized test environments.

## 4. Platform Security Controls Matrix

| Domain | Control Description | Implementation |
|---|---|---|
| Identity & Access | Password Hashing | Argon2 / PBKDF2 with SHA-256 |
| Identity & Access | Brute-Force Protection | 5 failed attempts = 15m lockout |
| Identity & Access | Session Invalidation | Full revocation on password change & reset |
| Network & Transport | TLS / HTTPS | Strict HSTS with subdomains & preload |
| Network & Transport | Security Headers | CSP, X-Content-Type-Options, Referrer-Policy |
| Network & Transport | Rate Limiting | Burst (120/min) & Sustained (2000/hr) per user |
| Application Security | SSRF Protection | Private IP, loopback, and metadata endpoint blocking |
| Application Security | File Uploads | Extension whitelisting, MIME check, size caps |
| Data & Privacy | PII Sanitization | Audit log sanitizer & API masking utilities |
