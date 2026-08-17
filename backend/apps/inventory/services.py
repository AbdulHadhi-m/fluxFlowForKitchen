import logging
import uuid
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, Dict, Any, List, Set, Tuple
from django.db import transaction
from django.db.models import Sum, Q, F
from django.utils import timezone
from rest_framework.exceptions import ValidationError, PermissionDenied

from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.orders.models import Order
from apps.menu.models import MenuItem
from apps.procurement.models import PurchaseOrder, PurchaseOrderItem
from apps.inventory.models import (
    InventoryItem,
    InventoryBatch,
    StockMovement,
    Recipe,
    RecipeItem,
    InventoryConsumption,
    StockCount,
    StockCountItem,
    InventoryTransfer,
    InventoryTransferItem,
    WasteRecord,
    UnitOfMeasure,
    ItemType,
    StorageLocation,
)

logger = logging.getLogger("fluxiflow.inventory")


def quantize_stock(val: Decimal) -> Decimal:
    return Decimal(str(val)).quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)


def quantize_cost(val: Decimal) -> Decimal:
    return Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def quantize_unit_cost(val: Decimal) -> Decimal:
    return Decimal(str(val)).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


class UnitConverter:
    """
    Centralized unit conversion engine for weight, volume, and count units.
    Prevents cross-dimensional incompatibilities (e.g. kg to ml without density).
    """
    # Category mappings
    WEIGHT_UNITS = {"kg", "g", "lb", "oz"}
    VOLUME_UNITS = {"l", "ml"}
    COUNT_UNITS = {"piece", "portion", "pack", "bottle", "box"}

    # Base conversions to standard SI units (Weight: grams, Volume: milliliters)
    WEIGHT_TO_GRAMS = {
        "g": Decimal("1.0"),
        "kg": Decimal("1000.0"),
        "oz": Decimal("28.3495"),
        "lb": Decimal("453.592"),
    }

    VOLUME_TO_ML = {
        "ml": Decimal("1.0"),
        "l": Decimal("1000.0"),
    }

    @classmethod
    def convert(
        cls,
        value: Decimal,
        from_unit: str,
        to_unit: str,
        item: Optional[InventoryItem] = None,
    ) -> Decimal:
        """
        Converts quantity between compatible units.
        If item has purchase_to_stock_factor and converting between purchase and stock unit, applies factor.
        """
        if from_unit == to_unit:
            return quantize_stock(value)

        from_u = from_unit.lower()
        to_u = to_unit.lower()

        # Check item custom purchase factor
        if item:
            if from_u == item.purchase_unit.lower() and to_u == item.unit.lower():
                return quantize_stock(value * item.purchase_to_stock_factor)
            if from_u == item.unit.lower() and to_u == item.purchase_unit.lower():
                if item.purchase_to_stock_factor > 0:
                    return quantize_stock(value / item.purchase_to_stock_factor)

        # Weight to Weight
        if from_u in cls.WEIGHT_UNITS and to_u in cls.WEIGHT_UNITS:
            grams = value * cls.WEIGHT_TO_GRAMS[from_u]
            result = grams / cls.WEIGHT_TO_GRAMS[to_u]
            return quantize_stock(result)

        # Volume to Volume
        if from_u in cls.VOLUME_UNITS and to_u in cls.VOLUME_UNITS:
            mls = value * cls.VOLUME_TO_ML[from_u]
            result = mls / cls.VOLUME_TO_ML[to_u]
            return quantize_stock(result)

        # Count to Count (default 1:1 if unspecified)
        if from_u in cls.COUNT_UNITS and to_u in cls.COUNT_UNITS:
            return quantize_stock(value)

        # Cross-dimension error: raise validation exception
        raise ValidationError(
            f"Incompatible unit conversion from '{from_unit}' to '{to_unit}' without density ratio."
        )


class FEFOService:
    """
    First Expiry, First Out batch deduction allocator.
    """
    @classmethod
    def allocate_batches_for_consumption(
        cls, item: InventoryItem, required_qty: Decimal
    ) -> List[Tuple[InventoryBatch, Decimal]]:
        """
        Allocates required consumption quantity across active batches sorted by earliest expiry date.
        """
        batches = list(
            InventoryBatch.objects.filter(
                item=item,
                batch_status=InventoryBatch.BatchStatus.ACTIVE,
                current_quantity__gt=Decimal("0.000"),
            ).order_by("expiry_date", "created_at")
        )

        allocations = []
        remaining_needed = required_qty

        for b in batches:
            if remaining_needed <= Decimal("0.000"):
                break

            deduct = min(b.current_quantity, remaining_needed)
            allocations.append((b, deduct))
            remaining_needed -= deduct

        return allocations


