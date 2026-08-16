import logging
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, Dict, Any
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.orders.models import Order
from apps.orders.services import OrderService
from apps.billing.models import Bill, BillItem, Payment, TaxRule

logger = logging.getLogger("fluxiflow.billing")

def quantize_money(amount: Decimal) -> Decimal:
    """Format and round decimal amount to two decimal places."""
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

class BillingService:
    """
    Service layer for restaurant invoice generation, tax & discount calculation,
    and immutable financial snapshotting.
    """

    @classmethod
    def generate_bill_number(cls, restaurant: Restaurant) -> str:
        """Generate a sequential, restaurant-scoped bill number (e.g. BILL-000001)."""
        count = Bill.objects.filter(restaurant=restaurant).count() + 1
        return f"BILL-{count:06d}"

    @classmethod
    def get_restaurant_tax_rate(cls, restaurant: Restaurant) -> Decimal:
        """Fetch the active tax rate for the restaurant (default 5.00% if unconfigured)."""
        active_rule = TaxRule.objects.filter(restaurant=restaurant, is_active=True).first()
        return active_rule.rate if active_rule else Decimal("5.00")

    @classmethod
    def create_bill_for_order(
        cls,
        restaurant: Restaurant,
        user: User,
        order: Order,
        discount_type: str = Bill.DiscountType.NONE,
        discount_value: Decimal = Decimal("0.00"),
        service_charge_rate: Decimal = Decimal("0.00"),
        notes: str = "",
    ) -> Bill:
        """
        Generate an authoritative financial bill from a customer order.
        Creates immutable BillItem snapshots and computes taxes/discounts.
        """
        if order.restaurant_id != restaurant.id:
            raise ValidationError({"order_id": ["Order belongs to a different restaurant organization."]})

        if order.status not in [Order.OrderStatus.PLACED, Order.OrderStatus.COMPLETED]:
            raise ValidationError({"order_id": [f"Cannot generate bill for order in '{order.status}' status."]})

        existing_active_bill = Bill.objects.filter(
            restaurant=restaurant,
            order=order,
            status__in=[Bill.BillStatus.DRAFT, Bill.BillStatus.FINALIZED, Bill.BillStatus.PARTIALLY_PAID, Bill.BillStatus.PAID],
        ).first()

        if existing_active_bill:
            return existing_active_bill

        with transaction.atomic():
            order_items = list(order.items.all())
            if not order_items:
                raise ValidationError({"order": ["Cannot create a bill for an order with no items."]})

            # 1. Compute Subtotal from OrderItem snapshots
            subtotal = Decimal("0.00")
            for item in order_items:
                subtotal += item.line_total
            subtotal = quantize_money(subtotal)

            # 2. Compute Discount
            discount_val = Decimal(str(discount_value)) if discount_value else Decimal("0.00")
            discount_amount = Decimal("0.00")
            if discount_type == Bill.DiscountType.PERCENTAGE:
                if discount_val < Decimal("0.00") or discount_val > Decimal("100.00"):
                    raise ValidationError({"discount_value": ["Percentage discount must be between 0% and 100%."]})
                discount_amount = quantize_money((subtotal * discount_val) / Decimal("100.00"))
            elif discount_type == Bill.DiscountType.FIXED:
                if discount_val < Decimal("0.00"):
                    raise ValidationError({"discount_value": ["Fixed discount amount cannot be negative."]})
                discount_amount = min(subtotal, quantize_money(discount_val))

            net_after_discount = max(Decimal("0.00"), subtotal - discount_amount)

            # 3. Compute Service Charge
            svc_rate = Decimal(str(service_charge_rate)) if service_charge_rate else Decimal("0.00")
            if svc_rate < Decimal("0.00") or svc_rate > Decimal("50.00"):
                raise ValidationError({"service_charge_rate": ["Service charge rate must be between 0% and 50%."]})
            service_charge_amount = quantize_money((net_after_discount * svc_rate) / Decimal("100.00"))

            # 4. Compute Tax
            tax_rate = cls.get_restaurant_tax_rate(restaurant)
            tax_amount = quantize_money(((net_after_discount + service_charge_amount) * tax_rate) / Decimal("100.00"))

            # 5. Grand Total & Balance Due
            grand_total = quantize_money(net_after_discount + service_charge_amount + tax_amount)
            bill_number = cls.generate_bill_number(restaurant)

            bill = Bill.objects.create(
                restaurant=restaurant,
                order=order,
                bill_number=bill_number,
                status=Bill.BillStatus.FINALIZED,
                created_by=user,
                subtotal=subtotal,
                discount_type=discount_type,
                discount_value=discount_val,
                discount_amount=discount_amount,
                service_charge_rate=svc_rate,
                service_charge_amount=service_charge_amount,
                tax_rate_snapshot=tax_rate,
                tax_amount=tax_amount,
                rounding_adjustment=Decimal("0.00"),
                grand_total=grand_total,
                total_paid=Decimal("0.00"),
                balance_due=grand_total,
                notes=notes.strip(),
            )

            # 6. Create immutable BillItem records
            for item in order_items:
                BillItem.objects.create(
                    bill=bill,
                    order_item=item,
                    item_name_snapshot=item.item_name_snapshot,
                    unit_price_snapshot=item.unit_price_snapshot,
                    quantity=item.quantity,
                    line_total=item.line_total,
                )

            return bill

    @classmethod
    def void_bill(cls, bill: Bill, user: User, reason: str = "") -> Bill:
        """Void an active bill and prevent further payment recording."""
        if bill.status in [Bill.BillStatus.PAID, Bill.BillStatus.VOID]:
            raise ValidationError({"status": [f"Cannot void a bill in '{bill.status}' status."]})

        with transaction.atomic():
            bill.status = Bill.BillStatus.VOID
            if reason:
                bill.notes = f"{bill.notes} | VOIDED: {reason}".strip(" |")
            bill.save(update_fields=["status", "notes", "updated_at"])
            return bill


