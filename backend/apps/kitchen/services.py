import logging
from typing import Optional, Dict, Any
from django.utils import timezone
from django.db import transaction
from rest_framework.exceptions import ValidationError
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from apps.orders.models import Order
from apps.kitchen.models import KitchenTicket
from apps.orders.services import OrderService

logger = logging.getLogger("fluxiflow.kitchen")

class KitchenService:
    """
    Domain service for Kitchen Display System (KDS) ticketing, bump bar operations,
    and real-time event broadcasting over Redis Channel Layer.
    """

    @classmethod
    def broadcast_kitchen_event(cls, restaurant_id: str, event_type: str, data: Dict[str, Any]):
        """Publish real-time domain event to restaurant-isolated WebSocket group."""
        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                group_name = f"restaurant_{restaurant_id}_kitchen"
                payload = {
                    "type": "kitchen_event",
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
            logger.warning(f"Failed to broadcast kitchen event {event_type} to group {restaurant_id}: {err}")

    @classmethod
    def create_ticket_for_order(cls, order: Order) -> KitchenTicket:
        """Create a new kitchen preparation ticket from a placed customer order."""
        with transaction.atomic():
            ticket, created = KitchenTicket.objects.get_or_create(
                restaurant=order.restaurant,
                order=order,
                defaults={"status": KitchenTicket.KitchenStatus.NEW},
            )

            if created:
                cls.broadcast_kitchen_event(
                    restaurant_id=str(order.restaurant.id),
                    event_type="KITCHEN_ORDER_CREATED",
                    data={
                        "ticket_id": str(ticket.id),
                        "order_id": str(order.id),
                        "order_number": order.order_number,
                        "table_name": order.table.name if order.table else None,
                        "status": ticket.status,
                        "created_at": ticket.created_at.isoformat(),
                    }
                )
            return ticket

    @classmethod
    def start_preparing(cls, ticket: KitchenTicket) -> KitchenTicket:
        """Advance kitchen ticket from NEW -> PREPARING."""
        if ticket.status != KitchenTicket.KitchenStatus.NEW:
            raise ValidationError({"status": [f"Cannot start preparation for ticket in '{ticket.status}' status."]})

        with transaction.atomic():
            ticket.status = KitchenTicket.KitchenStatus.PREPARING
            ticket.started_at = timezone.now()
            ticket.save(update_fields=["status", "started_at", "updated_at"])

            cls.broadcast_kitchen_event(
                restaurant_id=str(ticket.restaurant.id),
                event_type="KITCHEN_STATUS_CHANGED",
                data={
                    "ticket_id": str(ticket.id),
                    "order_id": str(ticket.order.id),
                    "order_number": ticket.order.order_number,
                    "status": ticket.status,
                    "started_at": ticket.started_at.isoformat(),
                }
            )
            return ticket

    @classmethod
    def mark_ready(cls, ticket: KitchenTicket) -> KitchenTicket:
        """Advance kitchen ticket from PREPARING -> READY."""
        if ticket.status not in [KitchenTicket.KitchenStatus.PREPARING, KitchenTicket.KitchenStatus.NEW]:
            raise ValidationError({"status": [f"Cannot mark ticket ready from '{ticket.status}' status."]})

        with transaction.atomic():
            ticket.status = KitchenTicket.KitchenStatus.READY
            ticket.ready_at = timezone.now()
            ticket.save(update_fields=["status", "ready_at", "updated_at"])

            cls.broadcast_kitchen_event(
                restaurant_id=str(ticket.restaurant.id),
                event_type="KITCHEN_STATUS_CHANGED",
                data={
                    "ticket_id": str(ticket.id),
                    "order_id": str(ticket.order.id),
                    "order_number": ticket.order.order_number,
                    "status": ticket.status,
                    "ready_at": ticket.ready_at.isoformat(),
                }
            )
            return ticket

    @classmethod
    def complete_ticket(cls, ticket: KitchenTicket) -> KitchenTicket:
        """Complete kitchen ticket (READY -> COMPLETED) and sync parent order."""
        if ticket.status not in [KitchenTicket.KitchenStatus.READY, KitchenTicket.KitchenStatus.PREPARING]:
            raise ValidationError({"status": [f"Cannot complete ticket in '{ticket.status}' status."]})

        with transaction.atomic():
            ticket.status = KitchenTicket.KitchenStatus.COMPLETED
            ticket.completed_at = timezone.now()
            ticket.save(update_fields=["status", "completed_at", "updated_at"])

            # Sync parent order
            order = ticket.order
            order.status = Order.OrderStatus.COMPLETED
            order.save(update_fields=["status", "updated_at"])
            OrderService._sync_table_occupancy_on_order_finish(order.table)

            # Trigger automated inventory consumption
            from apps.inventory.services import InventoryService
            InventoryService.consume_stock_for_order(order)

            cls.broadcast_kitchen_event(
                restaurant_id=str(ticket.restaurant.id),
                event_type="KITCHEN_STATUS_CHANGED",
                data={
                    "ticket_id": str(ticket.id),
                    "order_id": str(order.id),
                    "order_number": order.order_number,
                    "status": ticket.status,
                    "completed_at": ticket.completed_at.isoformat(),
                }
            )
            return ticket

    @classmethod
    def cancel_ticket(cls, ticket: KitchenTicket) -> KitchenTicket:
        """Cancel kitchen ticket and sync parent order."""
        if ticket.status in [KitchenTicket.KitchenStatus.CANCELLED, KitchenTicket.KitchenStatus.COMPLETED]:
            raise ValidationError({"status": [f"Cannot cancel ticket in '{ticket.status}' status."]})

        with transaction.atomic():
            ticket.status = KitchenTicket.KitchenStatus.CANCELLED
            ticket.save(update_fields=["status", "updated_at"])

            # Sync parent order
            order = ticket.order
            order.status = Order.OrderStatus.CANCELLED
            order.save(update_fields=["status", "updated_at"])
            OrderService._sync_table_occupancy_on_order_finish(order.table)

            # Reverse inventory consumption if previously consumed
            from apps.inventory.services import InventoryService
            InventoryService.reverse_order_consumption(order)

            cls.broadcast_kitchen_event(
                restaurant_id=str(ticket.restaurant.id),
                event_type="KITCHEN_ORDER_CANCELLED",
                data={
                    "ticket_id": str(ticket.id),
                    "order_id": str(order.id),
                    "order_number": order.order_number,
                    "status": ticket.status,
                }
            )
            return ticket
