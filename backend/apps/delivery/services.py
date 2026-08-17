import logging
from decimal import Decimal
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timedelta
from django.utils import timezone
from django.db import transaction
from django.db.models import Q, Count, Avg
from rest_framework.exceptions import ValidationError, NotFound, PermissionDenied
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from apps.restaurants.models import Restaurant
from apps.settings.models import RestaurantConfiguration
from apps.orders.models import Order
from apps.staff.models import StaffProfile
from apps.accounts.models import User
from apps.notifications.services import NotificationService
from apps.notifications.models import NotificationType, NotificationSeverity
from apps.audit.services import AuditLogService
from apps.audit.models import AuditAction, AuditEntityType
from apps.delivery.models import (
    CustomerAddress,
    DeliveryZone,
    DeliveryDriver,
    Delivery,
    DeliveryEvent,
)

logger = logging.getLogger("fluxiflow.delivery")


def broadcast_delivery_event(restaurant_id: str, event_type: str, data: Dict[str, Any]):
    """Broadcast real-time dispatch and delivery event across WebSocket channel layer."""
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            group_name = f"restaurant_{restaurant_id}_delivery"
            payload = {
                "type": "delivery_event",
                "event_type": event_type,
                "data": data,
                "timestamp": timezone.now().isoformat(),
            }
            try:
                import asyncio
                loop = asyncio.get_running_loop()
            except RuntimeError:
                loop = None

            if loop and loop.is_running():
                asyncio.create_task(channel_layer.group_send(group_name, payload))
            else:
                async_to_sync(channel_layer.group_send)(group_name, payload)
    except Exception as err:
        logger.warning(f"Failed to broadcast delivery event {event_type}: {err}")


class DeliveryZoneService:
    """
    Geographic delivery zone resolution, fee determination, and transit estimation.
    """

    @classmethod
    def match_zone_for_address(
        cls, restaurant: Restaurant, postal_code: str
    ) -> Optional[DeliveryZone]:
        """
        Matches active delivery zones for a restaurant by postal code or prefix,
        resolving ambiguity via highest priority ranking.
        """
        code = str(postal_code).strip().upper()
        if not code:
            return None

        zones = DeliveryZone.objects.filter(
            restaurant=restaurant, is_active=True
        ).order_by("-priority", "name")

        for zone in zones:
            for pattern in zone.postal_codes:
                clean_pat = str(pattern).strip().upper()
                if code == clean_pat or code.startswith(clean_pat):
                    return zone

        return None

    @classmethod
    def calculate_delivery_fee(
        cls,
        restaurant: Restaurant,
        subtotal: Decimal,
        zone: Optional[DeliveryZone] = None,
    ) -> Decimal:
        """
        Computes authoritative delivery fee taking into account zone overrides
        and restaurant-level free delivery thresholds.
        """
        config, _ = RestaurantConfiguration.objects.get_or_create(restaurant=restaurant)

        # Free delivery threshold check
        if (
            config.free_delivery_threshold
            and config.free_delivery_threshold > Decimal("0.00")
            and subtotal >= config.free_delivery_threshold
        ):
            return Decimal("0.00")

        if zone and zone.fee is not None:
            return zone.fee

        return config.default_delivery_fee or Decimal("5.00")

    @classmethod
    def estimate_delivery_window(
        cls, restaurant: Restaurant, zone: Optional[DeliveryZone] = None
    ) -> Tuple[int, int, str]:
        """
        Returns estimated min minutes, max minutes, and human-readable label.
        """
        config, _ = RestaurantConfiguration.objects.get_or_create(restaurant=restaurant)
        prep_time = config.default_prep_time_minutes or 20
        transit_time = zone.estimated_minutes if zone else (config.estimated_delivery_buffer_minutes or 15)

        min_minutes = prep_time + transit_time
        max_minutes = min_minutes + 15
        label = f"{min_minutes}–{max_minutes} mins"
        return min_minutes, max_minutes, label


