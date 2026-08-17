import secrets
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError, NotFound
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from django.db import transaction

from apps.rbac.services import RBACService
from apps.restaurants.services import RestaurantService
from apps.restaurants.models import Restaurant
from apps.orders.models import Order
from apps.customers.models import Customer
from apps.audit.services import AuditLogService
from apps.audit.models import AuditAction, AuditEntityType, AuditActorType

from apps.marketing.models import (
    Promotion,
    PromotionStatus,
    Coupon,
    CouponStatus,
    CustomerSegment,
    MarketingConsent,
    Campaign,
    CampaignStatus,
    PromotionUsage,
)
from apps.marketing.serializers import (
    PromotionSerializer,
    PromotionEvaluateSerializer,
    CouponSerializer,
    BulkCouponCreateSerializer,
    CouponValidateSerializer,
    CustomerSegmentSerializer,
    MarketingConsentSerializer,
    CampaignSerializer,
    PromotionUsageSerializer,
)
from apps.marketing.services import (
    PromotionEligibilityService,
    PromotionCalculationService,
    PromotionRedemptionService,
    CustomerSegmentService,
    MarketingConsentService,
    CampaignService,
    MarketingAnalyticsService,
)


class TenantMarketingBaseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_restaurant(self) -> Restaurant:
        restaurant = getattr(self.request, "restaurant", None)
        if not restaurant:
            restaurant = RestaurantService.get_user_restaurant(self.request.user)
        if not restaurant:
            raise PermissionDenied("User is not associated with an active restaurant.")
        return restaurant

    def check_user_permission(self, permission_code: str):
        if self.request.user.is_superuser:
            return
        restaurant = self.get_restaurant()
        perms = RBACService.get_effective_permissions(user=self.request.user, tenant_id=restaurant.id)
        if permission_code not in perms:
            raise PermissionDenied(f"Missing required permission: {permission_code}")


class PromotionViewSet(TenantMarketingBaseViewSet):
    """
    CRUD and operational control for promotional discount rules.
    """
    serializer_class = PromotionSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "promotion_type", "coupon_required", "stackable"]
    search_fields = ["name", "description"]
    ordering_fields = ["priority", "start_at", "end_at", "created_at", "current_usage_count"]
    ordering = ["-priority", "-created_at"]

    def list(self, request, *args, **kwargs):
        self.check_user_permission("marketing.view")
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        self.check_user_permission("marketing.view")
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        self.check_user_permission("marketing.create")
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        self.check_user_permission("marketing.manage")
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self.check_user_permission("marketing.manage")
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self.check_user_permission("marketing.delete")
        return super().destroy(request, *args, **kwargs)

    def get_queryset(self):
        restaurant = self.get_restaurant()
        return Promotion.objects.filter(restaurant=restaurant).prefetch_related(
            "target_menu_items", "target_categories", "target_tags", "target_loyalty_tiers", "target_customers"
        )

    def perform_create(self, serializer):
        restaurant = self.get_restaurant()
        promotion = serializer.save(restaurant=restaurant, created_by=self.request.user)
        AuditLogService.record(
            restaurant=restaurant,
            action=AuditAction.CREATE,
            entity_type=AuditEntityType.PROMOTION,
            entity_id=str(promotion.id),
            actor_user=self.request.user,
            description=f"Created promotion '{promotion.name}' ({promotion.get_promotion_type_display()})",
            after_data=serializer.data
        )

    def perform_update(self, serializer):
        restaurant = self.get_restaurant()
        before_data = PromotionSerializer(serializer.instance).data
        promotion = serializer.save()
        AuditLogService.record(
            restaurant=restaurant,
            action=AuditAction.UPDATE,
            entity_type=AuditEntityType.PROMOTION,
            entity_id=str(promotion.id),
            actor_user=self.request.user,
            description=f"Updated promotion '{promotion.name}'",
            before_data=before_data,
            after_data=serializer.data
        )

    def perform_destroy(self, instance):
        restaurant = self.get_restaurant()
        instance.status = PromotionStatus.ARCHIVED
        instance.save(update_fields=["status"])
        AuditLogService.record(
            restaurant=restaurant,
            action=AuditAction.DELETE,
            entity_type=AuditEntityType.PROMOTION,
            entity_id=str(instance.id),
            actor_user=self.request.user,
            description=f"Archived promotion '{instance.name}'"
        )

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        self.check_user_permission("marketing.manage")
        promotion = self.get_object()
        promotion.status = PromotionStatus.ACTIVE
        promotion.save(update_fields=["status"])
        return Response({"status": "ACTIVE", "message": f"Promotion '{promotion.name}' activated successfully."})

    @action(detail=True, methods=["post"])
    def pause(self, request, pk=None):
        self.check_user_permission("marketing.manage")
        promotion = self.get_object()
        promotion.status = PromotionStatus.PAUSED
        promotion.save(update_fields=["status"])
        return Response({"status": "PAUSED", "message": f"Promotion '{promotion.name}' paused."})

    @action(detail=False, methods=["post"], url_path="evaluate")
    def evaluate(self, request):
        """
        Authoritative evaluation endpoint for POS & Billing checkout.
        Evaluates eligible discounts, checks coupon code if provided, and computes exact deductions.
        """
        self.check_user_permission("marketing.view")
        serializer = PromotionEvaluateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        restaurant = self.get_restaurant()
        order = Order.objects.filter(restaurant=restaurant, id=data["order_id"]).first()
        if not order:
            raise NotFound(f"Order {data['order_id']} not found in active restaurant.")

        customer = None
        if data.get("customer_id"):
            customer = Customer.objects.filter(restaurant=restaurant, id=data["customer_id"]).first()

        result = PromotionCalculationService.evaluate_and_calculate_all(
            restaurant=restaurant,
            order=order,
            customer=customer,
            coupon_code=data.get("coupon_code"),
        )
        return Response(result)


