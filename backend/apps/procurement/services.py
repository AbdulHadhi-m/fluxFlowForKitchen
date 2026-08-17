import logging
from decimal import Decimal, ROUND_HALF_UP, ROUND_CEILING
from typing import Optional, Dict, Any, List
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.inventory.models import InventoryItem, InventoryBatch, StockMovement, UnitOfMeasure, StorageLocation
from apps.inventory.services import InventoryService, quantize_stock
from apps.audit.models import AuditAction, AuditEntityType, AuditActorType
from apps.audit.services import AuditService
from apps.notifications.models import NotificationType, NotificationSeverity
from apps.notifications.services import NotificationService
from apps.procurement.models import (
    Supplier,
    SupplierType,
    PaymentTerms,
    SupplierContact,
    SupplierItem,
    SupplierPriceHistory,
    PurchaseRequisition,
    PurchaseRequisitionItem,
    PurchaseOrder,
    PurchaseOrderVersion,
    PurchaseOrderItem,
    PurchaseReceipt,
    PurchaseReceiptItem,
    PurchaseReturn,
    PurchaseReturnItem,
    SupplierCredit,
    SupplierInvoice,
    SupplierInvoiceItem,
    ProcurementBudget,
)

logger = logging.getLogger("fluxiflow.procurement")


class SupplierService:
    """Supplier vendor entity management and scorecard analytics."""

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
        supplier_type: str = SupplierType.PRIMARY_WHOLESALER,
        contact_person: str = "",
        email: str = "",
        phone: str = "",
        address: str = "",
        tax_id: str = "",
        payment_terms: str = PaymentTerms.NET_30,
        currency: str = "USD",
        lead_time_days: int = 2,
        minimum_order_value: Decimal = Decimal("0.00"),
        notes: str = "",
        created_by: Optional[User] = None,
    ) -> Supplier:
        code = cls.generate_supplier_code(restaurant)
        supplier = Supplier.objects.create(
            restaurant=restaurant,
            supplier_code=code,
            name=name.strip(),
            supplier_type=supplier_type,
            contact_person=contact_person.strip(),
            email=email.strip(),
            phone=phone.strip(),
            address=address.strip(),
            tax_id=tax_id.strip(),
            payment_terms=payment_terms,
            currency=currency,
            lead_time_days=lead_time_days,
            minimum_order_value=minimum_order_value,
            notes=notes.strip(),
            is_active=True,
        )

        AuditService.log(
            restaurant=restaurant,
            action=AuditAction.CREATE,
            entity_type=AuditEntityType.SUPPLIER,
            entity_id=str(supplier.id),
            actor=created_by,
            description=f"Created supplier vendor '{supplier.name}' ({supplier.supplier_code})",
        )
        return supplier

    @classmethod
    def add_contact(
        cls,
        supplier: Supplier,
        name: str,
        role: str = "Sales Rep",
        email: str = "",
        phone: str = "",
        is_primary: bool = False,
    ) -> SupplierContact:
        with transaction.atomic():
            if is_primary:
                SupplierContact.objects.filter(supplier=supplier, is_primary=True).update(is_primary=False)
            contact = SupplierContact.objects.create(
                supplier=supplier,
                name=name.strip(),
                role=role.strip(),
                email=email.strip(),
                phone=phone.strip(),
                is_primary=is_primary,
                is_active=True,
            )
            return contact

    @classmethod
    def upsert_supplier_item(
        cls,
        supplier: Supplier,
        inventory_item: InventoryItem,
        unit_cost: Decimal,
        supplier_sku: str = "",
        purchase_unit: str = UnitOfMeasure.KG,
        conversion_factor: Decimal = Decimal("1.0000"),
        minimum_order_quantity: Decimal = Decimal("1.000"),
        pack_size: Decimal = Decimal("1.000"),
        lead_time_days: int = 2,
        is_preferred: bool = False,
        changed_by: Optional[User] = None,
    ) -> SupplierItem:
        with transaction.atomic():
            if is_preferred:
                # Remove preferred status from other suppliers for this inventory item
                SupplierItem.objects.filter(
                    inventory_item=inventory_item,
                    is_preferred=True
                ).exclude(supplier=supplier).update(is_preferred=False)

            supplier_item, created = SupplierItem.objects.select_for_update().get_or_create(
                supplier=supplier,
                inventory_item=inventory_item,
                defaults={
                    "supplier_sku": supplier_sku.strip(),
                    "purchase_unit": purchase_unit,
                    "conversion_factor": conversion_factor,
                    "unit_cost": unit_cost,
                    "minimum_order_quantity": minimum_order_quantity,
                    "pack_size": pack_size,
                    "lead_time_days": lead_time_days,
                    "is_preferred": is_preferred,
                    "is_active": True,
                },
            )

            if not created:
                old_cost = supplier_item.unit_cost
                if old_cost != unit_cost:
                    # Record Price History Audit
                    SupplierPriceHistory.objects.create(
                        supplier=supplier,
                        inventory_item=inventory_item,
                        previous_price=old_cost,
                        new_price=unit_cost,
                        effective_date=timezone.now().date(),
                        currency=supplier.currency,
                        unit=purchase_unit,
                        changed_by=changed_by,
                        reason="Supplier Catalog Price Update",
                    )
                supplier_item.supplier_sku = supplier_sku.strip()
                supplier_item.purchase_unit = purchase_unit
                supplier_item.conversion_factor = conversion_factor
                supplier_item.unit_cost = unit_cost
                supplier_item.minimum_order_quantity = minimum_order_quantity
                supplier_item.pack_size = pack_size
                supplier_item.lead_time_days = lead_time_days
                supplier_item.is_preferred = is_preferred
                supplier_item.is_active = True
                supplier_item.save()

            return supplier_item

    @classmethod
    def calculate_supplier_scorecard(cls, supplier: Supplier) -> Dict[str, Any]:
        """Transparent performance scorecard for vendor ranking."""
        pos = PurchaseOrder.objects.filter(supplier=supplier)
        total_orders = pos.count()
        completed_orders = pos.filter(status__in=[PurchaseOrder.POStatus.RECEIVED, PurchaseOrder.POStatus.CLOSED]).count()

        receipt_items = PurchaseReceiptItem.objects.filter(receipt__purchase_order__supplier=supplier)
        total_qty_delivered = sum((r.quantity_received for r in receipt_items), Decimal("0.000"))
        total_qty_accepted = sum((r.quantity_accepted for r in receipt_items), Decimal("0.000"))
        total_qty_rejected = sum((r.quantity_rejected for r in receipt_items), Decimal("0.000"))

        fill_rate_pct = (
            (total_qty_accepted / total_qty_delivered * Decimal("100.00")).quantize(Decimal("0.01"))
            if total_qty_delivered > 0
            else Decimal("100.00")
        )

        returns_count = PurchaseReturn.objects.filter(supplier=supplier).count()

        return {
            "supplier_id": str(supplier.id),
            "supplier_name": supplier.name,
            "total_orders": total_orders,
            "completed_orders": completed_orders,
            "fill_rate_percentage": str(fill_rate_pct),
            "total_delivered_quantity": str(total_qty_delivered),
            "total_accepted_quantity": str(total_qty_accepted),
            "total_rejected_quantity": str(total_qty_rejected),
            "returns_count": returns_count,
            "standard_lead_time_days": supplier.lead_time_days,
            "payment_terms": supplier.payment_terms,
        }