class DeliveryService:
    """
    Core domain service managing the lifecycle, driver assignment,
    and state transitions of restaurant delivery orders.
    """

    @classmethod
    def create_delivery_for_order(
        cls,
        order: Order,
        address_data: Dict[str, Any],
        zone: Optional[DeliveryZone] = None,
        delivery_fee: Optional[Decimal] = None,
        actor_user: Optional[User] = None,
    ) -> Delivery:
        """
        Creates a new delivery fulfillment record with an immutable address snapshot.
        """
        if order.order_type != Order.OrderType.DELIVERY:
            order.order_type = Order.OrderType.DELIVERY
            order.save(update_fields=["order_type", "updated_at"])

        with transaction.atomic():
            fee = (
                delivery_fee
                if delivery_fee is not None
                else DeliveryZoneService.calculate_delivery_fee(
                    restaurant=order.restaurant,
                    subtotal=order.subtotal,
                    zone=zone,
                )
            )

            min_mins, _, _ = DeliveryZoneService.estimate_delivery_window(
                restaurant=order.restaurant, zone=zone
            )
            estimated_time = timezone.now() + timedelta(minutes=min_mins)

            delivery, created = Delivery.objects.get_or_create(
                order=order,
                defaults={
                    "restaurant": order.restaurant,
                    "customer": order.customer,
                    "zone": zone,
                    "status": Delivery.DeliveryStatus.PENDING,
                    "recipient_name": address_data.get("recipient_name") or order.guest_name or "Guest Customer",
                    "recipient_phone": address_data.get("phone") or order.guest_phone or "",
                    "address_line_1": address_data.get("address_line_1", "").strip(),
                    "address_line_2": address_data.get("address_line_2", "").strip(),
                    "landmark": address_data.get("landmark", "").strip(),
                    "city": address_data.get("city", "").strip(),
                    "state": address_data.get("state", "").strip(),
                    "postal_code": address_data.get("postal_code", "").strip(),
                    "delivery_instructions": address_data.get("delivery_instructions", "").strip(),
                    "delivery_fee": fee,
                    "estimated_delivery_at": estimated_time,
                },
            )

            if created:
                DeliveryEvent.objects.create(
                    delivery=delivery,
                    event_type="DELIVERY_CREATED",
                    actor=actor_user,
                    notes=f"Delivery created for order #{order.order_number}",
                )

                broadcast_delivery_event(
                    restaurant_id=str(order.restaurant_id),
                    event_type="DELIVERY_CREATED",
                    data={
                        "delivery_id": str(delivery.id),
                        "order_number": order.order_number,
                        "recipient_name": delivery.recipient_name,
                        "status": delivery.status,
                    },
                )

            return delivery

    @classmethod
    def assign_driver(
        cls, delivery: Delivery, driver: DeliveryDriver, actor_user: User
    ) -> Delivery:
        """
        Atomically assigns an active, available delivery driver to an order.
        """
        if delivery.restaurant_id != driver.restaurant_id:
            raise ValidationError({"driver_id": ["Driver belongs to a different restaurant organization."]})

        if not driver.is_active:
            raise ValidationError({"driver_id": ["Selected driver account is inactive."]})

        if delivery.status in [Delivery.DeliveryStatus.DELIVERED, Delivery.DeliveryStatus.CANCELLED, Delivery.DeliveryStatus.FAILED]:
            raise ValidationError({"delivery": [f"Cannot assign driver to a delivery in '{delivery.status}' status."]})

        with transaction.atomic():
            locked_delivery = Delivery.objects.select_for_update().get(id=delivery.id)
            locked_driver = DeliveryDriver.objects.select_for_update().get(id=driver.id)

            old_driver = locked_delivery.assigned_driver
            if old_driver and old_driver.id != locked_driver.id:
                # Decrement previous driver's active delivery count
                old_driver.active_deliveries_count = max(0, old_driver.active_deliveries_count - 1)
                if old_driver.active_deliveries_count == 0:
                    old_driver.availability_status = DeliveryDriver.AvailabilityStatus.AVAILABLE
                old_driver.save(update_fields=["active_deliveries_count", "availability_status", "updated_at"])

            locked_delivery.assigned_driver = locked_driver
            locked_delivery.assigned_at = timezone.now()
            if locked_delivery.status in [Delivery.DeliveryStatus.PENDING, Delivery.DeliveryStatus.READY_FOR_DISPATCH]:
                locked_delivery.status = Delivery.DeliveryStatus.ASSIGNED
            locked_delivery.save(update_fields=["assigned_driver", "assigned_at", "status", "updated_at"])

            locked_driver.active_deliveries_count += 1
            locked_driver.availability_status = DeliveryDriver.AvailabilityStatus.BUSY
            locked_driver.save(update_fields=["active_deliveries_count", "availability_status", "updated_at"])

            # Operational event & audit logging
            DeliveryEvent.objects.create(
                delivery=locked_delivery,
                event_type="DRIVER_ASSIGNED",
                actor=actor_user,
                notes=f"Assigned driver {locked_driver.full_name}",
            )

            AuditLogService.record(
                action=AuditAction.STATUS_CHANGED,
                entity_type=AuditEntityType.DELIVERY,
                entity_id=str(locked_delivery.id),
                description=f"Assigned driver {locked_driver.full_name} to delivery #{locked_delivery.order.order_number}",
                restaurant=locked_delivery.restaurant,
                actor_user=actor_user,
            )

            # Send Notification to Driver
            if locked_driver.staff_profile and locked_driver.staff_profile.user:
                NotificationService.create_notification(
                    restaurant=locked_delivery.restaurant,
                    recipient=locked_driver.staff_profile.user,
                    title="🛵 New Delivery Assignment",
                    message=f"You have been assigned order #{locked_delivery.order.order_number} to {locked_delivery.recipient_name}.",
                    notification_type=NotificationType.DELIVERY_ASSIGNED,
                    severity=NotificationSeverity.INFO,
                    action_url=f"/delivery/{locked_delivery.id}",
                    entity_type="delivery",
                    entity_id=str(locked_delivery.id),
                )

            broadcast_delivery_event(
                restaurant_id=str(locked_delivery.restaurant_id),
                event_type="DELIVERY_ASSIGNED",
                data={
                    "delivery_id": str(locked_delivery.id),
                    "order_number": locked_delivery.order.order_number,
                    "driver_id": str(locked_driver.id),
                    "driver_name": locked_driver.full_name,
                    "status": locked_delivery.status,
                },
            )

            return locked_delivery

    @classmethod
    def unassign_driver(cls, delivery: Delivery, actor_user: User, reason: str = "") -> Delivery:
        """
        Unassigns driver and returns delivery to READY_FOR_DISPATCH status.
        """
        if not delivery.assigned_driver:
            return delivery

        with transaction.atomic():
            locked_delivery = Delivery.objects.select_for_update().get(id=delivery.id)
            driver = DeliveryDriver.objects.select_for_update().get(id=locked_delivery.assigned_driver_id)

            driver.active_deliveries_count = max(0, driver.active_deliveries_count - 1)
            if driver.active_deliveries_count == 0:
                driver.availability_status = DeliveryDriver.AvailabilityStatus.AVAILABLE
            driver.save(update_fields=["active_deliveries_count", "availability_status", "updated_at"])

            old_driver_name = driver.full_name
            locked_delivery.assigned_driver = None
            locked_delivery.status = Delivery.DeliveryStatus.READY_FOR_DISPATCH
            locked_delivery.save(update_fields=["assigned_driver", "status", "updated_at"])

            DeliveryEvent.objects.create(
                delivery=locked_delivery,
                event_type="DRIVER_UNASSIGNED",
                actor=actor_user,
                notes=f"Unassigned driver {old_driver_name}. Reason: {reason}",
            )

            broadcast_delivery_event(
                restaurant_id=str(locked_delivery.restaurant_id),
                event_type="DELIVERY_UNASSIGNED",
                data={
                    "delivery_id": str(locked_delivery.id),
                    "status": locked_delivery.status,
                },
            )
            return locked_delivery

    @classmethod
    def mark_picked_up(cls, delivery: Delivery, actor_user: User) -> Delivery:
        """
        Transitions delivery state to PICKED_UP by driver.
        """
        if delivery.status not in [Delivery.DeliveryStatus.READY_FOR_DISPATCH, Delivery.DeliveryStatus.ASSIGNED]:
            raise ValidationError({"status": [f"Cannot mark picked up from '{delivery.status}' status."]})

        with transaction.atomic():
            delivery.status = Delivery.DeliveryStatus.PICKED_UP
            delivery.picked_up_at = timezone.now()
            delivery.save(update_fields=["status", "picked_up_at", "updated_at"])

            DeliveryEvent.objects.create(
                delivery=delivery,
                event_type="PICKED_UP",
                actor=actor_user,
                notes="Driver picked up order from kitchen dispatch",
            )

            broadcast_delivery_event(
                restaurant_id=str(delivery.restaurant_id),
                event_type="DELIVERY_PICKED_UP",
                data={"delivery_id": str(delivery.id), "status": delivery.status},
            )
            return delivery

    @classmethod
    def start_delivery(cls, delivery: Delivery, actor_user: User) -> Delivery:
        """
        Transitions delivery state to OUT_FOR_DELIVERY.
        """
        if delivery.status not in [Delivery.DeliveryStatus.PICKED_UP, Delivery.DeliveryStatus.ASSIGNED]:
            raise ValidationError({"status": [f"Cannot start delivery from '{delivery.status}' status."]})

        with transaction.atomic():
            delivery.status = Delivery.DeliveryStatus.OUT_FOR_DELIVERY
            delivery.save(update_fields=["status", "updated_at"])

            DeliveryEvent.objects.create(
                delivery=delivery,
                event_type="OUT_FOR_DELIVERY",
                actor=actor_user,
                notes="Driver is en route to customer doorstep",
            )

            broadcast_delivery_event(
                restaurant_id=str(delivery.restaurant_id),
                event_type="DELIVERY_OUT_FOR_DELIVERY",
                data={"delivery_id": str(delivery.id), "status": delivery.status},
            )
            return delivery

    @classmethod
    def complete_delivery(
        cls, delivery: Delivery, actor_user: User, pin: Optional[str] = None
    ) -> Delivery:
        """
        Transitions delivery state to DELIVERED, releases driver workload,
        and marks parent Order as COMPLETED.
        """
        if delivery.status == Delivery.DeliveryStatus.DELIVERED:
            return delivery

        if delivery.status not in [
            Delivery.DeliveryStatus.OUT_FOR_DELIVERY,
            Delivery.DeliveryStatus.PICKED_UP,
            Delivery.DeliveryStatus.ASSIGNED,
        ]:
            raise ValidationError({"status": [f"Cannot complete delivery from '{delivery.status}' status."]})

        with transaction.atomic():
            delivery.status = Delivery.DeliveryStatus.DELIVERED
            delivery.delivered_at = timezone.now()
            delivery.save(update_fields=["status", "delivered_at", "updated_at"])

            # Release Driver
            if delivery.assigned_driver:
                driver = DeliveryDriver.objects.select_for_update().get(id=delivery.assigned_driver_id)
                driver.active_deliveries_count = max(0, driver.active_deliveries_count - 1)
                driver.total_completed_deliveries += 1
                if driver.active_deliveries_count == 0:
                    driver.availability_status = DeliveryDriver.AvailabilityStatus.AVAILABLE
                driver.save(update_fields=["active_deliveries_count", "total_completed_deliveries", "availability_status", "updated_at"])

            # Finalize parent Order
            delivery.order.status = Order.OrderStatus.COMPLETED
            delivery.order.save(update_fields=["status", "updated_at"])

            DeliveryEvent.objects.create(
                delivery=delivery,
                event_type="DELIVERED",
                actor=actor_user,
                notes="Order successfully delivered to customer",
            )

            AuditLogService.record(
                action=AuditAction.STATUS_CHANGED,
                entity_type=AuditEntityType.DELIVERY,
                entity_id=str(delivery.id),
                description=f"Delivery #{delivery.order.order_number} marked DELIVERED",
                restaurant=delivery.restaurant,
                actor_user=actor_user,
            )

            broadcast_delivery_event(
                restaurant_id=str(delivery.restaurant_id),
                event_type="DELIVERY_DELIVERED",
                data={"delivery_id": str(delivery.id), "status": delivery.status},
            )
            return delivery

    @classmethod
    def fail_delivery(cls, delivery: Delivery, reason: str, actor_user: User) -> Delivery:
        """
        Transitions delivery state to FAILED and releases driver.
        """
        with transaction.atomic():
            locked_delivery = Delivery.objects.select_for_update().get(id=delivery.id)
            locked_delivery.status = Delivery.DeliveryStatus.FAILED
            locked_delivery.failed_at = timezone.now()
            locked_delivery.failure_reason = reason.strip()
            locked_delivery.save(update_fields=["status", "failed_at", "failure_reason", "updated_at"])

            if locked_delivery.assigned_driver_id:
                driver = DeliveryDriver.objects.select_for_update().get(id=locked_delivery.assigned_driver_id)
                driver.active_deliveries_count = max(0, driver.active_deliveries_count - 1)
                if driver.active_deliveries_count == 0:
                    driver.availability_status = DeliveryDriver.AvailabilityStatus.AVAILABLE
                driver.save(update_fields=["active_deliveries_count", "availability_status", "updated_at"])

            DeliveryEvent.objects.create(
                delivery=locked_delivery,
                event_type="DELIVERY_FAILED",
                actor=actor_user,
                notes=f"Delivery failed. Reason: {reason}",
            )

            broadcast_delivery_event(
                restaurant_id=str(locked_delivery.restaurant_id),
                event_type="DELIVERY_FAILED",
                data={"delivery_id": str(locked_delivery.id), "status": locked_delivery.status, "reason": reason},
            )
            return locked_delivery

    @classmethod
    def cancel_delivery(cls, delivery: Delivery, reason: str, actor_user: User) -> Delivery:
        """
        Transitions delivery state to CANCELLED and marks parent Order CANCELLED.
        """
        with transaction.atomic():
            locked_delivery = Delivery.objects.select_for_update().get(id=delivery.id)
            locked_delivery.status = Delivery.DeliveryStatus.CANCELLED
            locked_delivery.cancelled_at = timezone.now()
            locked_delivery.failure_reason = f"Cancelled: {reason.strip()}"
            locked_delivery.save(update_fields=["status", "cancelled_at", "failure_reason", "updated_at"])

            if locked_delivery.assigned_driver_id:
                driver = DeliveryDriver.objects.select_for_update().get(id=locked_delivery.assigned_driver_id)
                driver.active_deliveries_count = max(0, driver.active_deliveries_count - 1)
                if driver.active_deliveries_count == 0:
                    driver.availability_status = DeliveryDriver.AvailabilityStatus.AVAILABLE
                driver.save(update_fields=["active_deliveries_count", "availability_status", "updated_at"])

            locked_delivery.order.status = Order.OrderStatus.CANCELLED
            locked_delivery.order.notes = f"{locked_delivery.order.notes} | CANCELLED: {reason}".strip(" |")
            locked_delivery.order.save(update_fields=["status", "notes", "updated_at"])

            DeliveryEvent.objects.create(
                delivery=locked_delivery,
                event_type="DELIVERY_CANCELLED",
                actor=actor_user,
                notes=f"Delivery cancelled: {reason}",
            )

            broadcast_delivery_event(
                restaurant_id=str(locked_delivery.restaurant_id),
                event_type="DELIVERY_CANCELLED",
                data={"delivery_id": str(locked_delivery.id), "status": locked_delivery.status},
            )
            return locked_delivery