class CouponViewSet(TenantMarketingBaseViewSet):
    """
    Management and single/bulk generation of coupon codes.
    """
    serializer_class = CouponSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "promotion"]
    search_fields = ["code", "promotion__name"]
    ordering_fields = ["valid_from", "valid_until", "current_usage_count", "created_at"]
    ordering = ["-created_at"]

    def list(self, request, *args, **kwargs):
        self.check_user_permission("marketing.view")
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        self.check_user_permission("marketing.view")
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        self.check_user_permission("marketing.create")
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        self.check_user_permission("marketing.manage")
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self.check_user_permission("marketing.manage")
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self.check_user_permission("marketing.delete")
        return super().destroy(request, *args, **kwargs)

    def get_queryset(self):
        restaurant = self.get_restaurant()
        return Coupon.objects.filter(restaurant=restaurant).select_related("promotion")

    def perform_create(self, serializer):
        restaurant = self.get_restaurant()
        coupon = serializer.save(restaurant=restaurant)
        AuditLogService.record(
            restaurant=restaurant,
            action=AuditAction.CREATE,
            entity_type=AuditEntityType.COUPON,
            entity_id=str(coupon.id),
            actor_user=self.request.user,
            description=f"Created coupon '{coupon.code}' for promotion '{coupon.promotion.name}'",
            after_data=serializer.data
        )

    @action(detail=False, methods=["post"], url_path="bulk-generate")
    def bulk_generate(self, request):
        """
        Secure bulk coupon code generator with collision prevention.
        """
        self.check_user_permission("marketing.create")
        serializer = BulkCouponCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        restaurant = self.get_restaurant()
        promotion = Promotion.objects.filter(restaurant=restaurant, id=data["promotion_id"]).first()
        if not promotion:
            raise NotFound("Promotion not found.")

        count = data["count"]
        prefix = data.get("prefix", "SAVE").upper()
        usage_limit = data.get("usage_limit")
        per_cust_limit = data.get("per_customer_limit", 1)
        valid_from = data.get("valid_from", promotion.start_at)
        valid_until = data.get("valid_until", promotion.end_at)

        created_coupons = []
        with transaction.atomic():
            for _ in range(count):
                for _ in range(10):
                    code = Coupon.generate_secure_code(prefix=prefix, length=6)
                    if not Coupon.objects.filter(restaurant=restaurant, code=code).exists():
                        break
                coupon = Coupon.objects.create(
                    restaurant=restaurant,
                    promotion=promotion,
                    code=code,
                    status=CouponStatus.ACTIVE,
                    usage_limit=usage_limit,
                    per_customer_limit=per_cust_limit,
                    valid_from=valid_from,
                    valid_until=valid_until,
                )
                created_coupons.append(coupon)

        AuditLogService.record(
            restaurant=restaurant,
            action=AuditAction.CREATE,
            entity_type=AuditEntityType.COUPON,
            entity_id=str(promotion.id),
            actor_user=self.request.user,
            description=f"Generated {len(created_coupons)} bulk coupons (prefix: {prefix}) for '{promotion.name}'",
            after_data={"count": len(created_coupons), "prefix": prefix}
        )

        return Response(
            CouponSerializer(created_coupons, many=True).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=["post"], url_path="validate")
    def validate(self, request):
        """
        Validate single coupon code against an active order & customer.
        """
        self.check_user_permission("marketing.view")
        serializer = CouponValidateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        restaurant = self.get_restaurant()
        order = Order.objects.filter(restaurant=restaurant, id=data["order_id"]).first()
        if not order:
            raise NotFound("Order not found.")

        customer = None
        if data.get("customer_id"):
            customer = Customer.objects.filter(restaurant=restaurant, id=data["customer_id"]).first()

        code = data["code"].strip().upper()
        coupon = Coupon.objects.filter(restaurant=restaurant, code=code).select_related("promotion").first()
        if not coupon:
            return Response({"valid": False, "reason": f"Coupon code '{code}' does not exist."}, status=status.HTTP_200_OK)

        is_elig, reason, _ = PromotionEligibilityService.evaluate_promotion(
            promotion=coupon.promotion,
            order=order,
            customer=customer,
            coupon_code=code
        )

        if not is_elig:
            return Response({"valid": False, "reason": reason, "coupon": CouponSerializer(coupon).data}, status=status.HTTP_200_OK)

        discount_amount = PromotionCalculationService.calculate_discount_amount(coupon.promotion, order)
        return Response({
            "valid": True,
            "reason": "Coupon is valid and applicable.",
            "coupon": CouponSerializer(coupon).data,
            "promotion": PromotionSerializer(coupon.promotion).data,
            "discount_amount": str(discount_amount),
        }, status=status.HTTP_200_OK)


