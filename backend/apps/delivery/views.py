from decimal import Decimal
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError, NotFound

from apps.restaurants.models import Restaurant
from apps.restaurants.services import RestaurantService
from apps.customers.models import Customer
from apps.delivery.models import (
    CustomerAddress,
    DeliveryZone,
    DeliveryDriver,
    Delivery,
    DeliveryEvent,
)
from apps.delivery.serializers import (
    CustomerAddressSerializer,
    DeliveryZoneSerializer,
    DeliveryDriverSerializer,
    DeliveryEventSerializer,
    DeliveryListSerializer,
    DeliveryDetailSerializer,
    AssignDriverRequestSerializer,
    DeliveryFailRequestSerializer,
    DriverAvailabilityUpdateSerializer,
    DeliveryEstimateRequestSerializer,
)
from apps.delivery.services import (
    DeliveryZoneService,
    DeliveryService,
    DriverService,
    DeliveryAnalyticsService,
)


class TenantDeliveryBaseViewSet:
    def get_restaurant(self) -> Restaurant:
        restaurant = getattr(self.request, "restaurant", None)
        if restaurant:
            return restaurant
        rest_id = (
            self.request.META.get("HTTP_X_RESTAURANT_ID")
            or self.request.META.get("HTTP_X_TENANT_ID")
            or getattr(self.request, "tenant_id", None)
        )
        if rest_id:
            try:
                return Restaurant.objects.get(id=rest_id)
            except (Restaurant.DoesNotExist, ValueError):
                pass
        staff = StaffProfile.objects.filter(user=self.request.user).first()
        if staff and staff.restaurant:
            return staff.restaurant
        membership = TenantMembership.objects.filter(user=self.request.user).first()
        if membership and membership.tenant_id:
            try:
                return Restaurant.objects.get(id=membership.tenant_id)
            except Restaurant.DoesNotExist:
                pass
        raise ValidationError("User is not associated with an active restaurant.")


class DeliveryZoneViewSet(TenantDeliveryBaseViewSet, viewsets.ModelViewSet):
    """
    CRUD management for restaurant delivery zones and fee rules.
    """
    serializer_class = DeliveryZoneSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        restaurant = self.get_restaurant()
        return DeliveryZone.objects.filter(restaurant=restaurant)

    def perform_create(self, serializer):
        restaurant = self.get_restaurant()
        serializer.save(restaurant=restaurant)


class DeliveryDriverViewSet(TenantDeliveryBaseViewSet, viewsets.ModelViewSet):
    """
    Management of delivery couriers and fleet availability.
    """
    serializer_class = DeliveryDriverSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        restaurant = self.get_restaurant()
        return DeliveryDriver.objects.filter(restaurant=restaurant).select_related("staff_profile", "staff_profile__user")

    def perform_create(self, serializer):
        restaurant = self.get_restaurant()
        serializer.save(restaurant=restaurant)

    @action(detail=True, methods=["patch", "post"], url_path="availability")
    def update_availability(self, request, pk=None):
        driver = self.get_object()
        serializer = DriverAvailabilityUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated_driver = DriverService.update_driver_availability(
            driver=driver,
            status_value=serializer.validated_data["availability_status"],
            actor_user=request.user,
        )
        return Response(self.get_serializer(updated_driver).data)


