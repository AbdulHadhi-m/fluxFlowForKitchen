# Data Classification Matrix — Fluxiflow for Kitchen

## 1. Classification Levels

Fluxiflow classifies all data assets into four distinct tiers based on sensitivity, regulatory requirements, and business impact:

| Level | Description | Examples | Protection Controls |
|---|---|---|---|
| **Public** | Information approved for public disclosure without access restrictions. | Public menu items, pricing, restaurant business hours, public storefront landing page. | No authentication required; protected against unauthorized modification via RBAC. |
| **Internal** | Operational data intended for authenticated restaurant staff and team members. | Floor layouts, table statuses, recipe ingredient lists, supplier directory, inventory counts. | Requires active authentication and role-scoped permissions (`menu.view`, `inventory.view`). |
| **Confidential** | Sensitive business, operational, and customer information. | Customer contact details, order histories, daily sales reports, staff shift schedules, purchase orders. | Strict tenant isolation, least-privilege RBAC, audit logging on read/export, PII masking. |
| **Restricted** | Highly sensitive credentials, financial ledgers, cryptographic secrets, and compliance records. | Password hashes, JWT signing keys, MFA TOTP secrets, payment gateway API keys, bank account numbers, general ledgers, immutable audit logs. | Encrypted at rest, scrubbed by `AuditDataSanitizer`, step-up auth required, restricted to Admin/Owner. |

## 2. Asset Classification Registry

| Domain | Entity | Classification Level | Retention Guidelines |
|---|---|---|---|
| **Auth** | User Password Hash | Restricted | Replaced on change; never logged |
| **Auth** | MFA TOTP Secret | Restricted | Encrypted with Fernet |
| **Auth** | Refresh Token Hash | Restricted | Rotated on every refresh; purged on logout |
| **Finance** | General Journal Entry | Restricted | 7 years minimum (statutory tax compliance) |
| **Finance** | Payment Transaction Record | Confidential | 7 years |
| **CRM** | Customer Phone / Email | Confidential | Retained until deletion request |
| **Operations** | Active KDS Ticket | Internal | Ephemeral; archived to orders upon completion |
| **Catalog** | Public Digital Menu Item | Public | Maintained until archived by restaurant |
| **Audit** | SecurityEvent / AuditLog | Restricted / Immutable | Retained per tenant retention policy (default 365d) |