class InventoryService:
    """
    Core Domain service for master inventory, stock intake, adjustments,
    waste recording, moving average valuation, and automated order recipe deductions.
    """

    @classmethod
    def create_item(
        cls,
        restaurant: Restaurant,
        name: str,
        sku: str = "",
        item_type: str = ItemType.RAW_INGREDIENT,
        unit: str = UnitOfMeasure.KG,
        purchase_unit: str = UnitOfMeasure.KG,
        purchase_to_stock_factor: Decimal = Decimal("1.0000"),
        storage_location: str = StorageLocation.MAIN_STORE,
        storage_condition: str = "AMBIENT",
        minimum_stock_level: Decimal = Decimal("5.000"),
        par_level: Decimal = Decimal("10.000"),
        max_stock_level: Decimal = Decimal("100.000"),
        cost_per_unit: Decimal = Decimal("0.00"),
        initial_quantity: Decimal = Decimal("0.000"),
        track_expiry: bool = False,
        track_batch: bool = False,
        yield_percentage: Decimal = Decimal("100.00"),
        user: Optional[User] = None,
    ) -> InventoryItem:
        """Create a new master inventory item with initial opening stock movement."""
        with transaction.atomic():
            init_qty = quantize_stock(Decimal(str(initial_quantity)))
            cost = quantize_unit_cost(Decimal(str(cost_per_unit)))

            item = InventoryItem.objects.create(
                restaurant=restaurant,
                name=name.strip(),
                sku=sku.strip(),
                item_type=item_type,
                unit=unit,
                purchase_unit=purchase_unit,
                purchase_to_stock_factor=Decimal(str(purchase_to_stock_factor)),
                storage_location=storage_location,
                storage_condition=storage_condition,
                current_quantity=init_qty,
                minimum_stock_level=quantize_stock(Decimal(str(minimum_stock_level))),
                par_level=quantize_stock(Decimal(str(par_level))),
                max_stock_level=quantize_stock(Decimal(str(max_stock_level))),
                cost_per_unit=quantize_cost(cost),
                last_purchase_cost=quantize_cost(cost),
                weighted_average_cost=cost,
                track_expiry=track_expiry,
                track_batch=track_batch,
                yield_percentage=Decimal(str(yield_percentage)),
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
                    unit_cost_snapshot=cost,
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
        unit_cost: Decimal = Decimal("0.00"),
        batch_number: str = "",
        expiry_date: Optional[Any] = None,
        supplier_name: str = "",
        reference: str = "",
        reason: str = "",
        user: Optional[User] = None,
    ) -> StockMovement:
        """
        Record purchase / stock intake transaction with concurrency row-lock
        and recalculates moving weighted average cost.
        """
        if item.restaurant_id != restaurant.id:
            raise ValidationError({"item_id": ["Item belongs to a different restaurant."]})

        qty_input = Decimal(str(quantity))
        if qty_input <= Decimal("0.000"):
            raise ValidationError({"quantity": ["Received quantity must be greater than zero."]})

        new_unit_cost = quantize_unit_cost(Decimal(str(unit_cost)))

        with transaction.atomic():
            locked_item = InventoryItem.objects.select_for_update().get(id=item.id)

            # Convert to item's native tracking unit
            converted_qty = UnitConverter.convert(qty_input, from_unit=unit, to_unit=locked_item.unit, item=locked_item)
            qty_before = locked_item.current_quantity
            qty_after = quantize_stock(qty_before + converted_qty)

            # Recalculate moving weighted average cost: (Q1 * C1 + Q2 * C2) / (Q1 + Q2)
            if qty_after > Decimal("0.000") and new_unit_cost > Decimal("0.0000"):
                old_val = (qty_before * locked_item.weighted_average_cost) if qty_before > Decimal("0.000") else Decimal("0.0000")
                new_val = converted_qty * new_unit_cost
                new_avg_cost = quantize_unit_cost((old_val + new_val) / qty_after)
                locked_item.weighted_average_cost = new_avg_cost
                locked_item.last_purchase_cost = quantize_cost(new_unit_cost)
                locked_item.cost_per_unit = quantize_cost(new_avg_cost)

            # Batch creation if batch tracking is active
            created_batch = None
            if locked_item.track_batch or locked_item.track_expiry or batch_number or expiry_date:
                b_num = batch_number.strip() or f"LOT-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
                created_batch = InventoryBatch.objects.create(
                    restaurant=restaurant,
                    item=locked_item,
                    batch_number=b_num,
                    received_date=timezone.now().date(),
                    expiry_date=expiry_date,
                    initial_quantity=converted_qty,
                    current_quantity=converted_qty,
                    unit_cost=new_unit_cost,
                    supplier_name=supplier_name.strip(),
                    storage_location=locked_item.storage_location,
                    batch_status=InventoryBatch.BatchStatus.ACTIVE,
                )

            movement = StockMovement.objects.create(
                restaurant=restaurant,
                item=locked_item,
                batch=created_batch,
                movement_type=StockMovement.MovementType.PURCHASE,
                quantity=converted_qty,
                quantity_before=qty_before,
                quantity_after=qty_after,
                unit=locked_item.unit,
                unit_cost_snapshot=new_unit_cost if new_unit_cost > 0 else locked_item.weighted_average_cost,
                reference_type="SUPPLIER_INTAKE",
                reference_id=reference.strip(),
                reason=reason.strip() or "Stock intake received",
                created_by=user,
            )

            locked_item.current_quantity = qty_after
            locked_item.save(update_fields=[
                "current_quantity",
                "weighted_average_cost",
                "last_purchase_cost",
                "cost_per_unit",
                "updated_at",
            ])
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
                unit_cost_snapshot=locked_item.weighted_average_cost,
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
        reason: str = WasteRecord.WasteReason.SPOILAGE,
        batch: Optional[InventoryBatch] = None,
        location: str = StorageLocation.KITCHEN,
        notes: str = "",
        user: Optional[User] = None,
    ) -> WasteRecord:
        """Record stock wastage/spoilage deduction with loss calculation."""
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
            unit_cost = locked_item.weighted_average_cost if locked_item.weighted_average_cost > 0 else locked_item.cost_per_unit
            total_loss = quantize_cost(qty * Decimal(str(unit_cost)))

            # Deduct from batch if provided
            if batch:
                locked_batch = InventoryBatch.objects.select_for_update().get(id=batch.id)
                locked_batch.current_quantity = max(Decimal("0.000"), locked_batch.current_quantity - qty)
                if locked_batch.current_quantity == Decimal("0.000"):
                    locked_batch.batch_status = InventoryBatch.BatchStatus.DEPLETED
                locked_batch.save(update_fields=["current_quantity", "batch_status", "updated_at"])

            waste = WasteRecord.objects.create(
                restaurant=restaurant,
                item=locked_item,
                batch=batch,
                quantity=qty,
                unit=locked_item.unit,
                reason=reason,
                unit_cost=unit_cost,
                total_loss_cost=total_loss,
                location=location,
                reported_by=user,
                notes=notes.strip(),
            )

            mtype = (
                StockMovement.MovementType.SPOILAGE
                if reason == WasteRecord.WasteReason.SPOILAGE
                else StockMovement.MovementType.WASTAGE
            )

            StockMovement.objects.create(
                restaurant=restaurant,
                item=locked_item,
                batch=batch,
                movement_type=mtype,
                quantity=-qty,
                quantity_before=qty_before,
                quantity_after=qty_after,
                unit=locked_item.unit,
                unit_cost_snapshot=unit_cost,
                reference_type="WASTE_RECORD",
                reference_id=str(waste.id),
                reason=f"{reason}: {notes}".strip(": "),
                created_by=user,
            )

            locked_item.current_quantity = qty_after
            locked_item.save(update_fields=["current_quantity", "updated_at"])
            return waste

    @classmethod
    def consume_stock_for_order(cls, order: Order) -> Optional[InventoryConsumption]:
        """
        Deduct raw material inventory for all recipe ingredients in an Order.
        Supports recursive sub-recipes and FEFO batch allocation.
        Guaranteed idempotent: executes at most once per order.
        """
        # Idempotency check
        if InventoryConsumption.objects.filter(order=order, status=InventoryConsumption.ConsumptionStatus.CONSUMED).exists():
            return None

        with transaction.atomic():
            order_items = list(order.items.select_related("menu_item").all())
            movements_to_create = []

            for line_item in order_items:
                if not line_item.menu_item:
                    continue

                # Find applicable active published recipe version
                recipe = RecipeService.get_active_recipe_for_menu_item(line_item.menu_item, order.created_at)
                if not recipe:
                    continue

                # Calculate flat ingredient requirements including sub-recipes
                exploded_ingredients = RecipeService.explode_recipe_ingredients(recipe, line_item.quantity)

                for ing_item, required_qty, unit in exploded_ingredients:
                    inv_item = InventoryItem.objects.select_for_update().get(id=ing_item.id)
                    converted_needed = UnitConverter.convert(required_qty, from_unit=unit, to_unit=inv_item.unit, item=inv_item)

                    qty_before = inv_item.current_quantity
                    qty_after = quantize_stock(qty_before - converted_needed)

                    # FEFO batch allocations if enabled
                    batch_allocations = []
                    if inv_item.track_batch or inv_item.track_expiry:
                        batch_allocations = FEFOService.allocate_batches_for_consumption(inv_item, converted_needed)
                        for b, alloc_qty in batch_allocations:
                            b.current_quantity = max(Decimal("0.000"), b.current_quantity - alloc_qty)
                            if b.current_quantity == Decimal("0.000"):
                                b.batch_status = InventoryBatch.BatchStatus.DEPLETED
                            b.save(update_fields=["current_quantity", "batch_status", "updated_at"])

                    primary_batch = batch_allocations[0][0] if batch_allocations else None

                    movements_to_create.append(
                        StockMovement(
                            restaurant=order.restaurant,
                            item=inv_item,
                            batch=primary_batch,
                            movement_type=StockMovement.MovementType.CONSUMPTION,
                            quantity=-converted_needed,
                            quantity_before=qty_before,
                            quantity_after=qty_after,
                            unit=inv_item.unit,
                            unit_cost_snapshot=inv_item.weighted_average_cost,
                            reference_type="ORDER",
                            reference_id=str(order.id),
                            reason=f"Consumed {line_item.quantity}x {line_item.menu_item.name} for Order #{order.order_number}",
                            created_by=None,
                        )
                    )

                    inv_item.current_quantity = qty_after
                    inv_item.save(update_fields=["current_quantity", "updated_at"])

            if movements_to_create:
                StockMovement.objects.bulk_create(movements_to_create)

            consumption = InventoryConsumption.objects.create(
                restaurant=order.restaurant,
                order=order,
                status=InventoryConsumption.ConsumptionStatus.CONSUMED,
            )
            return consumption

    @classmethod
    def reverse_stock_for_order(cls, order: Order, reason: str = "Order Cancelled") -> bool:
        """
        Reverses inventory consumption if order is cancelled after stock deduction.
        """
        with transaction.atomic():
            consumption = InventoryConsumption.objects.filter(
                order=order, status=InventoryConsumption.ConsumptionStatus.CONSUMED
            ).first()

            if not consumption:
                return False

            # Find past consumption movements
            past_movements = list(StockMovement.objects.filter(
                restaurant=order.restaurant,
                reference_type="ORDER",
                reference_id=str(order.id),
                movement_type=StockMovement.MovementType.CONSUMPTION,
            ))

            for mov in past_movements:
                inv_item = InventoryItem.objects.select_for_update().get(id=mov.item_id)
                restore_qty = abs(mov.quantity)
                qty_before = inv_item.current_quantity
                qty_after = quantize_stock(qty_before + restore_qty)

                StockMovement.objects.create(
                    restaurant=order.restaurant,
                    item=inv_item,
                    batch=mov.batch,
                    movement_type=StockMovement.MovementType.RETURN,
                    quantity=restore_qty,
                    quantity_before=qty_before,
                    quantity_after=qty_after,
                    unit=inv_item.unit,
                    unit_cost_snapshot=mov.unit_cost_snapshot,
                    reference_type="ORDER_REVERSAL",
                    reference_id=str(order.id),
                    reason=f"Restored from Cancelled Order #{order.order_number}: {reason}",
                )

                inv_item.current_quantity = qty_after
                inv_item.save(update_fields=["current_quantity", "updated_at"])

            consumption.status = InventoryConsumption.ConsumptionStatus.REVERSED
            consumption.save(update_fields=["status", "updated_at"])
            return True