class PurchaseRequisitionService:
    """Internal purchase requests created by kitchen line staff."""

    @classmethod
    def generate_requisition_number(cls, restaurant: Restaurant) -> str:
        with transaction.atomic():
            date_str = timezone.now().strftime("%Y%m%d")
            prefix = f"REQ-{date_str}-"
            count = PurchaseRequisition.objects.filter(
                restaurant=restaurant,
                requisition_number__startswith=prefix
            ).count() + 1
            return f"{prefix}{count:04d}"

    @classmethod
    def create_requisition(
        cls,
        restaurant: Restaurant,
        requester: User,
        items_data: List[Dict[str, Any]],
        location: str = StorageLocation.KITCHEN,
        required_date: Optional[Any] = None,
        priority: str = PurchaseRequisition.RequisitionPriority.NORMAL,
        reason: str = "",
        notes: str = "",
    ) -> PurchaseRequisition:
        if not items_data:
            raise ValidationError("At least one ingredient item is required for a purchase requisition.")

        with transaction.atomic():
            req_num = cls.generate_requisition_number(restaurant)
            requisition = PurchaseRequisition.objects.create(
                restaurant=restaurant,
                requisition_number=req_num,
                requester=requester,
                location=location,
                required_date=required_date,
                priority=priority,
                reason=reason.strip(),
                notes=notes.strip(),
                status=PurchaseRequisition.RequisitionStatus.DRAFT,
            )

            for item_data in items_data:
                inv_item = InventoryItem.objects.get(id=item_data["inventory_item_id"], restaurant=restaurant)
                qty = quantize_stock(Decimal(str(item_data["quantity"])))
                unit = item_data.get("unit", inv_item.unit)
                est_cost = Decimal(str(item_data.get("estimated_unit_cost", inv_item.cost_per_unit)))

                PurchaseRequisitionItem.objects.create(
                    requisition=requisition,
                    inventory_item=inv_item,
                    quantity=qty,
                    unit=unit,
                    estimated_unit_cost=est_cost,
                    notes=item_data.get("notes", ""),
                )

            AuditService.log(
                restaurant=restaurant,
                action=AuditAction.CREATE,
                entity_type=AuditEntityType.PURCHASE_REQUISITION,
                entity_id=str(requisition.id),
                actor=requester,
                description=f"Created requisition '{requisition.requisition_number}' with {len(items_data)} items",
            )
            return requisition

    @classmethod
    def submit_requisition(cls, requisition: PurchaseRequisition, actor: User) -> PurchaseRequisition:
        with transaction.atomic():
            req = PurchaseRequisition.objects.select_for_update().get(id=requisition.id)
            if req.status != PurchaseRequisition.RequisitionStatus.DRAFT:
                raise ValidationError(f"Cannot submit requisition in status {req.status}")

            req.status = PurchaseRequisition.RequisitionStatus.SUBMITTED
            req.save()

            # Trigger alert for managers
            managers = User.objects.filter(memberships__tenant_id=req.restaurant.id, is_active=True)
            for mgr in managers[:5]:
                NotificationService.create_notification(
                    restaurant=req.restaurant,
                    recipient=mgr,
                    notification_type=NotificationType.PURCHASE_REQUISITION_SUBMITTED,
                    title="New Purchase Requisition Submitted",
                    message=f"Requisition {req.requisition_number} ({req.priority}) submitted by {actor.first_name or actor.email}",
                    severity=NotificationSeverity.INFO,
                )

            return req

    @classmethod
    def approve_requisition(cls, requisition: PurchaseRequisition, approver: User) -> PurchaseRequisition:
        with transaction.atomic():
            req = PurchaseRequisition.objects.select_for_update().get(id=requisition.id)
            if req.status not in [PurchaseRequisition.RequisitionStatus.SUBMITTED, PurchaseRequisition.RequisitionStatus.UNDER_REVIEW]:
                raise ValidationError(f"Cannot approve requisition in status {req.status}")

            req.status = PurchaseRequisition.RequisitionStatus.APPROVED
            req.reviewed_by = approver
            req.reviewed_at = timezone.now()
            req.save()

            AuditService.log(
                restaurant=req.restaurant,
                action=AuditAction.APPROVED,
                entity_type=AuditEntityType.PURCHASE_REQUISITION,
                entity_id=str(req.id),
                actor=approver,
                description=f"Approved purchase requisition '{req.requisition_number}'",
            )

            NotificationService.create_notification(
                restaurant=req.restaurant,
                recipient=req.requester,
                notification_type=NotificationType.PURCHASE_REQUISITION_APPROVED,
                title="Purchase Requisition Approved",
                message=f"Your requisition {req.requisition_number} has been approved.",
                severity=NotificationSeverity.SUCCESS,
            )
            return req


