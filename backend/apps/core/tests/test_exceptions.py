from django.test import TestCase, RequestFactory
from rest_framework.exceptions import ValidationError, PermissionDenied, NotFound
from apps.core.exceptions import custom_exception_handler, ConflictError, BusinessRuleError

class ExceptionHandlerTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()

    def test_validation_error_formatting(self):
        """Verify ValidationError is formatted into standard envelope."""
        request = self.factory.get("/")
        request.correlation_id = "test-corr-id-123"
        context = {"request": request}

        exc = ValidationError({"email": ["Enter a valid email address."]})
        response = custom_exception_handler(exc, context)

        self.assertEqual(response.status_code, 400)
        data = response.data
        self.assertFalse(data["success"])
        self.assertEqual(data["error"]["code"], "VALIDATION_ERROR")
        self.assertIn("email", data["error"]["details"])
        self.assertEqual(data["error"]["correlation_id"], "test-corr-id-123")

    def test_permission_denied_formatting(self):
        """Verify PermissionDenied exception format."""
        request = self.factory.get("/")
        context = {"request": request}

        exc = PermissionDenied("Access restricted to active managers.")
        response = custom_exception_handler(exc, context)

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["error"]["code"], "PERMISSION_DENIED")

    def test_not_found_formatting(self):
        """Verify NotFound exception format."""
        request = self.factory.get("/")
        context = {"request": request}

        exc = NotFound("Resource not found.")
        response = custom_exception_handler(exc, context)

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data["error"]["code"], "NOT_FOUND")

    def test_conflict_and_business_rule_errors(self):
        """Verify custom ConflictError (409) and BusinessRuleError (422)."""
        request = self.factory.get("/")
        context = {"request": request}

        conflict_exc = ConflictError("Order has already been billed.")
        response_conflict = custom_exception_handler(conflict_exc, context)
        self.assertEqual(response_conflict.status_code, 409)
        self.assertEqual(response_conflict.data["error"]["code"], "RESOURCE_CONFLICT")

        rule_exc = BusinessRuleError("Item is marked out of stock.")
        response_rule = custom_exception_handler(rule_exc, context)
        self.assertEqual(response_rule.status_code, 422)
        self.assertEqual(response_rule.data["error"]["code"], "BUSINESS_RULE_VIOLATION")

    def test_unhandled_exception_safe_500(self):
        """Verify unhandled runtime exceptions return a safe 500 without leaking stack trace."""
        request = self.factory.get("/")
        request.correlation_id = "test-corr-id-500"
        context = {"request": request}

        exc = RuntimeError("Database connection timed out or crashed.")
        response = custom_exception_handler(exc, context)

        self.assertEqual(response.status_code, 500)
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["error"]["code"], "INTERNAL_SERVER_ERROR")
        self.assertEqual(response.data["error"]["correlation_id"], "test-corr-id-500")
        self.assertNotIn("timed out", response.data["error"]["message"])