class RecipeService:
    """
    BOM Recipe versioning, recursive costing, yield management, and cycle detection.
    """

    @classmethod
    def get_active_recipe_for_menu_item(cls, menu_item: MenuItem, at_time: Optional[Any] = None) -> Optional[Recipe]:
        """
        Finds the active published recipe version effective at a given point in time.
        """
        ts = at_time or timezone.now()
        qs = Recipe.objects.filter(
            menu_item=menu_item,
            status=Recipe.RecipeStatus.PUBLISHED,
        )
        # Check effective dates if present
        dated_recipe = qs.filter(
            Q(effective_from__isnull=True) | Q(effective_from__lte=ts),
            Q(effective_until__isnull=True) | Q(effective_until__gte=ts),
        ).order_by("-version").first()

        return dated_recipe or qs.order_by("-version").first()

    @classmethod
    def check_circular_dependencies(cls, root_recipe_id: str, candidate_sub_recipe_id: str) -> None:
        """
        Traverses BOM graph to prevent circular dependency cycles (e.g. A -> B -> A).
        """
        if root_recipe_id == candidate_sub_recipe_id:
            raise ValidationError("A recipe cannot include itself as a sub-recipe.")

        visited: Set[str] = set()

        def dfs(current_recipe_id: str):
            if current_recipe_id == root_recipe_id:
                raise ValidationError("Circular recipe dependency detected in BOM structure.")
            if current_recipe_id in visited:
                return

            visited.add(current_recipe_id)
            sub_items = RecipeItem.objects.filter(recipe_id=current_recipe_id, sub_recipe__isnull=False)
            for item in sub_items:
                if item.sub_recipe_id:
                    dfs(str(item.sub_recipe_id))

        dfs(candidate_sub_recipe_id)

    @classmethod
    def explode_recipe_ingredients(
        cls, recipe: Recipe, multiplier: Decimal = Decimal("1.000")
    ) -> List[Tuple[InventoryItem, Decimal, str]]:
        """
        Recursively flattens a Recipe (including sub-recipes) into a list of (InventoryItem, Total Quantity, Unit).
        """
        results: List[Tuple[InventoryItem, Decimal, str]] = []
        recipe_items = list(recipe.ingredients.select_related("inventory_item", "sub_recipe").all())

        # Yield factor: if recipe produces output_quantity with yield_percentage
        batch_output = recipe.output_quantity if recipe.output_quantity > 0 else Decimal("1.000")
        effective_scale = multiplier / batch_output

        for item in recipe_items:
            if item.inventory_item:
                qty_needed = quantize_stock(item.quantity * effective_scale)
                results.append((item.inventory_item, qty_needed, item.unit))
            elif item.sub_recipe:
                sub_needed = quantize_stock(item.quantity * effective_scale)
                sub_exploded = cls.explode_recipe_ingredients(item.sub_recipe, sub_needed)
                results.extend(sub_exploded)

        return results

    @classmethod
    def calculate_recipe_cost(cls, recipe: Recipe) -> Decimal:
        """
        Calculates theoretical recipe production cost per 1 output portion, factoring in yields and loss.
        """
        exploded = cls.explode_recipe_ingredients(recipe, Decimal("1.000"))
        total_cost = Decimal("0.0000")

        for inv_item, qty, unit in exploded:
            # Convert to item's native unit for accurate cost application
            converted_qty = UnitConverter.convert(qty, from_unit=unit, to_unit=inv_item.unit, item=inv_item)
            unit_cost = inv_item.weighted_average_cost if inv_item.weighted_average_cost > 0 else inv_item.cost_per_unit
            total_cost += converted_qty * Decimal(str(unit_cost))

        # Adjust for recipe level prep / cooking loss
        total_loss_pct = (recipe.preparation_loss_pct + recipe.cooking_loss_pct)
        if total_loss_pct > 0 and total_loss_pct < 100:
            effective_yield = Decimal("1.00") - (total_loss_pct / Decimal("100.00"))
            total_cost = total_cost / effective_yield

        return quantize_cost(total_cost)

    @classmethod
    def get_menu_item_food_cost_analysis(cls, menu_item: MenuItem) -> Dict[str, Any]:
        """
        Returns full food cost breakdown, food cost %, gross margin, and suggested pricing.
        """
        recipe = cls.get_active_recipe_for_menu_item(menu_item)
        if not recipe:
            return {
                "has_recipe": False,
                "recipe_id": None,
                "recipe_cost": Decimal("0.00"),
                "selling_price": menu_item.price,
                "food_cost_percentage": Decimal("0.00"),
                "gross_margin": menu_item.price,
                "margin_percentage": Decimal("100.00") if menu_item.price > 0 else Decimal("0.00"),
                "ingredients": [],
            }

        recipe_cost = cls.calculate_recipe_cost(recipe)
        selling_price = menu_item.price

        food_cost_pct = (
            Decimal("0.00")
            if selling_price <= Decimal("0.00")
            else quantize_cost((recipe_cost / selling_price) * Decimal("100.00"))
        )
        gross_margin = quantize_cost(selling_price - recipe_cost)
        margin_pct = (
            Decimal("0.00")
            if selling_price <= Decimal("0.00")
            else quantize_cost((gross_margin / selling_price) * Decimal("100.00"))
        )

        # Ingredient breakdown
        exploded = cls.explode_recipe_ingredients(recipe, Decimal("1.000"))
        ing_breakdown = []
        for inv_item, qty, unit in exploded:
            converted_qty = UnitConverter.convert(qty, from_unit=unit, to_unit=inv_item.unit, item=inv_item)
            unit_cost = inv_item.weighted_average_cost if inv_item.weighted_average_cost > 0 else inv_item.cost_per_unit
            line_cost = quantize_cost(converted_qty * Decimal(str(unit_cost)))
            ing_breakdown.append({
                "item_id": str(inv_item.id),
                "item_name": inv_item.name,
                "quantity": qty,
                "unit": unit,
                "unit_cost": str(unit_cost),
                "line_cost": str(line_cost),
            })

        return {
            "has_recipe": True,
            "recipe_id": str(recipe.id),
            "recipe_name": recipe.name or menu_item.name,
            "version": recipe.version,
            "recipe_cost": str(recipe_cost),
            "selling_price": str(selling_price),
            "food_cost_percentage": str(food_cost_pct),
            "gross_margin": str(gross_margin),
            "margin_percentage": str(margin_pct),
            "suggested_price_30_pct": str(quantize_cost(recipe_cost / Decimal("0.30"))) if recipe_cost > 0 else "0.00",
            "suggested_price_25_pct": str(quantize_cost(recipe_cost / Decimal("0.25"))) if recipe_cost > 0 else "0.00",
            "ingredients": ing_breakdown,
        }

    @classmethod
    def publish_recipe(cls, recipe: Recipe, user: Optional[User] = None) -> Recipe:
        """
        Publishes a recipe version, archiving prior published versions for the same menu item.
        """
        with transaction.atomic():
            if recipe.menu_item:
                Recipe.objects.filter(
                    menu_item=recipe.menu_item,
                    status=Recipe.RecipeStatus.PUBLISHED,
                ).exclude(id=recipe.id).update(
                    status=Recipe.RecipeStatus.ARCHIVED,
                    effective_until=timezone.now(),
                )

            recipe.status = Recipe.RecipeStatus.PUBLISHED
            recipe.effective_from = timezone.now()
            recipe.save(update_fields=["status", "effective_from", "updated_at"])
            return recipe

    @classmethod
    def analyze_cost_change_impact(cls, item: InventoryItem, new_unit_cost: Decimal) -> Dict[str, Any]:
        """
        Identifies all recipes and menu dishes impacted when an ingredient cost changes.
        """
        cost_diff = Decimal(str(new_unit_cost)) - (item.weighted_average_cost if item.weighted_average_cost > 0 else item.cost_per_unit)
        affected_recipes = Recipe.objects.filter(
            ingredients__inventory_item=item,
            status=Recipe.RecipeStatus.PUBLISHED,
        ).select_related("menu_item").distinct()

        impacted_items = []
        for r in affected_recipes:
            old_cost = cls.calculate_recipe_cost(r)
            # Estimate delta
            ing_item = r.ingredients.filter(inventory_item=item).first()
            qty = ing_item.quantity if ing_item else Decimal("1.000")
            converted_qty = UnitConverter.convert(qty, from_unit=ing_item.unit, to_unit=item.unit, item=item) if ing_item else Decimal("1.000")
            estimated_delta = quantize_cost(converted_qty * cost_diff)
            new_estimated_cost = quantize_cost(old_cost + estimated_delta)

            selling_price = r.menu_item.price if r.menu_item else Decimal("0.00")
            old_margin = selling_price - old_cost
            new_margin = selling_price - new_estimated_cost

            impacted_items.append({
                "recipe_id": str(r.id),
                "recipe_name": r.name or (r.menu_item.name if r.menu_item else "Sub-Recipe"),
                "menu_item_name": r.menu_item.name if r.menu_item else None,
                "selling_price": str(selling_price),
                "old_recipe_cost": str(old_cost),
                "new_estimated_recipe_cost": str(new_estimated_cost),
                "cost_delta": str(estimated_delta),
                "old_gross_margin": str(old_margin),
                "new_gross_margin": str(new_margin),
            })

        return {
            "inventory_item_id": str(item.id),
            "inventory_item_name": item.name,
            "cost_delta": str(cost_diff),
            "impacted_dishes_count": len(impacted_items),
            "impacted_items": impacted_items,
        }


