import json
import logging

from django.test import TestCase

from apps.core.logging import FluxiflowJsonFormatter, FluxiflowTextFormatter, RequestContextFilter, redact_text


class RedactionTests(TestCase):
    """Verify sensitive values are redacted from structured logs."""

    def test_redact_text_removes_secret_values(self):
        text = (
            "password=supersecret123 token=eyJhbGciOiJIUzI1NiJ9 header "
            "Authorization: Bearer abc.def.ghi api_key=sk-live-xyz"
        )
        redacted = redact_text(text)
        self.assertNotIn("supersecret123", redacted)
        self.assertNotIn("eyJhbGciOiJIUzI1NiJ9", redacted)
        self.assertNotIn("abc.def.ghi", redacted)
        self.assertNotIn("sk-live-xyz", redacted)
        self.assertNotIn("password=supersecret123", redacted)

    def test_redact_text_keeps_normal_content(self):
        text = "Order ORD-000123 created for restaurant Bellini"
        self.assertEqual(redact_text(text), text)

    def test_json_formatter_drops_unknown_keys_and_keeps_safe(self):
        formatter = FluxiflowJsonFormatter()
        record = logging.LogRecord(
            "fluxiflow.test", logging.INFO, "f.py", 1, "boom %s", ("arg",), None
        )
        record.password = "hunter2"
        record.api_key = "sk-123"
        record.correlation_id = "corr-1"
        record.user_email = "a@b.com"
        rendered = formatter.format(record)
        parsed = json.loads(rendered)
        self.assertNotIn("password", parsed)
        self.assertNotIn("api_key", parsed)
        self.assertEqual(parsed["correlation_id"], "corr-1")
        # PII keys are dropped by design (whitelist-only extra fields)
        self.assertNotIn("user_email", parsed)

    def test_text_formatter_redacts_message(self):
        formatter = FluxiflowTextFormatter(fmt="%(message)s")
        record = logging.LogRecord(
            "fluxiflow.test", logging.INFO, "f.py", 1,
            "login failed for token=abc123def", (), None,
        )
        rendered = formatter.format(record)
        self.assertNotIn("abc123def", rendered)

    def test_request_context_filter_injects_context(self):
        from apps.monitoring.context import correlation_id_ctx

        correlation_id_ctx.set("corr-test-42")
        record = logging.LogRecord("fluxiflow.test", logging.INFO, "f.py", 1, "msg", (), None)
        RequestContextFilter().filter(record)
        self.assertEqual(record.correlation_id, "corr-test-42")
        correlation_id_ctx.set(None)