class DriverService:
    """
    Fleet driver registration, profile management, and status updates.
    """

    @classmethod
    def update_driver_availability(
        cls, driver: DeliveryDriver, status_value: str, actor_user: User
    ) -> DeliveryDriver:
        """
        Updates driver shift availability status (AVAILABLE, BUSY, OFFLINE).
        """
        if status_value not in DeliveryDriver.AvailabilityStatus.values:
            raise ValidationError({"availability_status": [f"Invalid availability status '{status_value}'."]})

        driver.availability_status = status_value
        driver.save(update_fields=["availability_status", "updated_at"])

        AuditLogService.record(
            action=AuditAction.STATUS_CHANGED,
            entity_type=AuditEntityType.DELIVERY_DRIVER,
            entity_id=str(driver.id),
            description=f"Driver {driver.full_name} availability changed to {status_value}",
            restaurant=driver.restaurant,
            actor_user=actor_user,
        )
        return driver


class DeliveryAnalyticsService:
    """
    Operational reporting and performance KPIs for restaurant delivery fleet.
    """

    @classmethod
    def get_dashboard_metrics(cls, restaurant: Restaurant) -> Dict[str, Any]:
        """
        Returns real-time dispatch dashboard KPIs.
        """
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        deliveries_qs = Delivery.objects.filter(restaurant=restaurant)

        pending_count = deliveries_qs.filter(status=Delivery.DeliveryStatus.PENDING).count()
        ready_dispatch_count = deliveries_qs.filter(status=Delivery.DeliveryStatus.READY_FOR_DISPATCH).count()
        assigned_count = deliveries_qs.filter(status=Delivery.DeliveryStatus.ASSIGNED).count()
        out_for_delivery_count = deliveries_qs.filter(status=Delivery.DeliveryStatus.OUT_FOR_DELIVERY).count()

        completed_today_count = deliveries_qs.filter(
            status=Delivery.DeliveryStatus.DELIVERED, delivered_at__gte=today_start
        ).count()

        failed_today_count = deliveries_qs.filter(
            status=Delivery.DeliveryStatus.FAILED, failed_at__gte=today_start
        ).count()

        active_drivers_count = DeliveryDriver.objects.filter(
            restaurant=restaurant, is_active=True, availability_status=DeliveryDriver.AvailabilityStatus.AVAILABLE
        ).count()

        total_drivers_count = DeliveryDriver.objects.filter(restaurant=restaurant, is_active=True).count()

        return {
            "pending_count": pending_count,
            "ready_for_dispatch_count": ready_dispatch_count,
            "assigned_count": assigned_count,
            "out_for_delivery_count": out_for_delivery_count,
            "completed_today_count": completed_today_count,
            "failed_today_count": failed_today_count,
            "available_drivers_count": active_drivers_count,
            "total_drivers_count": total_drivers_count,
        }