class StockCountService:
    """
    Physical inventory counts, variance computation, and manager reconciliation.
    """

    @classmethod
    def create_stock_count(
        cls,
        restaurant: Restaurant,
        location: str = "ALL",
        category: str = "ALL",
        notes: str = "",
        user: Optional[User] = None,
    ) -> StockCount:
        """Initializes a new physical stock count session with book balance snapshot."""
        with transaction.atomic():
            cnt_num = f"SC-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

            stock_count = StockCount.objects.create(
                restaurant=restaurant,
                count_number=cnt_num,
                status=StockCount.CountStatus.IN_PROGRESS,
                location=location,
                category=category,
                counted_by=user,
                notes=notes.strip(),
            )

            # Query items to audit
            items_qs = InventoryItem.objects.filter(restaurant=restaurant, is_active=True)
            if location != "ALL":
                items_qs = items_qs.filter(storage_location=location)

            count_items = [
                StockCountItem(
                    stock_count=stock_count,
                    item=item,
                    system_quantity=item.current_quantity,
                    counted_quantity=item.current_quantity, # default match
                    variance_quantity=Decimal("0.000"),
                    unit_cost=item.weighted_average_cost if item.weighted_average_cost > 0 else item.cost_per_unit,
                    variance_value=Decimal("0.00"),
                )
                for item in items_qs
            ]
            StockCountItem.objects.bulk_create(count_items)
            return stock_count

    @classmethod
    def update_count_items(cls, stock_count: StockCount, items_data: List[Dict[str, Any]]) -> StockCount:
        """Updates counted physical quantities and calculates variances."""
        with transaction.atomic():
            for entry in items_data:
                item_id = entry.get("item_id")
                counted_qty = quantize_stock(Decimal(str(entry.get("counted_quantity", 0))))
                note = entry.get("notes", "")

                count_item = StockCountItem.objects.filter(stock_count=stock_count, item_id=item_id).first()
                if count_item:
                    variance_qty = quantize_stock(counted_qty - count_item.system_quantity)
                    variance_val = quantize_cost(variance_qty * Decimal(str(count_item.unit_cost)))
                    count_item.counted_quantity = counted_qty
                    count_item.variance_quantity = variance_qty
                    count_item.variance_value = variance_val
                    count_item.notes = note
                    count_item.save(update_fields=[
                        "counted_quantity", "variance_quantity", "variance_value", "notes", "updated_at"
                    ])

            return stock_count

    @classmethod
    def submit_stock_count(cls, stock_count: StockCount, user: Optional[User] = None) -> StockCount:
        """Submits count session for managerial review."""
        stock_count.status = StockCount.CountStatus.SUBMITTED
        stock_count.counted_at = timezone.now()
        if user:
            stock_count.counted_by = user
        stock_count.save(update_fields=["status", "counted_at", "counted_by", "updated_at"])
        return stock_count

    @classmethod
    def approve_and_reconcile_count(cls, stock_count: StockCount, manager_user: User) -> StockCount:
        """
        Manager approval: posts adjustment movements for all variance items and updates book stock.
        """
        with transaction.atomic():
            stock_count.status = StockCount.CountStatus.APPROVED
            stock_count.approved_at = timezone.now()
            stock_count.approved_by = manager_user
            stock_count.save(update_fields=["status", "approved_at", "approved_by", "updated_at"])

            count_items = list(stock_count.items.select_related("item").all())
            movements = []

            for ci in count_items:
                if ci.variance_quantity == Decimal("0.000"):
                    continue

                inv_item = InventoryItem.objects.select_for_update().get(id=ci.item_id)
                qty_before = inv_item.current_quantity
                qty_after = ci.counted_quantity

                mtype = (
                    StockMovement.MovementType.ADJUSTMENT_IN
                    if ci.variance_quantity > 0
                    else StockMovement.MovementType.ADJUSTMENT_OUT
                )

                movements.append(
                    StockMovement(
                        restaurant=stock_count.restaurant,
                        item=inv_item,
                        movement_type=mtype,
                        quantity=ci.variance_quantity,
                        quantity_before=qty_before,
                        quantity_after=qty_after,
                        unit=inv_item.unit,
                        unit_cost_snapshot=ci.unit_cost,
                        reference_type="STOCK_COUNT_AUDIT",
                        reference_id=str(stock_count.id),
                        reason=f"Count session {stock_count.count_number} audit adjustment",
                        created_by=manager_user,
                    )
                )

                inv_item.current_quantity = qty_after
                inv_item.save(update_fields=["current_quantity", "updated_at"])

            if movements:
                StockMovement.objects.bulk_create(movements)

            return stock_count