class PaymentService:
    """
    Service layer managing payment settlement, change calculations,
    idempotency enforcement, and concurrency locking.
    """

    @classmethod
    def process_payment(
        cls,
        restaurant: Restaurant,
        user: User,
        bill: Bill,
        amount: Decimal,
        payment_method: str = Payment.PaymentMethod.CASH,
        amount_tendered: Optional[Decimal] = None,
        reference: str = "",
        idempotency_key: Optional[str] = None,
    ) -> Payment:
        """
        Record a payment against a bill with concurrency protection (select_for_update)
        and idempotency verification.
        """
        if bill.restaurant_id != restaurant.id:
            raise ValidationError({"bill_id": ["Bill belongs to a different restaurant organization."]})

        # Idempotency check
        if idempotency_key:
            existing_payment = Payment.objects.filter(
                restaurant=restaurant,
                idempotency_key=idempotency_key,
                status=Payment.PaymentStatus.SUCCESS,
            ).first()
            if existing_payment:
                return existing_payment

        with transaction.atomic():
            # Concurrency row-lock on Bill
            locked_bill = Bill.objects.select_for_update().get(id=bill.id)

            if locked_bill.status in [Bill.BillStatus.PAID, Bill.BillStatus.VOID]:
                raise ValidationError({"bill": [f"Cannot process payment for a bill in '{locked_bill.status}' status."]})

            pay_amount = quantize_money(Decimal(str(amount)))
            if pay_amount <= Decimal("0.00"):
                raise ValidationError({"amount": ["Payment amount must be greater than zero."]})

            if pay_amount > locked_bill.balance_due:
                raise ValidationError({"amount": [f"Payment amount ({pay_amount}) cannot exceed remaining balance ({locked_bill.balance_due})."]})

            # Calculate change for cash payment
            change_returned = Decimal("0.00")
            tendered_val = None
            if payment_method == Payment.PaymentMethod.CASH and amount_tendered is not None:
                tendered_val = quantize_money(Decimal(str(amount_tendered)))
                if tendered_val < pay_amount:
                    raise ValidationError({"amount_tendered": [f"Cash tendered ({tendered_val}) cannot be less than applied amount ({pay_amount})."]})
                change_returned = quantize_money(tendered_val - pay_amount)

            # Record Payment
            payment = Payment.objects.create(
                restaurant=restaurant,
                bill=locked_bill,
                payment_method=payment_method,
                amount=pay_amount,
                amount_tendered=tendered_val,
                change_returned=change_returned,
                reference=reference.strip(),
                idempotency_key=idempotency_key.strip() if idempotency_key else None,
                status=Payment.PaymentStatus.SUCCESS,
                received_by=user,
            )

            # Update Bill Balances
            locked_bill.total_paid = quantize_money(locked_bill.total_paid + pay_amount)
            locked_bill.balance_due = quantize_money(locked_bill.grand_total - locked_bill.total_paid)

            if locked_bill.balance_due <= Decimal("0.00"):
                locked_bill.balance_due = Decimal("0.00")
                locked_bill.status = Bill.BillStatus.PAID

                # Complete parent order and free table
                order = locked_bill.order
                order.status = Order.OrderStatus.COMPLETED
                order.save(update_fields=["status", "updated_at"])
                OrderService._sync_table_occupancy_on_order_finish(order.table)
            else:
                locked_bill.status = Bill.BillStatus.PARTIALLY_PAID

            locked_bill.save(update_fields=["total_paid", "balance_due", "status", "updated_at"])

            return payment