class CustomerSegmentViewSet(TenantMarketingBaseViewSet):
    """
    CRUD and dynamic audience calculation for customer segments.
    """
    serializer_class = CustomerSegmentSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["segment_type", "is_active"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def list(self, request, *args, **kwargs):
        self.check_user_permission("marketing.view")
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        self.check_user_permission("marketing.view")
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        self.check_user_permission("marketing.create")
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        self.check_user_permission("marketing.manage")
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self.check_user_permission("marketing.manage")
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self.check_user_permission("marketing.delete")
        return super().destroy(request, *args, **kwargs)

    def get_queryset(self):
        restaurant = self.get_restaurant()
        return CustomerSegment.objects.filter(restaurant=restaurant).prefetch_related("tags", "loyalty_tiers")

    def perform_create(self, serializer):
        restaurant = self.get_restaurant()
        segment = serializer.save(restaurant=restaurant)
        AuditLogService.record(
            restaurant=restaurant,
            action=AuditAction.CREATE,
            entity_type=AuditEntityType.CUSTOMER_SEGMENT,
            entity_id=str(segment.id),
            actor_user=self.request.user,
            description=f"Created customer segment '{segment.name}'",
            after_data=serializer.data
        )

    @action(detail=True, methods=["get"])
    def preview(self, request, pk=None):
        self.check_user_permission("marketing.view")
        segment = self.get_object()
        customers_qs = CustomerSegmentService.get_segment_customers_queryset(segment)
        total_count = customers_qs.count()

        sample_customers = [
            {
                "id": str(c.id),
                "name": c.full_name,
                "phone_masked": c.phone[:3] + "****" + c.phone[-2:] if len(c.phone) >= 5 else c.phone,
                "total_visits": c.total_visits,
                "total_spend": str(c.total_spend),
                "last_visit_at": c.last_visit_at.strftime("%Y-%m-%d") if c.last_visit_at else "Never",
            }
            for c in customers_qs[:10]
        ]

        return Response({
            "segment_id": str(segment.id),
            "segment_name": segment.name,
            "total_audience_count": total_count,
            "sample_profiles": sample_customers,
        })


class CampaignViewSet(TenantMarketingBaseViewSet):
    """
    Management and broadcast execution for marketing campaigns.
    """
    serializer_class = CampaignSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "channel", "promotion", "target_segment"]
    search_fields = ["name", "title", "description"]
    ordering_fields = ["start_at", "created_at", "sent_count"]
    ordering = ["-start_at", "-created_at"]

    def list(self, request, *args, **kwargs):
        self.check_user_permission("marketing.view")
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        self.check_user_permission("marketing.view")
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        self.check_user_permission("marketing.create")
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        self.check_user_permission("marketing.manage")
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self.check_user_permission("marketing.manage")
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self.check_user_permission("marketing.delete")
        return super().destroy(request, *args, **kwargs)

    def get_queryset(self):
        restaurant = self.get_restaurant()
        return Campaign.objects.filter(restaurant=restaurant).select_related("promotion", "target_segment")

    def perform_create(self, serializer):
        restaurant = self.get_restaurant()
        campaign = serializer.save(restaurant=restaurant, created_by=self.request.user)
        AuditLogService.record(
            restaurant=restaurant,
            action=AuditAction.CREATE,
            entity_type=AuditEntityType.CAMPAIGN,
            entity_id=str(campaign.id),
            actor_user=self.request.user,
            description=f"Created marketing campaign '{campaign.name}' ({campaign.get_channel_display()})",
            after_data=serializer.data
        )

    @action(detail=True, methods=["post"])
    def launch(self, request, pk=None):
        self.check_user_permission("marketing.manage")
        campaign = self.get_object()
        result = CampaignService.launch_campaign(campaign=campaign, actor_user=request.user)
        return Response(result)

    @action(detail=True, methods=["post"])
    def pause(self, request, pk=None):
        self.check_user_permission("marketing.manage")
        campaign = self.get_object()
        campaign.status = CampaignStatus.PAUSED
        campaign.save(update_fields=["status"])
        return Response({"status": "PAUSED", "message": f"Campaign '{campaign.name}' paused."})


