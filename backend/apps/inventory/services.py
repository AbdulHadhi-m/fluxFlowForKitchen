import logging
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, Dict, Any, List
from django.db import transaction
from rest_framework.exceptions import ValidationError
from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.orders.models import Order
from apps.inventory.models import (
    InventoryItem,
    StockMovement,
    Recipe,
    RecipeItem,
    InventoryConsumption,
    UnitOfMeasure,
)

logger = logging.getLogger("fluxiflow.inventory")

def quantize_stock(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)

class UnitConverter:
    """Central unit conversion between measurement units."""
    CONVERSION_FACTORS = {
        ("kg", "g"): Decimal("1000"),
        ("g", "kg"): Decimal("0.001"),
        ("l", "ml"): Decimal("1000"),
        ("ml", "l"): Decimal("0.001"),
    }

    @classmethod
    def convert(cls, value: Decimal, from_unit: str, to_unit: str) -> Decimal:
        if from_unit == to_unit:
            return value

        key = (from_unit, to_unit)
        if key in cls.CONVERSION_FACTORS:
            return quantize_stock(value * cls.CONVERSION_FACTORS[key])

        # If incompatible or unsupported conversion, return value as is
        return value

class InventoryService:
    """
    Domain service for stock movements, adjustments, wastage, recipe mapping,
    and automated idempotent order recipe ingredient deductions.
    """

    @classmethod
    def create_item(
        cls,
        restaurant: Restaurant,
        name: str,
        sku: str = "",
        unit: str = UnitOfMeasure.KG,
        minimum_stock_level: Decimal = Decimal("5.000"),
        cost_per_unit: Decimal = Decimal("0.00"),
        initial_quantity: Decimal = Decimal("0.000"),
        user: Optional[User] = None,
    ) -> InventoryItem:
        """Create a new raw material item with optional opening stock movement."""
        with transaction.atomic():
            init_qty = quantize_stock(Decimal(str(initial_quantity)))
            item = InventoryItem.objects.create(
                restaurant=restaurant,
                name=name.strip(),
                sku=sku.strip(),
                unit=unit,
                current_quantity=init_qty,
                minimum_stock_level=quantize_stock(Decimal(str(minimum_stock_level))),
                cost_per_unit=Decimal(str(cost_per_unit)),
                is_active=True,
            )

            if init_qty > Decimal("0.000"):
                StockMovement.objects.create(
                    restaurant=restaurant,
                    item=item,
                    movement_type=StockMovement.MovementType.OPENING,
                    quantity=init_qty,
                    quantity_before=Decimal("0.000"),
                    quantity_after=init_qty,
                    unit=unit,
                    reference_type="MANUAL",
                    reason="Opening stock balance initialization",
                    created_by=user,
                )

            return item

    @classmethod
    def receive_stock(
        cls,
        restaurant: Restaurant,
        item: InventoryItem,
        quantity: Decimal,
        unit: str,
        reference: str = "",
        reason: str = "",
        user: Optional[User] = None,
    ) -> StockMovement:
        """Record purchase / stock intake transaction with concurrency row-lock."""
        if item.restaurant_id != restaurant.id:
            raise ValidationError({"item_id": ["Item belongs to a different restaurant."]})

        qty_input = Decimal(str(quantity))
        if qty_input <= Decimal("0.000"):
            raise ValidationError({"quantity": ["Received quantity must be greater than zero."]})

        with transaction.atomic():
            locked_item = InventoryItem.objects.select_for_update().get(id=item.id)

            # Convert to item's native tracking unit
            converted_qty = UnitConverter.convert(qty_input, from_unit=unit, to_unit=locked_item.unit)
            qty_before = locked_item.current_quantity
            qty_after = quantize_stock(qty_before + converted_qty)

            movement = StockMovement.objects.create(
                restaurant=restaurant,
                item=locked_item,
                movement_type=StockMovement.MovementType.PURCHASE,
                quantity=converted_qty,
                quantity_before=qty_before,
                quantity_after=qty_after,
                unit=locked_item.unit,
                reference_type="SUPPLIER_INTAKE",
                reference_id=reference.strip(),
                reason=reason.strip() or "Stock intake received",
                created_by=user,
            )

            locked_item.current_quantity = qty_after
            locked_item.save(update_fields=["current_quantity", "updated_at"])
            return movement

    @classmethod
    def adjust_stock(
        cls,
        restaurant: Restaurant,
        item: InventoryItem,
        delta_quantity: Decimal,
        reason: str,
        user: Optional[User] = None,
    ) -> StockMovement:
        """Manual authorized stock adjustment (+ or -)."""
        if item.restaurant_id != restaurant.id:
            raise ValidationError({"item_id": ["Item belongs to a different restaurant."]})

        delta = quantize_stock(Decimal(str(delta_quantity)))
        if delta == Decimal("0.000"):
            raise ValidationError({"quantity": ["Adjustment quantity delta cannot be zero."]})

        with transaction.atomic():
            locked_item = InventoryItem.objects.select_for_update().get(id=item.id)
            qty_before = locked_item.current_quantity
            qty_after = quantize_stock(qty_before + delta)

            if qty_after < Decimal("0.000"):
                raise ValidationError({"quantity": [f"Insufficient stock for {locked_item.name}. Current: {qty_before} {locked_item.unit}, required: {abs(delta)}."]})

            mtype = StockMovement.MovementType.ADJUSTMENT_IN if delta > 0 else StockMovement.MovementType.ADJUSTMENT_OUT

            movement = StockMovement.objects.create(
                restaurant=restaurant,
                item=locked_item,
                movement_type=mtype,
                quantity=delta,
                quantity_before=qty_before,
                quantity_after=qty_after,
                unit=locked_item.unit,
                reference_type="MANUAL_ADJUSTMENT",
                reason=reason.strip(),
                created_by=user,
            )

            locked_item.current_quantity = qty_after
            locked_item.save(update_fields=["current_quantity", "updated_at"])
            return movement

    @classmethod
    def record_wastage(
        cls,
        restaurant: Restaurant,
        item: InventoryItem,
        quantity: Decimal,
        reason: str = "Spoiled / Expired",
        user: Optional[User] = None,
    ) -> StockMovement:
        """Record stock wastage/spoilage deduction."""
        if item.restaurant_id != restaurant.id:
            raise ValidationError({"item_id": ["Item belongs to a different restaurant."]})

        qty = quantize_stock(Decimal(str(quantity)))
        if qty <= Decimal("0.000"):
            raise ValidationError({"quantity": ["Wastage quantity must be greater than zero."]})

        with transaction.atomic():
            locked_item = InventoryItem.objects.select_for_update().get(id=item.id)
            qty_before = locked_item.current_quantity

            if qty_before < qty:
                raise ValidationError({"quantity": [f"Cannot waste {qty} {locked_item.unit}. Available stock is only {qty_before} {locked_item.unit}."]})

            qty_after = quantize_stock(qty_before - qty)

            movement = StockMovement.objects.create(
                restaurant=restaurant,
                item=locked_item,
                movement_type=StockMovement.MovementType.WASTAGE,
                quantity=-qty,
                quantity_before=qty_before,
                quantity_after=qty_after,
                unit=locked_item.unit,
                reference_type="WASTAGE",
                reason=reason.strip(),
                created_by=user,
            )

            locked_item.current_quantity = qty_after
            locked_item.save(update_fields=["current_quantity", "updated_at"])
            return movement

    @classmethod
    def consume_stock_for_order(cls, order: Order) -> Optional[InventoryConsumption]:
        """
        Deduct raw material inventory for all recipe ingredients in an Order.
        Guaranteed idempotent: executes at most once per order.
        """
        # Idempotency check
        if InventoryConsumption.objects.filter(order=order, status=InventoryConsumption.ConsumptionStatus.CONSUMED).exists():
            return None

        with transaction.atomic():
            order_items = list(order.items.select_related("menu_item__recipe").all())
            movements_to_create = []

            for line_item in order_items:
                if not line_item.menu_item or not hasattr(line_item.menu_item, "recipe"):
                    continue

                recipe = line_item.menu_item.recipe
                ingredients = list(recipe.ingredients.select_related("inventory_item").all())

                for ing in ingredients:
                    # Quantity needed = ingredient qty * order line item qty
                    total_needed = quantize_stock(ing.quantity * line_item.quantity)
                    inv_item = InventoryItem.objects.select_for_update().get(id=ing.inventory_item_id)

                    converted_needed = UnitConverter.convert(total_needed, from_unit=ing.unit, to_unit=inv_item.unit)
                    qty_before = inv_item.current_quantity
                    qty_after = quantize_stock(qty_before - converted_needed)

                    StockMovement.objects.create(
                        restaurant=order.restaurant,
                        item=inv_item,
                        movement_type=StockMovement.MovementType.CONSUMPTION,
                        quantity=-converted_needed,
                        quantity_before=qty_before,
                        quantity_after=qty_after,
                        unit=inv_item.unit,
                        reference_type="ORDER",
                        reference_id=str(order.id),
                        reason=f"Recipe consumption for {line_item.quantity}x {line_item.item_name_snapshot} ({order.order_number})",
                    )

                    inv_item.current_quantity = qty_after
                    inv_item.save(update_fields=["current_quantity", "updated_at"])

            consumption = InventoryConsumption.objects.create(
                restaurant=order.restaurant,
                order=order,
                status=InventoryConsumption.ConsumptionStatus.CONSUMED,
            )
            return consumption

    @classmethod
    def reverse_order_consumption(cls, order: Order, user: Optional[User] = None):
        """Compensate and return consumed stock if an order is cancelled after consumption."""
        consumption = InventoryConsumption.objects.filter(
            order=order,
            status=InventoryConsumption.ConsumptionStatus.CONSUMED,
        ).first()

        if not consumption:
            return

        with transaction.atomic():
            consumed_movements = StockMovement.objects.filter(
                restaurant=order.restaurant,
                movement_type=StockMovement.MovementType.CONSUMPTION,
                reference_type="ORDER",
                reference_id=str(order.id),
            )

            for m in consumed_movements:
                inv_item = InventoryItem.objects.select_for_update().get(id=m.item_id)
                reversal_qty = abs(m.quantity)
                qty_before = inv_item.current_quantity
                qty_after = quantize_stock(qty_before + reversal_qty)

                StockMovement.objects.create(
                    restaurant=order.restaurant,
                    item=inv_item,
                    movement_type=StockMovement.MovementType.RETURN,
                    quantity=reversal_qty,
                    quantity_before=qty_before,
                    quantity_after=qty_after,
                    unit=inv_item.unit,
                    reference_type="ORDER_CANCELLATION",
                    reference_id=str(order.id),
                    reason=f"Stock reversal on order cancellation ({order.order_number})",
                    created_by=user,
                )

                inv_item.current_quantity = qty_after
                inv_item.save(update_fields=["current_quantity", "updated_at"])

            consumption.status = InventoryConsumption.ConsumptionStatus.REVERSED
            consumption.save(update_fields=["status", "updated_at"])
