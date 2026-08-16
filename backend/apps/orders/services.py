from decimal import Decimal
from typing import List, Dict, Any, Optional
from django.db import transaction
from django.db.models import Sum, Q
from rest_framework.exceptions import ValidationError
from apps.restaurants.models import Restaurant
from apps.tables.models import RestaurantTable
from apps.menu.models import MenuItem
from apps.orders.models import Order, OrderItem

class OrderService:
    """
    Core domain service managing restaurant order placement, price snapshotting,
    authoritative totals, status state machine, and table occupancy synchronization.
    """

    @classmethod
    def generate_order_number(cls, restaurant: Restaurant) -> str:
        """Generate next sequential human-readable order number for restaurant (ORD-000001)."""
        count = Order.objects.filter(restaurant=restaurant).count() + 1
        return f"ORD-{count:06d}"

    @classmethod
    def recalculate_order_totals(cls, order: Order) -> Order:
        """Atomically calculate subtotal and total from all linked order item lines."""
        subtotal = (
            order.items.aggregate(total=Sum("line_total"))["total"] or Decimal("0.00")
        )
        order.subtotal = subtotal
        order.total = subtotal
        order.save(update_fields=["subtotal", "total", "updated_at"])
        return order

    @classmethod
    def _sync_table_occupancy_on_order_finish(cls, table: Optional[RestaurantTable]):
        """Free table to AVAILABLE if no other PLACED orders remain on it."""
        if table:
            has_active_orders = Order.objects.filter(
                table=table,
                status=Order.OrderStatus.PLACED
            ).exists()
            if not has_active_orders and table.status == RestaurantTable.TableStatus.OCCUPIED:
                table.status = RestaurantTable.TableStatus.AVAILABLE
                table.save(update_fields=["status", "updated_at"])

    @classmethod
    def create_order(
        cls,
        restaurant: Restaurant,
        user: Any,
        items_data: List[Dict[str, Any]],
        table_id: Optional[str] = None,
        notes: str = "",
        status_value: str = Order.OrderStatus.PLACED,
    ) -> Order:
        """
        Create a new restaurant order with snapshot item prices and atomic table occupancy sync.
        """
        if not items_data:
            raise ValidationError({"items": ["An order must contain at least one menu item."]})

        with transaction.atomic():
            # 1. Table validation
            table = None
            if table_id:
                table = RestaurantTable.objects.select_for_update().filter(
                    id=table_id, restaurant=restaurant
                ).first()
                if not table:
                    raise ValidationError({"table_id": ["Selected table does not exist in your restaurant."]})
                if not table.is_active:
                    raise ValidationError({"table_id": ["Selected table is currently inactive on the floor plan."]})
                if table.status == RestaurantTable.TableStatus.OUT_OF_SERVICE:
                    raise ValidationError({"table_id": ["Selected table is currently out of service."]})

            # 2. Validate menu items and snapshot data
            prepared_items = []
            for idx, item_input in enumerate(items_data):
                menu_item_id = item_input.get("menu_item_id")
                qty = int(item_input.get("quantity", 1))
                item_notes = item_input.get("notes", "").strip()

                if qty < 1:
                    raise ValidationError({f"items[{idx}].quantity": ["Item quantity must be at least 1."]})

                menu_item = MenuItem.objects.filter(id=menu_item_id, restaurant=restaurant).first()
                if not menu_item:
                    raise ValidationError({f"items[{idx}].menu_item_id": ["Menu item does not exist in your restaurant catalog."]})

                if not menu_item.is_active:
                    raise ValidationError({f"items[{idx}]": [f"'{menu_item.name}' is inactive and cannot be ordered."]})

                if not menu_item.is_available:
                    raise ValidationError({f"items[{idx}]": [f"'{menu_item.name}' is currently 86'd / out-of-stock."]})

                line_total = menu_item.price * Decimal(qty)
                prepared_items.append({
                    "menu_item": menu_item,
                    "item_name_snapshot": menu_item.name,
                    "unit_price_snapshot": menu_item.price,
                    "quantity": qty,
                    "line_total": line_total,
                    "notes": item_notes,
                })

            # 3. Create Order
            order_number = cls.generate_order_number(restaurant)
            order = Order.objects.create(
                restaurant=restaurant,
                order_number=order_number,
                table=table,
                created_by=user,
                status=status_value,
                notes=notes.strip(),
                subtotal=Decimal("0.00"),
                total=Decimal("0.00"),
            )

            # 4. Create OrderItems
            subtotal = Decimal("0.00")
            for item in prepared_items:
                OrderItem.objects.create(
                    order=order,
                    menu_item=item["menu_item"],
                    item_name_snapshot=item["item_name_snapshot"],
                    unit_price_snapshot=item["unit_price_snapshot"],
                    quantity=item["quantity"],
                    line_total=item["line_total"],
                    notes=item["notes"],
                )
                subtotal += item["line_total"]

            order.subtotal = subtotal
            order.total = subtotal
            order.save(update_fields=["subtotal", "total"])

            # 5. Sync table occupancy
            if table and status_value == Order.OrderStatus.PLACED:
                if table.status == RestaurantTable.TableStatus.AVAILABLE:
                    table.status = RestaurantTable.TableStatus.OCCUPIED
                    table.save(update_fields=["status", "updated_at"])

            # 6. Spawn kitchen preparation ticket
            if status_value == Order.OrderStatus.PLACED:
                from apps.kitchen.services import KitchenService
                KitchenService.create_ticket_for_order(order)

            return order

    @classmethod
    def add_order_item(
        cls,
        order: Order,
        menu_item_id: str,
        quantity: int = 1,
        notes: str = "",
    ) -> OrderItem:
        """Add a menu item to an editable (DRAFT) order."""
        if not order.is_editable:
            raise ValidationError({"order": [f"Order {order.order_number} is in '{order.status}' status and cannot be modified."]})

        if quantity < 1:
            raise ValidationError({"quantity": ["Quantity must be at least 1."]})

        menu_item = MenuItem.objects.filter(id=menu_item_id, restaurant=order.restaurant).first()
        if not menu_item:
            raise ValidationError({"menu_item_id": ["Menu item does not exist in your restaurant catalog."]})

        if not menu_item.is_active or not menu_item.is_available:
            raise ValidationError({"menu_item_id": [f"'{menu_item.name}' is unavailable for ordering."]})

        with transaction.atomic():
            item = OrderItem.objects.create(
                order=order,
                menu_item=menu_item,
                item_name_snapshot=menu_item.name,
                unit_price_snapshot=menu_item.price,
                quantity=quantity,
                line_total=menu_item.price * Decimal(quantity),
                notes=notes.strip(),
            )
            cls.recalculate_order_totals(order)
            return item

    @classmethod
    def update_order_item(
        cls,
        order_item: OrderItem,
        quantity: Optional[int] = None,
        notes: Optional[str] = None,
    ) -> OrderItem:
        """Update line item quantity and notes on an editable order."""
        if not order_item.order.is_editable:
            raise ValidationError({"order": ["Only DRAFT orders can be edited."]})

        with transaction.atomic():
            if quantity is not None:
                if quantity < 1:
                    raise ValidationError({"quantity": ["Quantity must be at least 1."]})
                order_item.quantity = quantity
                order_item.calculate_line_total()

            if notes is not None:
                order_item.notes = notes.strip()

            order_item.save()
            cls.recalculate_order_totals(order_item.order)
            return order_item

    @classmethod
    def remove_order_item(cls, order_item: OrderItem):
        """Remove a line item from an editable order."""
        if not order_item.order.is_editable:
            raise ValidationError({"order": ["Only DRAFT orders can be modified."]})

        with transaction.atomic():
            order = order_item.order
            order_item.delete()
            cls.recalculate_order_totals(order)

    @classmethod
    def cancel_order(cls, order: Order) -> Order:
        """Cancel an active order and sync table availability."""
        if order.status in [Order.OrderStatus.CANCELLED, Order.OrderStatus.COMPLETED]:
            raise ValidationError({"status": [f"Cannot cancel order in '{order.status}' state."]})

        with transaction.atomic():
            order.status = Order.OrderStatus.CANCELLED
            order.save(update_fields=["status", "updated_at"])
            cls._sync_table_occupancy_on_order_finish(order.table)
            return order

    @classmethod
    def complete_order(cls, order: Order) -> Order:
        """Mark an order as fulfilled / completed and sync table availability."""
        if order.status != Order.OrderStatus.PLACED:
            raise ValidationError({"status": [f"Only PLACED orders can be marked as COMPLETED. Current status: '{order.status}'."]})

        with transaction.atomic():
            order.status = Order.OrderStatus.COMPLETED
            order.save(update_fields=["status", "updated_at"])
            cls._sync_table_occupancy_on_order_finish(order.table)
            return order