class TransferService:
    """
    Internal inventory transfers between restaurant stations/locations.
    """

    @classmethod
    def create_transfer(
        cls,
        restaurant: Restaurant,
        source_location: str,
        destination_location: str,
        items_data: List[Dict[str, Any]],
        notes: str = "",
        user: Optional[User] = None,
    ) -> InventoryTransfer:
        """Creates a pending transfer request."""
        if source_location == destination_location:
            raise ValidationError("Source and destination storage locations must be different.")

        with transaction.atomic():
            tr_num = f"TR-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

            transfer = InventoryTransfer.objects.create(
                restaurant=restaurant,
                transfer_number=tr_num,
                source_location=source_location,
                destination_location=destination_location,
                status=InventoryTransfer.TransferStatus.REQUESTED,
                requested_by=user,
                notes=notes.strip(),
            )

            transfer_items = []
            for entry in items_data:
                item = InventoryItem.objects.get(id=entry["item_id"], restaurant=restaurant)
                qty = quantize_stock(Decimal(str(entry["quantity"])))
                transfer_items.append(
                    InventoryTransferItem(
                        transfer=transfer,
                        item=item,
                        quantity=qty,
                        unit=entry.get("unit", item.unit),
                        notes=entry.get("notes", ""),
                    )
                )

            InventoryTransferItem.objects.bulk_create(transfer_items)
            return transfer

    @classmethod
    def approve_and_dispatch(cls, transfer: InventoryTransfer, user: User) -> InventoryTransfer:
        """Approves transfer and marks in transit."""
        with transaction.atomic():
            transfer.status = InventoryTransfer.TransferStatus.IN_TRANSIT
            transfer.approved_by = user
            transfer.approved_at = timezone.now()
            transfer.save(update_fields=["status", "approved_by", "approved_at", "updated_at"])

            for ti in transfer.items.all():
                StockMovement.objects.create(
                    restaurant=transfer.restaurant,
                    item=ti.item,
                    movement_type=StockMovement.MovementType.TRANSFER_OUT,
                    quantity=-ti.quantity,
                    quantity_before=ti.item.current_quantity,
                    quantity_after=ti.item.current_quantity, # holding location tracking
                    unit=ti.unit,
                    reference_type="TRANSFER",
                    reference_id=str(transfer.id),
                    reason=f"Transferred from {transfer.source_location} to {transfer.destination_location}",
                    created_by=user,
                )

            return transfer

    @classmethod
    def receive_and_complete(cls, transfer: InventoryTransfer, user: User) -> InventoryTransfer:
        """Receiving department confirms intake of transfer."""
        with transaction.atomic():
            transfer.status = InventoryTransfer.TransferStatus.RECEIVED
            transfer.received_by = user
            transfer.received_at = timezone.now()
            transfer.save(update_fields=["status", "received_by", "received_at", "updated_at"])

            for ti in transfer.items.all():
                StockMovement.objects.create(
                    restaurant=transfer.restaurant,
                    item=ti.item,
                    movement_type=StockMovement.MovementType.TRANSFER_IN,
                    quantity=ti.quantity,
                    quantity_before=ti.item.current_quantity,
                    quantity_after=ti.item.current_quantity,
                    unit=ti.unit,
                    reference_type="TRANSFER",
                    reference_id=str(transfer.id),
                    reason=f"Received at {transfer.destination_location} from {transfer.source_location}",
                    created_by=user,
                )

            return transfer


