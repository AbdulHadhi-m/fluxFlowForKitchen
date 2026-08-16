from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from apps.accounts.models import User

class UserModelTests(TestCase):
    def test_create_user_successful(self):
        """Verify standard user creation with password hashing."""
        user = User.objects.create_user(
            email="chef@fluxiflow.com",
            password="SecurePassword123!",
            first_name="Gordon",
            last_name="Ramsay",
        )
        self.assertEqual(user.email, "chef@fluxiflow.com")
        self.assertTrue(user.check_password("SecurePassword123!"))
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.is_active)
        self.assertEqual(user.full_name, "Gordon Ramsay")

    def test_create_user_missing_email_raises_error(self):
        """Verify error when attempting to create user without email."""
        with self.assertRaises(ValueError):
            User.objects.create_user(email="", password="SomePassword123!")

    def test_account_lockout_mechanism(self):
        """Verify failed login attempt counter and lockout timestamp."""
        user = User.objects.create_user(
            email="waiter@fluxiflow.com",
            password="Password123!",
        )
        self.assertFalse(user.is_locked_out())

        # Register 4 failed attempts
        for _ in range(4):
            user.register_failed_login(max_attempts=5, lockout_minutes=15)
        self.assertEqual(user.failed_login_attempts, 4)
        self.assertFalse(user.is_locked_out())

        # 5th attempt locks account
        user.register_failed_login(max_attempts=5, lockout_minutes=15)
        self.assertEqual(user.failed_login_attempts, 5)
        self.assertTrue(user.is_locked_out())
        self.assertGreater(user.locked_until, timezone.now())

        # Reset failed attempts
        user.reset_failed_logins()
        self.assertEqual(user.failed_login_attempts, 0)
        self.assertFalse(user.is_locked_out())
