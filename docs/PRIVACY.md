# Privacy & Data Protection Policy — Fluxiflow for Kitchen

## 1. Scope & Principles
Fluxiflow is committed to upholding data privacy rights under global privacy frameworks (GDPR, CCPA, and regional privacy regulations). We follow the principles of data minimization, purpose limitation, storage limitation, and confidentiality.

## 2. Personal Identifiable Information (PII) Protection
- **Customer Data**: Names, emails, and phone numbers captured through dine-in QR ordering, takeaway, or reservations are used solely for order processing, receipt delivery, and opt-in marketing.
- **Audit Log Sanitization**: The `AuditDataSanitizer` automatically scrubs passwords, tokens, credit card details, API keys, and bank account numbers prior to recording any audit entry.
- **PII Masking**: API utilities (`PIIMaskingService`) mask customer email addresses (`j***e@domain.com`) and phone numbers (`***4567`) in staff interfaces where full visibility is not required.

## 3. Data Subject Rights (DSR) Workflows
- **Right of Access & Export**: Authorized administrators can generate full CSV/JSON exports of customer records, reservation logs, and order histories.
- **Right to Erasure (Right to Be Forgotten)**: Customer profiles can be pseudonymized or deleted upon verified request. Associated financial invoices retain legally mandated tax metadata with customer identifiers anonymized.
- **Right to Rectification**: Staff and customers can update inaccurate contact details directly through the management console or customer portal.

## 4. Automated Retention & Purge
- Data retention policies (`DataRetentionPolicy`) allow tenant administrators to configure automated purge schedules for ephemeral data (session logs, read notifications, expired carts) while preserving immutable accounting records for the statutory duration (typically 7 years).
