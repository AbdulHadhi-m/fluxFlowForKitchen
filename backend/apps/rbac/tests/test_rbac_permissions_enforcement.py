import uuid
from django.test import TestCase
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.accounts.models import User
from apps.rbac.models import Permission, Role, TenantMembership
from apps.rbac.permissions import HasActivePermission, require_permission

class DummyOrderRefundView(APIView):
    permission_classes = [require_permission("billing.refund")]

    def post(self, request):
        return Response({"success": True, "message": "Refund processed"})

class PermissionEnforcementTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = User.objects.create_user(email="waiter1@fluxiflow.com", password="Password123!")
        self.tenant_id = uuid.uuid4()

        self.p_orders = Permission.objects.create(resource="orders", action="create")
        self.p_refund = Permission.objects.create(resource="billing", action="refund")

        self.role_waiter = Role.objects.create(name="Waiter", code="WAITER")
        self.role_waiter.permissions.set([self.p_orders])

        self.role_manager = Role.objects.create(name="Manager", code="MANAGER")
        self.role_manager.permissions.set([self.p_orders, self.p_refund])

        self.membership = TenantMembership.objects.create(
            user=self.user,
            tenant_id=self.tenant_id,
            active_role=self.role_waiter,
        )
        self.membership.assigned_roles.set([self.role_waiter, self.role_manager])

    def test_permission_denied_when_active_role_lacks_permission(self):
        """Active role WAITER does not have billing.refund -> 403 Forbidden."""
        request = self.factory.post("/api/v1/billing/refund/")
        force_authenticate(request, user=self.user)
        request.tenant_id = self.tenant_id

        view = DummyOrderRefundView.as_view()
        response = view(request)
        self.assertEqual(response.status_code, 403)

    def test_permission_allowed_when_active_role_has_permission(self):
        """Switch to MANAGER role -> billing.refund permitted -> 200 OK."""
        self.membership.active_role = self.role_manager
        self.membership.save()

        request = self.factory.post("/api/v1/billing/refund/")
        force_authenticate(request, user=self.user)
        request.tenant_id = self.tenant_id

        view = DummyOrderRefundView.as_view()
        response = view(request)
        self.assertEqual(response.status_code, 200)