class DeliveryViewSet(TenantDeliveryBaseViewSet, viewsets.ReadOnlyModelViewSet):
    """
    Order fulfillment dispatch board and lifecycle transitions.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        restaurant = self.get_restaurant()
        qs = Delivery.objects.filter(restaurant=restaurant).select_related(
            "order", "customer", "zone", "assigned_driver", "assigned_driver__staff_profile"
        ).prefetch_related("order__items", "events")

        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        driver_id = self.request.query_params.get("driver_id")
        if driver_id:
            qs = qs.filter(assigned_driver_id=driver_id)

        zone_id = self.request.query_params.get("zone_id")
        if zone_id:
            qs = qs.filter(zone_id=zone_id)

        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                order__order_number__icontains=search
            ) | qs.filter(
                recipient_name__icontains=search
            ) | qs.filter(
                recipient_phone__icontains=search
            ) | qs.filter(
                postal_code__icontains=search
            )

        return qs

    def get_serializer_class(self):
        if self.action == "retrieve":
            return DeliveryDetailSerializer
        return DeliveryListSerializer

    @action(detail=False, methods=["get"], url_path="metrics")
    def get_metrics(self, request):
        restaurant = getattr(request, "restaurant", None)
        if not restaurant:
            return Response({"error": "No restaurant context."}, status=status.HTTP_400_BAD_REQUEST)
        metrics = DeliveryAnalyticsService.get_dashboard_metrics(restaurant)
        return Response(metrics)

    @action(detail=True, methods=["post"], url_path="assign")
    def assign_driver(self, request, pk=None):
        delivery = self.get_object()
        serializer = AssignDriverRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            driver = DeliveryDriver.objects.get(
                id=serializer.validated_data["driver_id"],
                restaurant=delivery.restaurant,
            )
        except DeliveryDriver.DoesNotExist:
            raise NotFound("Driver not found in this restaurant.")

        updated = DeliveryService.assign_driver(delivery=delivery, driver=driver, actor_user=request.user)
        return Response(DeliveryDetailSerializer(updated).data)

    @action(detail=True, methods=["post"], url_path="unassign")
    def unassign_driver(self, request, pk=None):
        delivery = self.get_object()
        reason = request.data.get("reason", "")
        updated = DeliveryService.unassign_driver(delivery=delivery, actor_user=request.user, reason=reason)
        return Response(DeliveryDetailSerializer(updated).data)

    @action(detail=True, methods=["post"], url_path="pickup")
    def mark_picked_up(self, request, pk=None):
        delivery = self.get_object()
        updated = DeliveryService.mark_picked_up(delivery=delivery, actor_user=request.user)
        return Response(DeliveryDetailSerializer(updated).data)

    @action(detail=True, methods=["post"], url_path="start")
    def start_delivery(self, request, pk=None):
        delivery = self.get_object()
        updated = DeliveryService.start_delivery(delivery=delivery, actor_user=request.user)
        return Response(DeliveryDetailSerializer(updated).data)

    @action(detail=True, methods=["post"], url_path="complete")
    def complete_delivery(self, request, pk=None):
        delivery = self.get_object()
        pin = request.data.get("pin")
        updated = DeliveryService.complete_delivery(delivery=delivery, actor_user=request.user, pin=pin)
        return Response(DeliveryDetailSerializer(updated).data)

    @action(detail=True, methods=["post"], url_path="fail")
    def fail_delivery(self, request, pk=None):
        delivery = self.get_object()
        serializer = DeliveryFailRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = DeliveryService.fail_delivery(
            delivery=delivery,
            reason=serializer.validated_data["reason"],
            actor_user=request.user,
        )
        return Response(DeliveryDetailSerializer(updated).data)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel_delivery(self, request, pk=None):
        delivery = self.get_object()
        reason = request.data.get("reason", "Customer / Dispatch cancelled")
        updated = DeliveryService.cancel_delivery(delivery=delivery, reason=reason, actor_user=request.user)
        return Response(DeliveryDetailSerializer(updated).data)

    @action(detail=True, methods=["get"], url_path="events")
    def get_events(self, request, pk=None):
        delivery = self.get_object()
        events = delivery.events.all()
        return Response(DeliveryEventSerializer(events, many=True).data)


class CustomerAddressViewSet(viewsets.ModelViewSet):
    """
    Saved address management for authenticated dining customers.
    """
    serializer_class = CustomerAddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        try:
            customer = Customer.objects.get(phone=user.phone) if hasattr(user, "phone") and user.phone else None
        except Customer.DoesNotExist:
            customer = None

        if not customer:
            # Fallback search by email
            customer = Customer.objects.filter(email=user.email).first()

        if not customer:
            return CustomerAddress.objects.none()
        return CustomerAddress.objects.filter(customer=customer, is_active=True)

    def perform_create(self, serializer):
        user = self.request.user
        restaurant = getattr(self.request, "restaurant", None)
        customer = Customer.objects.filter(phone=user.phone).first() if hasattr(user, "phone") and user.phone else None
        if not customer and restaurant:
            customer, _ = Customer.objects.get_or_create(
                restaurant=restaurant,
                phone=getattr(user, "phone", "") or "0000000000",
                defaults={"first_name": user.first_name or "Customer", "last_name": user.last_name or ""},
            )
        if not customer:
            raise ValidationError("Unable to resolve customer CRM profile.")
        serializer.save(customer=customer)


class PublicDeliveryEstimateView(APIView):
    """
    Public endpoint for calculating delivery zone, fee, and transit estimation.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, slug=None):
        restaurant_slug = slug or request.data.get("restaurant_slug")
        if not restaurant_slug:
            return Response({"error": "restaurant_slug is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            restaurant = Restaurant.objects.get(slug=restaurant_slug, is_active=True)
        except Restaurant.DoesNotExist:
            return Response({"error": "Restaurant not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = DeliveryEstimateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        postal_code = serializer.validated_data["postal_code"]
        subtotal = serializer.validated_data.get("subtotal", Decimal("0.00"))

        zone = DeliveryZoneService.match_zone_for_address(restaurant=restaurant, postal_code=postal_code)
        fee = DeliveryZoneService.calculate_delivery_fee(restaurant=restaurant, subtotal=subtotal, zone=zone)
        min_mins, max_mins, time_label = DeliveryZoneService.estimate_delivery_window(restaurant=restaurant, zone=zone)

        eligible = True
        reason = ""
        if zone and zone.minimum_order and subtotal < zone.minimum_order:
            eligible = False
            reason = f"Minimum order amount for this zone is ${zone.minimum_order}."

        return Response({
            "eligible": eligible,
            "reason": reason,
            "zone_id": str(zone.id) if zone else None,
            "zone_name": zone.name if zone else "Default Area",
            "delivery_fee": str(fee),
            "estimated_minutes_min": min_mins,
            "estimated_minutes_max": max_mins,
            "estimated_time_label": time_label,
        })