class PurchaseOrderService:
    """Purchase order lifecycle, versioning, 3-way matching, and goods receiving."""

    @classmethod
    def generate_po_number(cls, restaurant: Restaurant) -> str:
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
    def create_purchase_order(
        cls,
        restaurant: Restaurant,
        supplier: Supplier,
        items_data: List[Dict[str, Any]],
        created_by: Optional[User] = None,
        user: Optional[User] = None,
        order_date: Optional[Any] = None,
        expected_delivery_date: Optional[Any] = None,
        tax_amount: Decimal = Decimal("0.00"),
        discount_amount: Decimal = Decimal("0.00"),
        location: str = StorageLocation.MAIN_STORE,
        notes: str = "",
    ) -> PurchaseOrder:
        if not items_data:
            raise ValidationError("At least one line item is required for a Purchase Order.")

        creator = created_by or user
        with transaction.atomic():
            po_number = cls.generate_po_number(restaurant)
            order_date = order_date or timezone.now().date()
            if not expected_delivery_date:
                expected_delivery_date = order_date + timezone.timedelta(days=supplier.lead_time_days or 2)

            subtotal = Decimal("0.00")
            for item in items_data:
                inv_item = InventoryItem.objects.get(id=item["inventory_item_id"], restaurant=restaurant)
                qty = quantize_stock(Decimal(str(item["quantity_ordered"])))
                cost = Decimal(str(item.get("unit_cost") if item.get("unit_cost") is not None else inv_item.cost_per_unit))
                subtotal += (qty * cost).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

            total_amount = (subtotal + tax_amount - discount_amount).quantize(Decimal("0.01"))

            po = PurchaseOrder.objects.create(
                restaurant=restaurant,
                supplier=supplier,
                po_number=po_number,
                status=PurchaseOrder.POStatus.DRAFT,
                version=1,
                location=location,
                currency=supplier.currency,
                payment_terms=supplier.payment_terms,
                order_date=order_date,
                expected_delivery_date=expected_delivery_date,
                subtotal=subtotal,
                tax_amount=tax_amount,
                discount_amount=discount_amount,
                total_amount=total_amount,
                notes=notes.strip(),
                created_by=creator,
            )

            for item in items_data:
                inv_item = InventoryItem.objects.get(id=item["inventory_item_id"], restaurant=restaurant)
                qty = quantize_stock(Decimal(str(item["quantity_ordered"])))
                cost = Decimal(str(item.get("unit_cost") if item.get("unit_cost") is not None else inv_item.cost_per_unit))
                line_total = (qty * cost).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

                PurchaseOrderItem.objects.create(
                    purchase_order=po,
                    inventory_item=inv_item,
                    item_name_snapshot=inv_item.name,
                    quantity_ordered=qty,
                    unit=item.get("unit", inv_item.unit),
                    unit_cost=cost,
                    line_total=line_total,
                    quantity_received=Decimal("0.000"),
                )

            AuditService.log(
                restaurant=restaurant,
                action=AuditAction.CREATE,
                entity_type=AuditEntityType.PURCHASE_ORDER,
                entity_id=str(po.id),
                actor=creator,
                description=f"Created PO '{po.po_number}' to {supplier.name} for ${po.total_amount}",
            )

            def emit_po_created():
                from apps.workflows.events import publish_event_via_bus
                publish_event_via_bus(
                    restaurant=restaurant,
                    event_type="PURCHASE_ORDER_CREATED",
                    entity_type="PURCHASE_ORDER",
                    entity_id=str(po.id),
                    payload={
                        "po_id": str(po.id),
                        "po_number": po.po_number,
                        "supplier_id": str(supplier.id),
                        "supplier_name": supplier.name,
                        "total_amount": str(po.total_amount),
                        "status": po.status,
                    },
                )
            transaction.on_commit(emit_po_created)
            return po

    @classmethod
    def submit_purchase_order(cls, po: PurchaseOrder, actor: Optional[User] = None, user: Optional[User] = None) -> PurchaseOrder:
        with transaction.atomic():
            order = PurchaseOrder.objects.select_for_update().get(id=po.id)
            if order.status != PurchaseOrder.POStatus.DRAFT:
                raise ValidationError(f"Cannot submit PO in status {order.status}")

            order.status = PurchaseOrder.POStatus.SUBMITTED
            order.save()

            submitter = actor or user or order.created_by
            if submitter:
                NotificationService.create_notification(
                    restaurant=order.restaurant,
                    recipient=submitter,
                    notification_type=NotificationType.PURCHASE_ORDER_PENDING,
                    title="PO Submitted for Approval",
                    message=f"Purchase order {order.po_number} (${order.total_amount}) submitted for approval.",
                    severity=NotificationSeverity.INFO,
                )
            return order

    @classmethod
    def approve_purchase_order(cls, po: PurchaseOrder, approver: Optional[User] = None, user: Optional[User] = None) -> PurchaseOrder:
        with transaction.atomic():
            order = PurchaseOrder.objects.select_for_update().get(id=po.id)
            if order.status not in [PurchaseOrder.POStatus.DRAFT, PurchaseOrder.POStatus.SUBMITTED, PurchaseOrder.POStatus.PENDING_APPROVAL]:
                raise ValidationError(f"Cannot approve PO in status {order.status}")

            admin = approver or user
            order.status = PurchaseOrder.POStatus.APPROVED
            order.approved_by = admin
            order.approved_at = timezone.now()
            order.save()

            # Update committed budget tracking
            ProcurementBudgetService.track_committed_spend(order)

            AuditService.log(
                restaurant=order.restaurant,
                action=AuditAction.APPROVED,
                entity_type=AuditEntityType.PURCHASE_ORDER,
                entity_id=str(order.id),
                actor=admin,
                description=f"Approved purchase order '{order.po_number}' (${order.total_amount})",
            )
            return order

    @classmethod
    def send_purchase_order(cls, po: PurchaseOrder, sender: User) -> PurchaseOrder:
        with transaction.atomic():
            order = PurchaseOrder.objects.select_for_update().get(id=po.id)
            if order.status != PurchaseOrder.POStatus.APPROVED:
                raise ValidationError("Only approved purchase orders can be sent to vendors.")

            order.status = PurchaseOrder.POStatus.SENT
            order.sent_by = sender
            order.sent_at = timezone.now()
            order.save()

            AuditService.log(
                restaurant=order.restaurant,
                action=AuditAction.STATUS_CHANGED,
                entity_type=AuditEntityType.PURCHASE_ORDER,
                entity_id=str(order.id),
                actor=sender,
                description=f"Sent PO '{order.po_number}' to vendor {order.supplier.name} ({order.supplier.email})",
            )
            return order

    @classmethod
    def acknowledge_purchase_order(
        cls,
        po: PurchaseOrder,
        status: str,
        supplier_notes: str = "",
        rescheduled_date: Optional[Any] = None,
    ) -> PurchaseOrder:
        with transaction.atomic():
            order = PurchaseOrder.objects.select_for_update().get(id=po.id)
            order.status = PurchaseOrder.POStatus.ACKNOWLEDGED
            order.acknowledgement_status = status
            order.acknowledged_at = timezone.now()
            order.supplier_notes = supplier_notes.strip()
            if rescheduled_date:
                order.expected_delivery_date = rescheduled_date
            order.save()
            return order

    @classmethod
    def receive_purchase_order(
        cls,
        restaurant: Restaurant,
        po: PurchaseOrder,
        items_received_data: List[Dict[str, Any]],
        idempotency_key: str = "",
        user: Optional[User] = None,
        notes: str = "",
    ) -> PurchaseReceipt:
        return cls.receive_goods(
            purchase_order=po,
            received_items=items_received_data,
            received_by=user,
            idempotency_key=idempotency_key,
            notes=notes,
        )

    @classmethod
    def receive_goods(
        cls,
        purchase_order: PurchaseOrder,
        received_items: List[Dict[str, Any]],
        received_by: Optional[User] = None,
        invoice_number: str = "",
        delivery_note_number: str = "",
        idempotency_key: str = "",
        notes: str = "",
    ) -> PurchaseReceipt:
        """
        Atomic receiving of ordered items, updating batch lots, unit cost, and inventory transactions.
        """
        with transaction.atomic():
            po = PurchaseOrder.objects.select_for_update().get(id=purchase_order.id)
            if po.status in [PurchaseOrder.POStatus.DRAFT, PurchaseOrder.POStatus.PENDING_APPROVAL, PurchaseOrder.POStatus.CANCELLED, PurchaseOrder.POStatus.CLOSED]:
                raise ValidationError(f"Cannot receive goods for PO in status '{po.status}'")

            # Check Idempotency
            if idempotency_key:
                existing = PurchaseReceipt.objects.filter(
                    restaurant=po.restaurant,
                    idempotency_key=idempotency_key
                ).first()
                if existing:
                    return existing

            date_str = timezone.now().strftime("%Y%m%d")
            receipt_count = PurchaseReceipt.objects.filter(restaurant=po.restaurant).count() + 1
            receipt_num = f"REC-{date_str}-{receipt_count:04d}"

            receipt = PurchaseReceipt.objects.create(
                restaurant=po.restaurant,
                purchase_order=po,
                receipt_number=receipt_num,
                invoice_number=invoice_number.strip(),
                delivery_note_number=delivery_note_number.strip(),
                storage_location=po.location,
                received_by=received_by,
                idempotency_key=idempotency_key,
                notes=notes.strip(),
            )

            all_lines_fulfilled = True

            for item_data in received_items:
                po_item = PurchaseOrderItem.objects.select_for_update().get(
                    id=item_data["purchase_order_item_id"],
                    purchase_order=po
                )
                raw_qty = item_data.get("quantity") or item_data.get("quantity_received", "0.000")
                delivered_qty = quantize_stock(Decimal(str(raw_qty)))

                if delivered_qty > po_item.remaining_quantity:
                    raise ValidationError(
                        f"Cannot receive {delivered_qty} {po_item.unit}. Only {po_item.remaining_quantity} {po_item.unit} remaining on line item."
                    )

                accepted_qty = quantize_stock(Decimal(str(item_data.get("quantity_accepted", delivered_qty))))
                rejected_qty = quantize_stock(Decimal(str(item_data.get("quantity_rejected", Decimal("0.000")))))
                rejection_reason = item_data.get("rejection_reason", PurchaseReceiptItem.RejectionReason.NONE)
                batch_no = item_data.get("batch_number", "")
                expiry_d = item_data.get("expiry_date", None)
                unit_cost_actual = Decimal(str(item_data.get("unit_cost_actual", po_item.unit_cost)))

                PurchaseReceiptItem.objects.create(
                    receipt=receipt,
                    purchase_order_item=po_item,
                    quantity_received=delivered_qty,
                    quantity_accepted=accepted_qty,
                    quantity_rejected=rejected_qty,
                    rejection_reason=rejection_reason,
                    batch_number=batch_no,
                    expiry_date=expiry_d,
                    unit_cost_actual=unit_cost_actual,
                    unit=po_item.unit,
                )

                # Only accepted goods increase on-hand inventory stock
                if accepted_qty > Decimal("0.000"):
                    # Call InventoryService to update stock and moving weighted average cost
                    InventoryService.receive_stock(
                        restaurant=po.restaurant,
                        item=po_item.inventory_item,
                        quantity=accepted_qty,
                        unit=po_item.unit,
                        unit_cost=unit_cost_actual,
                        batch_number=batch_no,
                        expiry_date=expiry_d,
                        supplier_name=po.supplier.name,
                        reference=f"{po.po_number} / {receipt.receipt_number}",
                        reason="Purchase Order Intake",
                        user=received_by,
                    )

                po_item.quantity_received += accepted_qty
                po_item.save()

                if po_item.remaining_quantity > Decimal("0.000"):
                    all_lines_fulfilled = False

            if all_lines_fulfilled:
                po.status = PurchaseOrder.POStatus.RECEIVED
            else:
                po.status = PurchaseOrder.POStatus.PARTIALLY_RECEIVED
            po.save()

            AuditService.log(
                restaurant=po.restaurant,
                action=AuditAction.STOCK_RECEIVED,
                entity_type=AuditEntityType.PURCHASE_RECEIPT,
                entity_id=str(receipt.id),
                actor=received_by,
                description=f"Received delivery for PO '{po.po_number}' under receipt '{receipt.receipt_number}'",
            )

            def emit_po_received():
                from apps.workflows.events import publish_event_via_bus
                publish_event_via_bus(
                    restaurant=po.restaurant,
                    event_type="PURCHASE_ORDER_RECEIVED",
                    entity_type="PURCHASE_ORDER",
                    entity_id=str(po.id),
                    payload={
                        "po_id": str(po.id),
                        "po_number": po.po_number,
                        "receipt_id": str(receipt.id),
                        "receipt_number": receipt.receipt_number,
                        "status": po.status,
                        "supplier_id": str(po.supplier_id),
                    },
                )
            transaction.on_commit(emit_po_received)
            return receipt


