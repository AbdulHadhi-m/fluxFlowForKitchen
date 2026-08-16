from unittest.mock import patch
from django.test import TestCase
from django.urls import reverse
from apps.accounts.models import User, PasswordResetToken

class PasswordResetAPITests(TestCase):
    def setUp(self):
        self.password = "InitialPassword123!"
        self.user = User.objects.create_user(
            email="resetme@fluxiflow.com",
            password=self.password,
        )
        self.forgot_url = reverse("auth_forgot_password")
        self.reset_url = reverse("auth_reset_password")

    @patch("apps.accounts.tasks.send_password_reset_email.delay")
    def test_forgot_password_anti_enumeration(self, mock_celery_task):
        """Verify forgot password returns identical message whether email exists or not."""
        # Existing email
        res_exists = self.client.post(
            self.forgot_url,
            {"email": "resetme@fluxiflow.com"},
            content_type="application/json",
        )
        self.assertEqual(res_exists.status_code, 200)
        self.assertTrue(mock_celery_task.called)

        # Non-existing email
        res_non_exists = self.client.post(
            self.forgot_url,
            {"email": "nonexistent@fluxiflow.com"},
            content_type="application/json",
        )
        self.assertEqual(res_non_exists.status_code, 200)
        self.assertEqual(res_exists.json(), res_non_exists.json())

    def test_reset_password_workflow(self):
        """Verify successful password reset with valid token."""
        # Trigger reset
        with patch("apps.accounts.tasks.send_password_reset_email.delay") as mock_task:
            self.client.post(
                self.forgot_url,
                {"email": "resetme@fluxiflow.com"},
                content_type="application/json",
            )
            # Retrieve raw token from mock call arguments
            raw_token = mock_task.call_args[0][1]

        # Reset password
        reset_res = self.client.post(
            self.reset_url,
            {
                "token": raw_token,
                "password": "BrandNewPassword123!",
                "confirm_password": "BrandNewPassword123!",
            },
            content_type="application/json",
        )
        self.assertEqual(reset_res.status_code, 200)

        # Check new password works
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("BrandNewPassword123!"))

        # Check token is consumed and cannot be reused
        reuse_res = self.client.post(
            self.reset_url,
            {
                "token": raw_token,
                "password": "AnotherPassword123!",
                "confirm_password": "AnotherPassword123!",
            },
            content_type="application/json",
        )
        self.assertEqual(reuse_res.status_code, 400)