class MarketingConsentViewSet(TenantMarketingBaseViewSet):
    """
    Customer marketing communication consent ledger.
    """
    serializer_class = MarketingConsentSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["channel", "status", "customer"]
    search_fields = ["customer__first_name", "customer__last_name", "customer__phone"]

    def list(self, request, *args, **kwargs):
        self.check_user_permission("marketing.view")
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        restaurant = self.get_restaurant()
        return MarketingConsent.objects.filter(restaurant=restaurant).select_related("customer")

    @action(detail=False, methods=["post"])
    def update_consent(self, request):
        self.check_user_permission("marketing.manage")
        restaurant = self.get_restaurant()
        customer_id = request.data.get("customer_id")
        channel = request.data.get("channel", "EMAIL")
        status_val = request.data.get("status", "GRANTED")
        source = request.data.get("source", "STAFF_PORTAL")
        notes = request.data.get("notes", "")

        customer = Customer.objects.filter(restaurant=restaurant, id=customer_id).first()
        if not customer:
            raise NotFound("Customer not found.")

        consent = MarketingConsentService.set_consent(
            restaurant=restaurant,
            customer=customer,
            channel=channel,
            status=status_val,
            source=source,
            actor_user=request.user,
            notes=notes
        )
        return Response(MarketingConsentSerializer(consent).data)


class MarketingAnalyticsView(APIView):
    """
    High-level marketing metrics, redemptions, and campaign analytics.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        if not restaurant:
            raise PermissionDenied("User is not associated with an active restaurant.")

        if not request.user.is_superuser:
            perms = RBACService.get_effective_permissions(user=request.user, tenant_id=restaurant.id)
            if "marketing.view" not in perms:
                raise PermissionDenied("Missing required permission: marketing.view")

        overview = MarketingAnalyticsService.get_marketing_overview(restaurant=restaurant)
        return Response(overview)