class FoodCostAnalyticsService:
    """
    Theoretical vs Actual food cost computation, variance analysis, and valuation breakdown.
    """

    @classmethod
    def get_inventory_valuation(cls, restaurant: Restaurant) -> Dict[str, Any]:
        """Calculates total, category, and location inventory asset values."""
        items = list(InventoryItem.objects.filter(restaurant=restaurant, is_active=True))

        total_value = Decimal("0.00")
        by_location: Dict[str, Decimal] = {}
        by_type: Dict[str, Decimal] = {}

        for item in items:
            cost = item.weighted_average_cost if item.weighted_average_cost > 0 else item.cost_per_unit
            val = (item.current_quantity * Decimal(str(cost))).quantize(Decimal("0.01"))
            total_value += val

            loc = item.storage_location
            by_location[loc] = by_location.get(loc, Decimal("0.00")) + val

            itype = item.item_type
            by_type[itype] = by_type.get(itype, Decimal("0.00")) + val

        return {
            "total_valuation": str(quantize_cost(total_value)),
            "total_items_count": len(items),
            "by_location": {k: str(quantize_cost(v)) for k, v in by_location.items()},
            "by_type": {k: str(quantize_cost(v)) for k, v in by_type.items()},
        }

    @classmethod
    def get_variance_analysis(
        cls, restaurant: Restaurant, start_date: Any, end_date: Any
    ) -> Dict[str, Any]:
        """
        Compares theoretical consumption from sales against actual ledger consumption/wastage.
        """
        # 1. Theoretical consumption from sales orders
        orders = Order.objects.filter(
            restaurant=restaurant,
            created_at__range=[start_date, end_date],
            status=Order.OrderStatus.COMPLETED,
        ).prefetch_related("items__menu_item")

        theoretical_map: Dict[str, Decimal] = {}
        for o in orders:
            for item in o.items.all():
                if not item.menu_item:
                    continue
                recipe = RecipeService.get_active_recipe_for_menu_item(item.menu_item, o.created_at)
                if not recipe:
                    continue
                exploded = RecipeService.explode_recipe_ingredients(recipe, item.quantity)
                for inv_item, qty, unit in exploded:
                    converted = UnitConverter.convert(qty, from_unit=unit, to_unit=inv_item.unit, item=inv_item)
                    theoretical_map[str(inv_item.id)] = theoretical_map.get(str(inv_item.id), Decimal("0.000")) + converted

        # 2. Actual consumption from stock movements
        movements = StockMovement.objects.filter(
            restaurant=restaurant,
            created_at__range=[start_date, end_date],
            movement_type__in=[
                StockMovement.MovementType.CONSUMPTION,
                StockMovement.MovementType.WASTAGE,
                StockMovement.MovementType.SPOILAGE,
            ],
        ).values("item_id", "item__name", "unit", "item__weighted_average_cost").annotate(
            actual_quantity=Sum(F("quantity"))
        )

        rows = []
        total_theoretical_cost = Decimal("0.00")
        total_actual_cost = Decimal("0.00")

        for m in movements:
            item_id = str(m["item_id"])
            item_name = m["item__name"]
            unit = m["unit"]
            unit_cost = m["item__weighted_average_cost"] or Decimal("0.0000")

            actual_qty = quantize_stock(abs(m["actual_quantity"] or Decimal("0.000")))
            theo_qty = quantize_stock(theoretical_map.get(item_id, Decimal("0.000")))

            var_qty = quantize_stock(actual_qty - theo_qty)
            var_cost = quantize_cost(var_qty * Decimal(str(unit_cost)))

            theo_cost = quantize_cost(theo_qty * Decimal(str(unit_cost)))
            act_cost = quantize_cost(actual_qty * Decimal(str(unit_cost)))

            total_theoretical_cost += theo_cost
            total_actual_cost += act_cost

            rows.append({
                "item_id": item_id,
                "item_name": item_name,
                "unit": unit,
                "theoretical_quantity": str(theo_qty),
                "actual_quantity": str(actual_qty),
                "variance_quantity": str(var_qty),
                "unit_cost": str(unit_cost),
                "variance_cost": str(var_cost),
                "possible_causes": "Waste / Spoilage / Over-portioning" if var_qty > 0 else "Normal",
            })

        return {
            "total_theoretical_cost": str(quantize_cost(total_theoretical_cost)),
            "total_actual_cost": str(quantize_cost(total_actual_cost)),
            "net_variance_cost": str(quantize_cost(total_actual_cost - total_theoretical_cost)),
            "items": rows,
        }