class PurchaseReturnService:
    """Return damaged or substandard items to suppliers and generate credit notes."""

    @classmethod
    def create_purchase_return(
        cls,
        restaurant: Restaurant,
        supplier: Supplier,
        items_data: List[Dict[str, Any]],
        reason: str = PurchaseReturn.ReturnReason.DAMAGED,
        purchase_receipt: Optional[PurchaseReceipt] = None,
        requested_by: Optional[User] = None,
        notes: str = "",
    ) -> PurchaseReturn:
        with transaction.atomic():
            date_str = timezone.now().strftime("%Y%m%d")
            count = PurchaseReturn.objects.filter(restaurant=restaurant).count() + 1
            ret_num = f"RET-{date_str}-{count:04d}"

            total_credit = Decimal("0.00")
            for item in items_data:
                qty = quantize_stock(Decimal(str(item["quantity"])))
                cost = Decimal(str(item["unit_cost"]))
                total_credit += (qty * cost).quantize(Decimal("0.01"))

            p_return = PurchaseReturn.objects.create(
                restaurant=restaurant,
                supplier=supplier,
                purchase_receipt=purchase_receipt,
                return_number=ret_num,
                status=PurchaseReturn.ReturnStatus.REQUESTED,
                reason=reason,
                total_credit_amount=total_credit,
                requested_by=requested_by,
                notes=notes.strip(),
            )

            for item in items_data:
                inv_item = InventoryItem.objects.get(id=item["inventory_item_id"], restaurant=restaurant)
                qty = quantize_stock(Decimal(str(item["quantity"])))
                cost = Decimal(str(item["unit_cost"]))

                PurchaseReturnItem.objects.create(
                    purchase_return=p_return,
                    inventory_item=inv_item,
                    quantity=qty,
                    unit=item.get("unit", inv_item.unit),
                    unit_cost=cost,
                    line_total=(qty * cost).quantize(Decimal("0.01")),
                    notes=item.get("notes", ""),
                )

            return p_return

    @classmethod
    def approve_and_dispatch_return(cls, purchase_return: PurchaseReturn, approver: User) -> PurchaseReturn:
        with transaction.atomic():
            ret = PurchaseReturn.objects.select_for_update().get(id=purchase_return.id)
            if ret.status != PurchaseReturn.ReturnStatus.REQUESTED:
                raise ValidationError("Return is not in REQUESTED status.")

            ret.status = PurchaseReturn.ReturnStatus.COMPLETED
            ret.approved_by = approver
            ret.save()

            # Reverse inventory quantity for returned items
            for line in ret.items.all():
                InventoryService.adjust_stock(
                    restaurant=ret.restaurant,
                    item=line.inventory_item,
                    delta_quantity=-line.quantity,
                    reason=f"Purchase Return {ret.return_number} - {ret.reason}",
                    user=approver,
                )

            # Issue Supplier Credit
            SupplierCredit.objects.create(
                restaurant=ret.restaurant,
                supplier=ret.supplier,
                credit_note_number=f"CR-{ret.return_number}",
                amount=ret.total_credit_amount,
                currency=ret.supplier.currency,
                status=SupplierCredit.CreditStatus.PENDING,
                related_return=ret,
                reason=f"Credit for Return {ret.return_number}",
                issued_date=timezone.now().date(),
            )

            AuditService.log(
                restaurant=ret.restaurant,
                action=AuditAction.APPROVED,
                entity_type=AuditEntityType.PURCHASE_RETURN,
                entity_id=str(ret.id),
                actor=approver,
                description=f"Dispatched return '{ret.return_number}' for ${ret.total_credit_amount}",
            )
            return ret


