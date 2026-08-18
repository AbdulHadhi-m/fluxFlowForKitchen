import pytest
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.restaurants.models import Restaurant
from apps.rbac.models import TenantMembership, Role, Permission
from apps.rbac.services import RBACService
from apps.security.models import SecurityEvent, SecurityEventType


@pytest.mark.django_db
class TestTenantSecurityAndIsolation:
    def test_tenant_data_isolation(self):
        # Setup RBAC permissions
        RBACService.seed_system_roles_and_permissions()

        # Create two restaurants
        r1 = Restaurant.objects.create(
            name="Restaurant Alpha",
            slug="alpha",
            email="alpha@test.com",
            currency="USD",
        )
        r2 = Restaurant.objects.create(
            name="Restaurant Beta",
            slug="beta",
            email="beta@test.com",
            currency="USD",
        )

        # Create user belonging to Alpha
        user1 = User.objects.create_user(
            email="alpha_manager@test.com",
            password="SecurePassword123!",
            first_name="Alpha",
            last_name="Manager",
        )
        admin_role = Role.objects.get(code="RESTAURANT_ADMIN", is_system=True)
        m1 = TenantMembership.objects.create(
            user=user1,
            tenant_id=r1.id,
            active_role=admin_role,
            is_active=True,
        )
        m1.assigned_roles.add(admin_role)

        # Create SecurityEvent for Restaurant Alpha and Restaurant Beta
        evt1 = SecurityEvent.objects.create(
            restaurant=r1,
            user=user1,
            event_type=SecurityEventType.AUTH_LOGIN_SUCCESS,
            description="Alpha event",
        )
        evt2 = SecurityEvent.objects.create(
            restaurant=r2,
            event_type=SecurityEventType.AUTH_LOGIN_SUCCESS,
            description="Beta event",
        )

        client = APIClient()
        client.force_authenticate(user=user1)

        # Access events API — should only return Alpha events
        response = client.get("/api/v1/security/events/")
        assert response.status_code == 200
        data = response.json()
        results = data.get("data", [])
        if "results" in results:
            results = results["results"]

        event_ids = [e["id"] for e in results]
        assert str(evt1.id) in event_ids
        assert str(evt2.id) not in event_ids
