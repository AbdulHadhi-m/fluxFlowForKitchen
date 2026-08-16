from django.test import TestCase
from django.urls import reverse
from apps.accounts.models import User, UserSession

class SessionAPITests(TestCase):
    def setUp(self):
        self.password = "Password123!"
        self.user = User.objects.create_user(
            email="cashier@fluxiflow.com",
            password=self.password,
        )
        self.login_url = reverse("auth_login")
        self.sessions_url = reverse("auth_sessions")
        self.other_sessions_url = reverse("auth_terminate_other_sessions")

    def test_session_list_and_termination(self):
        """Verify session listing and individual session termination."""
        # 1. Login Session A
        res_a = self.client.post(
            self.login_url,
            {"email": "cashier@fluxiflow.com", "password": self.password},
            content_type="application/json",
        )
        token_a = res_a.json()["data"]["access_token"]
        session_a_id = res_a.json()["data"]["session_id"]

        # 2. Login Session B
        res_b = self.client.post(
            self.login_url,
            {"email": "cashier@fluxiflow.com", "password": self.password},
            content_type="application/json",
        )
        session_b_id = res_b.json()["data"]["session_id"]

        # 3. List active sessions
        list_res = self.client.get(
            self.sessions_url,
            HTTP_AUTHORIZATION=f"Bearer {token_a}",
        )
        self.assertEqual(list_res.status_code, 200)
        sessions = list_res.json()["data"]
        self.assertEqual(len(sessions), 2)

        # 4. Terminate Session B using Session A's auth
        term_url = reverse("auth_terminate_session", kwargs={"session_id": session_b_id})
        term_res = self.client.delete(
            term_url,
            HTTP_AUTHORIZATION=f"Bearer {token_a}",
        )
        self.assertEqual(term_res.status_code, 200)

        # Session B should be revoked
        session_b = UserSession.objects.get(id=session_b_id)
        self.assertTrue(session_b.is_revoked)

    def test_terminate_all_other_sessions(self):
        """Verify terminating all other sessions keeps current session active."""
        # Login 3 sessions
        res_current = self.client.post(
            self.login_url,
            {"email": "cashier@fluxiflow.com", "password": self.password},
            content_type="application/json",
        )
        token_current = res_current.json()["data"]["access_token"]
        session_current_id = res_current.json()["data"]["session_id"]

        # 2 other logins
        self.client.post(self.login_url, {"email": "cashier@fluxiflow.com", "password": self.password}, content_type="application/json")
        self.client.post(self.login_url, {"email": "cashier@fluxiflow.com", "password": self.password}, content_type="application/json")

        self.assertEqual(UserSession.objects.filter(user=self.user, is_revoked=False).count(), 3)

        # Terminate others
        term_res = self.client.delete(
            self.other_sessions_url,
            HTTP_AUTHORIZATION=f"Bearer {token_current}",
        )
        self.assertEqual(term_res.status_code, 200)

        # Only current session should remain active
        active_sessions = UserSession.objects.filter(user=self.user, is_revoked=False)
        self.assertEqual(active_sessions.count(), 1)
        self.assertEqual(str(active_sessions.first().id), session_current_id)