class SupplierInvoiceMatchService:
    """3-Way Match comparison: Purchase Order vs. Goods Receipt vs. Supplier Invoice."""

    @classmethod
    def match_invoice(
        cls,
        restaurant: Restaurant,
        purchase_order: PurchaseOrder,
        invoice_number: str,
        invoice_date: Any,
        items_data: List[Dict[str, Any]],
        tax_amount: Decimal = Decimal("0.00"),
        reviewed_by: Optional[User] = None,
        notes: str = "",
    ) -> SupplierInvoice:
        with transaction.atomic():
            subtotal = Decimal("0.00")
            for i in items_data:
                subtotal += (Decimal(str(i["quantity_invoiced"])) * Decimal(str(i["unit_price"]))).quantize(Decimal("0.01"))

            total_amount = subtotal + tax_amount

            # 3-Way Match Check
            qty_variance = Decimal("0.000")
            price_variance = Decimal("0.00")

            for item_data in items_data:
                inv_item = InventoryItem.objects.get(id=item_data["inventory_item_id"], restaurant=restaurant)
                qty_inv = Decimal(str(item_data["quantity_invoiced"]))
                price_inv = Decimal(str(item_data["unit_price"]))

                po_line = purchase_order.items.filter(inventory_item=inv_item).first()
                if po_line:
                    qty_diff = abs(po_line.quantity_received - qty_inv)
                    price_diff = abs(po_line.unit_cost - price_inv)
                    qty_variance += qty_diff
                    price_variance += price_diff

            match_status = SupplierInvoice.MatchStatus.MATCHED
            if qty_variance > Decimal("0.000") or price_variance > Decimal("0.00"):
                match_status = SupplierInvoice.MatchStatus.VARIANCE

            invoice = SupplierInvoice.objects.create(
                restaurant=restaurant,
                supplier=purchase_order.supplier,
                purchase_order=purchase_order,
                invoice_number=invoice_number.strip(),
                invoice_date=invoice_date,
                subtotal=subtotal,
                tax_amount=tax_amount,
                total_amount=total_amount,
                match_status=match_status,
                quantity_variance=qty_variance,
                price_variance=price_variance,
                reviewed_by=reviewed_by,
                reviewed_at=timezone.now() if match_status == SupplierInvoice.MatchStatus.MATCHED else None,
                notes=notes.strip(),
            )

            for i in items_data:
                inv_item = InventoryItem.objects.get(id=i["inventory_item_id"], restaurant=restaurant)
                q = Decimal(str(i["quantity_invoiced"]))
                p = Decimal(str(i["unit_price"]))
                t = Decimal(str(i.get("tax_amount", "0.00")))
                SupplierInvoiceItem.objects.create(
                    invoice=invoice,
                    inventory_item=inv_item,
                    quantity_invoiced=q,
                    unit_price=p,
                    tax_amount=t,
                    line_total=(q * p + t).quantize(Decimal("0.01")),
                )

            return invoice


