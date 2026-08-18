# Logging & Redaction — Fluxiflow for Kitchen

## 1. Architecture
- Logging is configured in `config/settings/base.py` with a shared `request_context` filter (correlation ID, restaurant, user, method, path, status).
- Development: human-readable `FluxiflowTextFormatter`.
- Production (`settings/production.py`): structured JSON via `FluxiflowJsonFormatter` with optional `RotatingFileHandler` (10 MB × 5 backups) on top of console output.
- Every message passes through redaction at **format time**, so even code that logs a raw token cannot leak it.

## 2. Redaction Rules (`apps/core/logging.py`)
The `redact_text()` function replaces, in any message or payload field:
- Bearer/JWT tokens (`bearer` followed by 6+ token chars) → `[REDACTED]`
- `password`, `token`, `secret`, `api_key` style keys → `[REDACTED]`
- `Authorization` headers → `[REDACTED]`
- Email addresses → `[REDACTED]`
- Long 12+ char alphanumeric strings that look like secrets → `[REDACTED]`

## 3. Structured Fields (JSON mode)
`timestamp`, `level`, `logger`, `message`, `request_context` (correlation_id, restaurant, user, method, path, status), `exception` (type + message, sanitized), `environment`.

## 4. Correlation IDs
- Per-request correlation IDs flow into middleware logs, error events, and Celery task records (`propagate_correlation_id` header propagation).
- Log lines include the correlation ID so a single user action can be traced across HTTP, Celery, and WS.

## 5. Secrets Policy
- Never log request/response bodies or headers wholesale (only normalized method/path/status).
- The `MONITORING_REQUEST_LOGGING` setting, if enabled in dev, still only logs method/path/status/duration.
- Tests (`test_logging_safety.py`) assert redaction holds for tokens, passwords, and full JSON payloads.