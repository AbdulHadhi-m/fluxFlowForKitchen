from datetime import timedelta
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from apps.accounts.models import User, UserSession

class AuthAPITests(TestCase):
    def setUp(self):
        self.password = "SuperSecret123!"
        self.user = User.objects.create_user(
            email="manager@fluxiflow.com",
            password=self.password,
            first_name="Marco",
            last_name="Pierre",
        )
        self.login_url = reverse("auth_login")
        self.refresh_url = reverse("auth_refresh")
        self.logout_url = reverse("auth_logout")
        self.me_url = reverse("auth_me")

    def test_login_success(self):
        """Verify successful login returns user data, access token, and sets refresh cookie."""
        response = self.client.post(
            self.login_url,
            {"email": "manager@fluxiflow.com", "password": self.password},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIn("access_token", data["data"])
        self.assertIn("refresh_token", data["data"])
        self.assertEqual(data["data"]["user"]["email"], "manager@fluxiflow.com")
        self.assertIn("fluxiflow_refresh", response.cookies)

        # Check session created in DB
        session_id = data["data"]["session_id"]
        session = UserSession.objects.get(id=session_id)
        self.assertEqual(session.user, self.user)
        self.assertFalse(session.is_revoked)

    def test_login_invalid_password(self):
        """Verify login failure increments failed attempts and returns 401."""
        response = self.client.post(
            self.login_url,
            {"email": "manager@fluxiflow.com", "password": "WrongPassword!"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.user.refresh_from_db()
        self.assertEqual(self.user.failed_login_attempts, 1)

    def test_login_locked_out_account(self):
        """Verify locked account returns 401 with lockout message."""
        self.user.locked_until = timezone.now() + timedelta(minutes=15)
        self.user.failed_login_attempts = 5
        self.user.save()

        response = self.client.post(
            self.login_url,
            {"email": "manager@fluxiflow.com", "password": self.password},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertIn("Account is temporarily locked", response.json()["error"]["message"])

    def test_token_refresh_rotation(self):
        """Verify token refresh rotates the refresh token and updates session hash."""
        # 1. Login
        login_res = self.client.post(
            self.login_url,
            {"email": "manager@fluxiflow.com", "password": self.password},
            content_type="application/json",
        )
        refresh_token = login_res.json()["data"]["refresh_token"]

        # 2. Refresh
        refresh_res = self.client.post(
            self.refresh_url,
            {"refresh_token": refresh_token},
            content_type="application/json",
        )
        self.assertEqual(refresh_res.status_code, 200)
        new_access = refresh_res.json()["data"]["access_token"]
        new_refresh = refresh_res.json()["data"]["refresh_token"]
        self.assertNotEqual(refresh_token, new_refresh)

        # 3. Old refresh token should now fail (Replay protection)
        old_res = self.client.post(
            self.refresh_url,
            {"refresh_token": refresh_token},
            content_type="application/json",
        )
        self.assertEqual(old_res.status_code, 401)

    def test_me_endpoint_authenticated(self):
        """Verify /auth/me/ returns user info with valid bearer token."""
        login_res = self.client.post(
            self.login_url,
            {"email": "manager@fluxiflow.com", "password": self.password},
            content_type="application/json",
        )
        token = login_res.json()["data"]["access_token"]

        me_res = self.client.get(
            self.me_url,
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.json()["data"]["email"], "manager@fluxiflow.com")

    def test_logout_revokes_session(self):
        """Verify logout revokes current session and invalidates further refreshes."""
        login_res = self.client.post(
            self.login_url,
            {"email": "manager@fluxiflow.com", "password": self.password},
            content_type="application/json",
        )
        access_token = login_res.json()["data"]["access_token"]
        refresh_token = login_res.json()["data"]["refresh_token"]

        logout_res = self.client.post(
            self.logout_url,
            HTTP_AUTHORIZATION=f"Bearer {access_token}",
        )
        self.assertEqual(logout_res.status_code, 200)

        # Attempting refresh with the logged out session must fail
        refresh_res = self.client.post(
            self.refresh_url,
            {"refresh_token": refresh_token},
            content_type="application/json",
        )
        self.assertEqual(refresh_res.status_code, 401)