class ProcurementPlanningService:
    """Automated reorder calculations with MOQ, Pack Size, and lead-time factoring."""

    @classmethod
    def generate_purchase_recommendations(cls, restaurant: Restaurant) -> List[Dict[str, Any]]:
        items = InventoryItem.objects.filter(restaurant=restaurant, is_active=True)
        recommendations = []

        for item in items:
            current_stock = item.current_quantity
            min_stock = item.minimum_stock_level
            par_level = item.par_level

            # Calculate pending inbound PO quantities
            pending_po_lines = PurchaseOrderItem.objects.filter(
                purchase_order__restaurant=restaurant,
                purchase_order__status__in=[
                    PurchaseOrder.POStatus.APPROVED,
                    PurchaseOrder.POStatus.SENT,
                    PurchaseOrder.POStatus.ACKNOWLEDGED,
                    PurchaseOrder.POStatus.PARTIALLY_RECEIVED,
                ],
                inventory_item=item
            )
            inbound_qty = sum((p.remaining_quantity for p in pending_po_lines), Decimal("0.000"))

            effective_stock = current_stock + inbound_qty
            deficit = max(Decimal("0.000"), par_level - effective_stock)

            if deficit > Decimal("0.000") or current_stock <= min_stock:
                # Find Preferred Supplier Item mapping
                preferred_link = SupplierItem.objects.filter(
                    inventory_item=item,
                    is_preferred=True,
                    is_active=True
                ).select_related("supplier").first()

                if not preferred_link:
                    # Fallback to any active supplier mapping
                    preferred_link = SupplierItem.objects.filter(
                        inventory_item=item,
                        is_active=True
                    ).select_related("supplier").first()

                suggested_qty = deficit if deficit > Decimal("0.000") else (min_stock * Decimal("1.5"))

                supplier_name = "Unassigned"
                supplier_id = None
                unit_cost = item.cost_per_unit
                moq = Decimal("1.000")
                pack_size = Decimal("1.000")
                lead_days = 2
                reason = "BELOW_PAR" if current_stock < par_level else "LOW_STOCK"

                if preferred_link:
                    supplier_name = preferred_link.supplier.name
                    supplier_id = str(preferred_link.supplier.id)
                    unit_cost = preferred_link.unit_cost
                    moq = preferred_link.minimum_order_quantity
                    pack_size = preferred_link.pack_size
                    lead_days = preferred_link.lead_time_days

                    # Round up to MOQ
                    if suggested_qty < moq:
                        suggested_qty = moq
                        reason = "MOQ_ROUNDUP"

                    # Round up to nearest Pack Size
                    if pack_size > Decimal("1.000"):
                        units = (suggested_qty / pack_size).quantize(Decimal("1"), rounding=ROUND_CEILING)
                        suggested_qty = units * pack_size
                        if reason != "MOQ_ROUNDUP":
                            reason = "PACK_SIZE_ROUNDUP"

                est_cost = (suggested_qty * unit_cost).quantize(Decimal("0.01"))

                recommendations.append({
                    "inventory_item_id": str(item.id),
                    "item_name": item.name,
                    "sku": item.sku,
                    "unit": item.unit,
                    "current_stock": str(current_stock),
                    "par_level": str(par_level),
                    "minimum_stock": str(min_stock),
                    "inbound_quantity": str(inbound_qty),
                    "suggested_quantity": str(suggested_qty),
                    "unit_cost": str(unit_cost),
                    "estimated_total_cost": str(est_cost),
                    "preferred_supplier_id": supplier_id,
                    "preferred_supplier_name": supplier_name,
                    "moq": str(moq),
                    "pack_size": str(pack_size),
                    "lead_time_days": lead_days,
                    "recommendation_reason": reason,
                })

        return recommendations


class ProcurementBudgetService:
    """Budget spend limits and allocation tracking."""

    @classmethod
    def track_committed_spend(cls, purchase_order: PurchaseOrder) -> None:
        budgets = ProcurementBudget.objects.filter(
            restaurant=purchase_order.restaurant,
            location=purchase_order.location,
            start_date__lte=purchase_order.order_date or timezone.now().date(),
            end_date__gte=purchase_order.order_date or timezone.now().date()
        )
        for b in budgets:
            b.committed_amount += purchase_order.total_amount
            b.save()
            # Check alert threshold (e.g. >= 90%)
            if b.utilization_percentage >= Decimal("90.00"):
                managers = User.objects.filter(memberships__tenant_id=purchase_order.restaurant.id, is_active=True)
                for mgr in managers[:3]:
                    NotificationService.create_notification(
                        restaurant=purchase_order.restaurant,
                        recipient=mgr,
                        notification_type=NotificationType.BUDGET_THRESHOLD_REACHED,
                        title=f"Procurement Budget Alert: {b.name}",
                        message=f"Budget utilization is at {b.utilization_percentage}% for {b.name}.",
                        severity=NotificationSeverity.WARNING,
                    )
