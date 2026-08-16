import logging
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, Dict, Any, List
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.inventory.models import InventoryItem
from apps.inventory.services import InventoryService, quantize_stock
from apps.procurement.models import (
    Supplier,
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseReceipt,
    PurchaseReceiptItem,
)

logger = logging.getLogger("fluxiflow.procurement")

class SupplierService:
    """Supplier vendor entity management."""

    @classmethod
    def generate_supplier_code(cls, restaurant: Restaurant) -> str:
        """Generate concurrency-safe sequential code SUP-000001."""
        with transaction.atomic():
            last_supplier = (
                Supplier.objects.filter(restaurant=restaurant)
                .order_by("-supplier_code")
                .first()
            )
            if not last_supplier or not last_supplier.supplier_code.startswith("SUP-"):
                seq = 1
            else:
                try:
                    seq = int(last_supplier.supplier_code.split("-")[1]) + 1
                except (IndexError, ValueError):
                    seq = 1

            while True:
                code = f"SUP-{seq:06d}"
                if not Supplier.objects.filter(restaurant=restaurant, supplier_code=code).exists():
                    return code
                seq += 1

    @classmethod
    def create_supplier(
        cls,
        restaurant: Restaurant,
        name: str,
        contact_person: str = "",
        email: str = "",
        phone: str = "",
        address: str = "",
        notes: str = "",
    ) -> Supplier:
        code = cls.generate_supplier_code(restaurant)
        supplier = Supplier.objects.create(
            restaurant=restaurant,
            supplier_code=code,
            name=name.strip(),
            contact_person=contact_person.strip(),
            email=email.strip(),
            phone=phone.strip(),
            address=address.strip(),
            notes=notes.strip(),
            is_active=True,
        )
        return supplier