class ReorderService:
    """
    Par level replenishment and reorder recommendations.
    """

    @classmethod
    def get_reorder_suggestions(cls, restaurant: Restaurant) -> List[Dict[str, Any]]:
        """
        Calculates suggested replenishment quantity = Par Level - (Current Stock + Inbound PO Stock).
        """
        items = list(InventoryItem.objects.filter(restaurant=restaurant, is_active=True))

        # Query pending inbound PO quantities
        pending_pos = PurchaseOrderItem.objects.filter(
            purchase_order__restaurant=restaurant,
            purchase_order__status__in=[
                PurchaseOrder.POStatus.SUBMITTED,
                PurchaseOrder.POStatus.APPROVED,
                PurchaseOrder.POStatus.PARTIALLY_RECEIVED,
            ],
        ).values("inventory_item_id").annotate(inbound_qty=Sum("quantity_ordered"))

        inbound_map = {str(p["inventory_item_id"]): p["inbound_qty"] for p in pending_pos}

        suggestions = []
        for item in items:
            inbound = inbound_map.get(str(item.id), Decimal("0.000"))
            effective_available = item.current_quantity + inbound

            if effective_available < item.par_level:
                suggested_qty = quantize_stock(item.par_level - effective_available)
                est_cost = quantize_cost(suggested_qty * (item.weighted_average_cost if item.weighted_average_cost > 0 else item.cost_per_unit))

                suggestions.append({
                    "item_id": str(item.id),
                    "item_name": item.name,
                    "sku": item.sku,
                    "unit": item.unit,
                    "purchase_unit": item.purchase_unit,
                    "current_quantity": str(item.current_quantity),
                    "pending_inbound_quantity": str(inbound),
                    "minimum_stock_level": str(item.minimum_stock_level),
                    "par_level": str(item.par_level),
                    "suggested_reorder_quantity": str(suggested_qty),
                    "estimated_purchase_cost": str(est_cost),
                    "stock_status": item.stock_status,
                })

        return suggestions
