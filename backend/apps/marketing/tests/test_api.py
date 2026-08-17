import pytest
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.rbac.models import Role, Permission, TenantMembership
from apps.customers.models import Customer
from apps.orders.models import Order, OrderItem
from apps.menu.models import MenuItem, MenuCategory
from apps.marketing.models import (
    Promotion,
    PromotionType,
    PromotionStatus,
    Coupon,
    CouponStatus,
    CustomerSegment,
    CustomerSegmentType,
    Campaign,
    CampaignStatus,
)


@pytest.mark.django_db
class TestMarketingAPI:

    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.client = APIClient()
        self.restaurant = Restaurant.objects.create(name="API Bistro", slug="api-bistro")
        self.user = User.objects.create_user(email="manager@bistro.com", password="Password123")

        # Setup manager role with marketing permissions
        perm_view, _ = Permission.objects.get_or_create(code="marketing.view", resource="marketing", action="view")
        perm_create, _ = Permission.objects.get_or_create(code="marketing.create", resource="marketing", action="create")
        perm_manage, _ = Permission.objects.get_or_create(code="marketing.manage", resource="marketing", action="manage")
        perm_delete, _ = Permission.objects.get_or_create(code="marketing.delete", resource="marketing", action="delete")

        self.role = Role.objects.create(name="Manager", code="MANAGER", tenant_id=self.restaurant.id)
        self.role.permissions.add(perm_view, perm_create, perm_manage, perm_delete)

        self.membership = TenantMembership.objects.create(
            user=self.user,
            tenant_id=self.restaurant.id,
            active_role=self.role,
            is_active=True
        )
        self.membership.assigned_roles.add(self.role)

        self.client.force_authenticate(user=self.user)

        self.customer = Customer.objects.create(
            restaurant=self.restaurant,
            first_name="Sam",
            phone="8887776666"
        )
        self.order = Order.objects.create(
            restaurant=self.restaurant,
            order_number="ORD-API-001",
            created_by=self.user,
            subtotal=Decimal("60.00"),
            total=Decimal("60.00"),
            status=Order.OrderStatus.PLACED
        )

    def test_promotion_crud_api(self):
        now = timezone.now()
        # Create
        payload = {
            "name": "Summer Saver 15%",
            "description": "15% off everything",
            "promotion_type": PromotionType.PERCENTAGE_DISCOUNT,
            "discount_value": "15.00",
            "status": PromotionStatus.ACTIVE,
            "start_at": (now - timedelta(days=1)).isoformat(),
            "priority": 20,
            "min_order_value": "30.00",
            "per_customer_limit": 3,
        }
        res = self.client.post("/api/v1/marketing/promotions/", payload, format="json")
        assert res.status_code == 201
        promo_id = res.data["id"]

        # List
        res_list = self.client.get("/api/v1/marketing/promotions/")
        assert res_list.status_code == 200
        items = res_list.data.get("data") if isinstance(res_list.data, dict) and "data" in res_list.data else res_list.data
        assert len(items) >= 1

        # Pause
        res_pause = self.client.post(f"/api/v1/marketing/promotions/{promo_id}/pause/")
        assert res_pause.status_code == 200
        assert res_pause.data["status"] == "PAUSED"

    def test_promotion_evaluate_api(self):
        now = timezone.now()
        promo = Promotion.objects.create(
            restaurant=self.restaurant,
            name="25% Discount",
            promotion_type=PromotionType.PERCENTAGE_DISCOUNT,
            discount_value=Decimal("25.00"),
            status=PromotionStatus.ACTIVE,
            start_at=now - timedelta(days=1),
            min_order_value=Decimal("50.00")
        )

        res = self.client.post("/api/v1/marketing/promotions/evaluate/", {
            "order_id": str(self.order.id),
            "customer_id": str(self.customer.id),
        }, format="json")
        assert res.status_code == 200
        # 25% of 60.00 = 15.00 discount, net = 45.00
        assert res.data["total_discount"] == "15.00"
        assert res.data["net_total"] == "45.00"
        assert res.data["has_discount"] is True

    def test_bulk_coupon_generation_api(self):
        now = timezone.now()
        promo = Promotion.objects.create(
            restaurant=self.restaurant,
            name="Coupon Promo",
            promotion_type=PromotionType.FIXED_DISCOUNT,
            discount_value=Decimal("10.00"),
            status=PromotionStatus.ACTIVE,
            start_at=now - timedelta(days=1),
            coupon_required=True
        )

        res = self.client.post("/api/v1/marketing/coupons/bulk-generate/", {
            "promotion_id": str(promo.id),
            "count": 5,
            "prefix": "LUCKY",
            "usage_limit": 1
        }, format="json")
        assert res.status_code == 201
        assert len(res.data) == 5
        assert all(c["code"].startswith("LUCKY") for c in res.data)

    def test_coupon_validate_api(self):
        now = timezone.now()
        promo = Promotion.objects.create(
            restaurant=self.restaurant,
            name="Coupon 10 Off",
            promotion_type=PromotionType.FIXED_DISCOUNT,
            discount_value=Decimal("10.00"),
            status=PromotionStatus.ACTIVE,
            start_at=now - timedelta(days=1),
            coupon_required=True
        )
        coupon = Coupon.objects.create(
            restaurant=self.restaurant,
            promotion=promo,
            code="TASTE10",
            status=CouponStatus.ACTIVE,
            valid_from=now - timedelta(days=1)
        )

        res = self.client.post("/api/v1/marketing/coupons/validate/", {
            "code": "TASTE10",
            "order_id": str(self.order.id),
            "customer_id": str(self.customer.id)
        }, format="json")
        assert res.status_code == 200
        assert res.data["valid"] is True
        assert res.data["discount_amount"] == "10.00"

    def test_customer_segment_preview_api(self):
        segment = CustomerSegment.objects.create(
            restaurant=self.restaurant,
            name="All Guests",
            segment_type=CustomerSegmentType.ALL_CUSTOMERS
        )
        res = self.client.get(f"/api/v1/marketing/segments/{segment.id}/preview/")
        assert res.status_code == 200
        assert res.data["total_audience_count"] >= 1
        assert len(res.data["sample_profiles"]) >= 1

    def test_marketing_analytics_api(self):
        res = self.client.get("/api/v1/marketing/analytics/")
        assert res.status_code == 200
        assert "active_promotions_count" in res.data
        assert "total_discount_given" in res.data
        assert "promotional_revenue_influenced" in res.data
