import uuid
from django.test import TestCase
from django.urls import reverse
from apps.accounts.models import User
from apps.rbac.models import Permission, Role, TenantMembership
from apps.rbac.services import RBACService

class ActiveRoleSwitchingTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="shiftmanager@fluxiflow.com",
            password="Password123!",
        )
        self.tenant_id = uuid.uuid4()

        # Permissions & Roles
        self.p_orders = Permission.objects.create(resource="orders", action="create")
        self.p_billing = Permission.objects.create(resource="billing", action="refund")

        self.role_waiter = Role.objects.create(name="Waiter", code="WAITER")
        self.role_waiter.permissions.set([self.p_orders])

        self.role_manager = Role.objects.create(name="Manager", code="MANAGER")
        self.role_manager.permissions.set([self.p_orders, self.p_billing])

        self.role_unassigned = Role.objects.create(name="Owner", code="OWNER")

        # Membership
        self.membership = TenantMembership.objects.create(
            user=self.user,
            tenant_id=self.tenant_id,
            active_role=self.role_waiter,
        )
        self.membership.assigned_roles.set([self.role_waiter, self.role_manager])

        # Login
        login_res = self.client.post(
            reverse("auth_login"),
            {"email": "shiftmanager@fluxiflow.com", "password": "Password123!"},
            content_type="application/json",
        )
        self.access_token = login_res.json()["data"]["access_token"]
        self.switch_url = reverse("auth_switch_role")

    def test_switch_to_assigned_role_successful(self):
        """Verify user can switch between their assigned roles."""
        response = self.client.post(
            self.switch_url,
            {"role_code": "MANAGER", "tenant_id": str(self.tenant_id)},
            HTTP_AUTHORIZATION=f"Bearer {self.access_token}",
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertEqual(data["active_role"]["code"], "MANAGER")
        self.assertIn("billing.refund", data["permissions"])

        # Check DB updated
        self.membership.refresh_from_db()
        self.assertEqual(self.membership.active_role, self.role_manager)

    def test_switch_to_unassigned_role_rejected(self):
        """Verify user cannot switch to a role they are not assigned."""
        response = self.client.post(
            self.switch_url,
            {"role_code": "OWNER", "tenant_id": str(self.tenant_id)},
            HTTP_AUTHORIZATION=f"Bearer {self.access_token}",
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.membership.refresh_from_db()
        self.assertEqual(self.membership.active_role, self.role_waiter)

    def test_switch_role_in_unauthorized_tenant_rejected(self):
        """Verify user cannot switch roles in a restaurant where they have no membership."""
        unauthorized_tenant = uuid.uuid4()
        response = self.client.post(
            self.switch_url,
            {"role_code": "MANAGER", "tenant_id": str(unauthorized_tenant)},
            HTTP_AUTHORIZATION=f"Bearer {self.access_token}",
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