class PurchaseOrderService:
    """
    Lifecycle management for Purchase Orders and Goods Receiving into Inventory.
    """

    @classmethod
    def generate_po_number(cls, restaurant: Restaurant) -> str:
        """Generate concurrency-safe sequential PO number PO-000001."""
        with transaction.atomic():
            last_po = (
                PurchaseOrder.objects.filter(restaurant=restaurant)
                .order_by("-po_number")
                .first()
            )
            if not last_po or not last_po.po_number.startswith("PO-"):
                seq = 1
            else:
                try:
                    seq = int(last_po.po_number.split("-")[1]) + 1
                except (IndexError, ValueError):
                    seq = 1

            while True:
                number = f"PO-{seq:06d}"
                if not PurchaseOrder.objects.filter(restaurant=restaurant, po_number=number).exists():
                    return number
                seq += 1

    @classmethod
    def generate_receipt_number(cls, restaurant: Restaurant) -> str:
        """Generate concurrency-safe sequential receipt number REC-000001."""
        with transaction.atomic():
            last_rec = (
                PurchaseReceipt.objects.filter(restaurant=restaurant)
                .order_by("-receipt_number")
                .first()
            )
            if not last_rec or not last_rec.receipt_number.startswith("REC-"):
                seq = 1
            else:
                try:
                    seq = int(last_rec.receipt_number.split("-")[1]) + 1
                except (IndexError, ValueError):
                    seq = 1

            while True:
                number = f"REC-{seq:06d}"
                if not PurchaseReceipt.objects.filter(restaurant=restaurant, receipt_number=number).exists():
                    return number
                seq += 1

    @classmethod
    def create_purchase_order(
        cls,
        restaurant: Restaurant,
        supplier: Supplier,
        items_data: List[Dict[str, Any]],
        order_date=None,
        expected_delivery_date=None,
        tax_amount: Decimal = Decimal("0.00"),
        notes: str = "",
        user: Optional[User] = None,
    ) -> PurchaseOrder:
        """Create a new Draft Purchase Order with line items."""
        if supplier.restaurant_id != restaurant.id:
            raise ValidationError({"supplier": ["Supplier belongs to a different restaurant."]})

        if not supplier.is_active:
            raise ValidationError({"supplier": ["Cannot create purchase order for inactive supplier."]})

        if not items_data:
            raise ValidationError({"items": ["Purchase order must contain at least one line item."]})

        with transaction.atomic():
            po_number = cls.generate_po_number(restaurant)
            order_date_val = order_date or timezone.now().date()

            po = PurchaseOrder.objects.create(
                restaurant=restaurant,
                supplier=supplier,
                po_number=po_number,
                status=PurchaseOrder.POStatus.DRAFT,
                order_date=order_date_val,
                expected_delivery_date=expected_delivery_date,
                tax_amount=Decimal(str(tax_amount)),
                notes=notes.strip(),
                created_by=user,
            )

            subtotal = Decimal("0.00")

            for entry in items_data:
                inv_item_id = entry.get("inventory_item_id")
                qty = quantize_stock(Decimal(str(entry.get("quantity_ordered", 0))))
                unit_cost = Decimal(str(entry.get("unit_cost", 0)))

                if qty <= Decimal("0.000"):
                    raise ValidationError({"quantity": ["Quantity ordered must be greater than zero."]})

                inv_item = InventoryItem.objects.filter(id=inv_item_id, restaurant=restaurant).first()
                if not inv_item:
                    raise ValidationError({"inventory_item_id": [f"Inventory item '{inv_item_id}' not found."]})

                if not inv_item.is_active:
                    raise ValidationError({"inventory_item_id": [f"Inventory item '{inv_item.name}' is inactive."]})

                unit = entry.get("unit", inv_item.unit)
                line_total = (qty * unit_cost).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                subtotal += line_total

                PurchaseOrderItem.objects.create(
                    purchase_order=po,
                    inventory_item=inv_item,
                    item_name_snapshot=inv_item.name,
                    quantity_ordered=qty,
                    unit=unit,
                    unit_cost=unit_cost,
                    line_total=line_total,
                    quantity_received=Decimal("0.000"),
                )

            po.subtotal = subtotal
            po.total_amount = subtotal + po.tax_amount
            po.save(update_fields=["subtotal", "total_amount", "updated_at"])
            return po

    @classmethod
    def submit_purchase_order(cls, po: PurchaseOrder) -> PurchaseOrder:
        """Advance status: DRAFT -> SUBMITTED."""
        if po.status != PurchaseOrder.POStatus.DRAFT:
            raise ValidationError({"status": [f"Cannot submit PO in '{po.status}' status."]})

        po.status = PurchaseOrder.POStatus.SUBMITTED
        po.save(update_fields=["status", "updated_at"])
        return po

    @classmethod
    def approve_purchase_order(cls, po: PurchaseOrder, user: Optional[User] = None) -> PurchaseOrder:
        """Advance status: SUBMITTED -> APPROVED."""
        if po.status != PurchaseOrder.POStatus.SUBMITTED:
            raise ValidationError({"status": [f"Cannot approve PO in '{po.status}' status."]})

        po.status = PurchaseOrder.POStatus.APPROVED
        po.approved_by = user
        po.approved_at = timezone.now()
        po.save(update_fields=["status", "approved_by", "approved_at", "updated_at"])
        return po

    @classmethod
    def cancel_purchase_order(cls, po: PurchaseOrder, reason: str = "", user: Optional[User] = None) -> PurchaseOrder:
        """Cancel purchase order if no items have been received."""
        if po.status in [PurchaseOrder.POStatus.RECEIVED, PurchaseOrder.POStatus.CANCELLED]:
            raise ValidationError({"status": [f"Cannot cancel PO in '{po.status}' status."]})

        if po.items.filter(quantity_received__gt=Decimal("0.000")).exists():
            raise ValidationError({"status": ["Cannot cancel a purchase order that has already received items."]})

        po.status = PurchaseOrder.POStatus.CANCELLED
        po.notes = f"{po.notes}\n[Cancelled]: {reason}".strip()
        po.save(update_fields=["status", "notes", "updated_at"])
        return po

    @classmethod
    def receive_purchase_order(
        cls,
        restaurant: Restaurant,
        po: PurchaseOrder,
        items_received_data: List[Dict[str, Any]],
        idempotency_key: str = "",
        notes: str = "",
        user: Optional[User] = None,
    ) -> PurchaseReceipt:
        """
        Record physical intake delivery against an approved PO.
        Transactionally updates PO items, calls InventoryService to update stock,
        and computes new PO lifecycle status (PARTIALLY_RECEIVED or RECEIVED).
        """
        if po.restaurant_id != restaurant.id:
            raise ValidationError({"purchase_order": ["Purchase order belongs to a different restaurant."]})

        # Idempotency check
        if idempotency_key:
            existing_receipt = PurchaseReceipt.objects.filter(
                restaurant=restaurant,
                idempotency_key=idempotency_key
            ).prefetch_related("items__purchase_order_item").first()
            if existing_receipt:
                return existing_receipt

        if po.status not in [PurchaseOrder.POStatus.APPROVED, PurchaseOrder.POStatus.PARTIALLY_RECEIVED]:
            raise ValidationError({"status": [f"Cannot receive goods for PO in '{po.status}' status. PO must be APPROVED or PARTIALLY_RECEIVED."]})

        if not items_received_data:
            raise ValidationError({"items": ["Receipt must contain at least one received item."]})

        with transaction.atomic():
            locked_po = PurchaseOrder.objects.select_for_update().get(id=po.id)
            rec_number = cls.generate_receipt_number(restaurant)

            receipt = PurchaseReceipt.objects.create(
                restaurant=restaurant,
                purchase_order=locked_po,
                receipt_number=rec_number,
                received_by=user,
                idempotency_key=idempotency_key.strip(),
                notes=notes.strip(),
            )

            for entry in items_received_data:
                po_item_id = entry.get("purchase_order_item_id")
                qty_to_receive = quantize_stock(Decimal(str(entry.get("quantity", 0))))

                if qty_to_receive <= Decimal("0.000"):
                    continue

                locked_po_item = PurchaseOrderItem.objects.select_for_update().get(
                    id=po_item_id,
                    purchase_order=locked_po,
                )

                remaining = locked_po_item.remaining_quantity
                if qty_to_receive > remaining:
                    raise ValidationError({
                        "quantity": [
                            f"Cannot receive {qty_to_receive} {locked_po_item.unit} for '{locked_po_item.item_name_snapshot}'. Remaining allowable is only {remaining} {locked_po_item.unit}."
                        ]
                    })

                # 1. Update Inventory via InventoryService (creates StockMovement + updates current_quantity)
                InventoryService.receive_stock(
                    restaurant=restaurant,
                    item=locked_po_item.inventory_item,
                    quantity=qty_to_receive,
                    unit=locked_po_item.unit,
                    reference=locked_po.po_number,
                    reason=f"PO Delivery: {locked_po.po_number} ({rec_number})",
                    user=user,
                )

                # 2. Update PO line item received quantity
                locked_po_item.quantity_received = quantize_stock(locked_po_item.quantity_received + qty_to_receive)
                locked_po_item.save(update_fields=["quantity_received", "updated_at"])

                # 3. Create Receipt Item record
                PurchaseReceiptItem.objects.create(
                    receipt=receipt,
                    purchase_order_item=locked_po_item,
                    quantity_received=qty_to_receive,
                    unit=locked_po_item.unit,
                )

            # Recalculate PO overall status
            all_po_items = list(locked_po.items.all())
            all_fully_received = all(item.quantity_received >= item.quantity_ordered for item in all_po_items)

            if all_fully_received:
                locked_po.status = PurchaseOrder.POStatus.RECEIVED
            else:
                locked_po.status = PurchaseOrder.POStatus.PARTIALLY_RECEIVED

            locked_po.save(update_fields=["status", "updated_at"])
            return receipt
