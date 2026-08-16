from datetime import datetime, time, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, List, Tuple
from django.db.models import Sum, Count, Avg, F, Q, DecimalField
from django.db.models.functions import TruncDate, Coalesce
from django.utils import timezone
from apps.restaurants.models import Restaurant
from apps.orders.models import Order, OrderItem
from apps.billing.models import Bill, Payment
from apps.inventory.models import InventoryItem, StockMovement
from apps.procurement.models import PurchaseOrder, Supplier

def quantize_money(val: Any) -> str:
    if val is None:
        return "0.00"
    dec = Decimal(str(val))
    return str(dec.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))

class DateFilterHelper:
    """Standardizes date ranges across reporting selectors."""

    @classmethod
    def get_range(
        cls,
        preset: str = "LAST_7_DAYS",
        start_date_str: str = None,
        end_date_str: str = None,
    ) -> Tuple[datetime, datetime]:
        now = timezone.now()
        today = now.date()

        if preset == "TODAY":
            start_date = today
            end_date = today
        elif preset == "YESTERDAY":
            start_date = today - timedelta(days=1)
            end_date = start_date
        elif preset == "LAST_7_DAYS":
            start_date = today - timedelta(days=6)
            end_date = today
        elif preset == "LAST_30_DAYS":
            start_date = today - timedelta(days=29)
            end_date = today
        elif preset == "THIS_MONTH":
            start_date = today.replace(day=1)
            end_date = today
        elif preset == "CUSTOM" and start_date_str and end_date_str:
            try:
                start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
                end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
            except ValueError:
                start_date = today - timedelta(days=6)
                end_date = today
        else:
            start_date = today - timedelta(days=6)
            end_date = today

        start_dt = timezone.make_aware(datetime.combine(start_date, time.min))
        end_dt = timezone.make_aware(datetime.combine(end_date, time.max))
        return start_dt, end_dt

class ReportService:
    """Read-only reporting and analytics query service."""

    @classmethod
    def get_dashboard_summary(cls, restaurant: Restaurant, start_dt: datetime, end_dt: datetime) -> Dict[str, Any]:
        """Compact single-flight executive dashboard overview."""
        # 1. Sales & Invoicing KPIs
        bills_qs = Bill.objects.filter(
            restaurant=restaurant,
            created_at__range=(start_dt, end_dt),
        ).exclude(status=Bill.BillStatus.VOID)

        bill_agg = bills_qs.aggregate(
            gross_sales=Coalesce(Sum("subtotal"), Decimal("0.00"), output_field=DecimalField()),
            total_discount=Coalesce(Sum("discount_amount"), Decimal("0.00"), output_field=DecimalField()),
            total_tax=Coalesce(Sum("tax_amount"), Decimal("0.00"), output_field=DecimalField()),
            net_sales=Coalesce(Sum("grand_total"), Decimal("0.00"), output_field=DecimalField()),
            total_paid=Coalesce(Sum("total_paid"), Decimal("0.00"), output_field=DecimalField()),
            balance_due=Coalesce(Sum("balance_due"), Decimal("0.00"), output_field=DecimalField()),
            bill_count=Count("id"),
        )

        bill_count = bill_agg["bill_count"]
        net_sales = bill_agg["net_sales"]
        aov = (net_sales / bill_count).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) if bill_count > 0 else Decimal("0.00")

        # 2. Orders summary
        orders_qs = Order.objects.filter(
            restaurant=restaurant,
            created_at__range=(start_dt, end_dt),
        )
        total_orders = orders_qs.count()
        completed_orders = orders_qs.filter(status=Order.OrderStatus.COMPLETED).count()
        cancelled_orders = orders_qs.filter(status=Order.OrderStatus.CANCELLED).count()
        active_orders = orders_qs.exclude(status__in=[Order.OrderStatus.COMPLETED, Order.OrderStatus.CANCELLED]).count()

        # 3. Payments breakdown
        payments_qs = Payment.objects.filter(
            restaurant=restaurant,
            created_at__range=(start_dt, end_dt),
            status=Payment.PaymentStatus.SUCCESS,
        )
        payments_by_method = list(
            payments_qs.values("payment_method")
            .annotate(
                total_amount=Coalesce(Sum("amount"), Decimal("0.00"), output_field=DecimalField()),
                count=Count("id"),
            )
            .order_by("-total_amount")
        )

        # 4. Inventory counts
        inv_items = InventoryItem.objects.filter(restaurant=restaurant, is_active=True)
        total_inv_items = inv_items.count()
        low_stock_count = inv_items.filter(current_quantity__gt=0, current_quantity__lte=F("minimum_stock_level")).count()
        out_of_stock_count = inv_items.filter(current_quantity__lte=0).count()
        in_stock_count = total_inv_items - low_stock_count - out_of_stock_count

        # 5. Procurement summary
        pos_qs = PurchaseOrder.objects.filter(restaurant=restaurant)
        open_pos = pos_qs.filter(status__in=[PurchaseOrder.POStatus.SUBMITTED, PurchaseOrder.POStatus.APPROVED, PurchaseOrder.POStatus.PARTIALLY_RECEIVED]).count()
        pending_approval_pos = pos_qs.filter(status=PurchaseOrder.POStatus.SUBMITTED).count()

        return {
            "sales": {
                "gross_sales": quantize_money(bill_agg["gross_sales"]),
                "discount_amount": quantize_money(bill_agg["total_discount"]),
                "tax_amount": quantize_money(bill_agg["total_tax"]),
                "net_sales": quantize_money(net_sales),
                "total_paid": quantize_money(bill_agg["total_paid"]),
                "balance_due": quantize_money(bill_agg["balance_due"]),
                "total_bills": bill_count,
                "average_order_value": str(aov),
            },
            "orders": {
                "total_orders": total_orders,
                "completed_orders": completed_orders,
                "cancelled_orders": cancelled_orders,
                "active_orders": active_orders,
            },
            "payments": [
                {
                    "payment_method": p["payment_method"],
                    "total_amount": quantize_money(p["total_amount"]),
                    "count": p["count"],
                }
                for p in payments_by_method
            ],
            "inventory": {
                "total_items": total_inv_items,
                "in_stock": in_stock_count,
                "low_stock": low_stock_count,
                "out_of_stock": out_of_stock_count,
            },
            "procurement": {
                "open_purchase_orders": open_pos,
                "pending_approval": pending_approval_pos,
            },
        }

    @classmethod
    def get_sales_report(cls, restaurant: Restaurant, start_dt: datetime, end_dt: datetime) -> Dict[str, Any]:
        """Comprehensive sales summary and daily revenue trend."""
        bills_qs = Bill.objects.filter(
            restaurant=restaurant,
            created_at__range=(start_dt, end_dt),
        ).exclude(status=Bill.BillStatus.VOID)

        summary = bills_qs.aggregate(
            gross_sales=Coalesce(Sum("subtotal"), Decimal("0.00"), output_field=DecimalField()),
            discounts=Coalesce(Sum("discount_amount"), Decimal("0.00"), output_field=DecimalField()),
            service_charge=Coalesce(Sum("service_charge_amount"), Decimal("0.00"), output_field=DecimalField()),
            tax=Coalesce(Sum("tax_amount"), Decimal("0.00"), output_field=DecimalField()),
            net_sales=Coalesce(Sum("grand_total"), Decimal("0.00"), output_field=DecimalField()),
            total_paid=Coalesce(Sum("total_paid"), Decimal("0.00"), output_field=DecimalField()),
            balance_due=Coalesce(Sum("balance_due"), Decimal("0.00"), output_field=DecimalField()),
            bill_count=Count("id"),
        )

        bill_count = summary["bill_count"]
        net_sales = summary["net_sales"]
        aov = (net_sales / bill_count).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) if bill_count > 0 else Decimal("0.00")

        # Daily sales trend
        daily_trends = list(
            bills_qs.annotate(date=TruncDate("created_at"))
            .values("date")
            .annotate(
                gross_sales=Coalesce(Sum("subtotal"), Decimal("0.00"), output_field=DecimalField()),
                net_sales=Coalesce(Sum("grand_total"), Decimal("0.00"), output_field=DecimalField()),
                total_paid=Coalesce(Sum("total_paid"), Decimal("0.00"), output_field=DecimalField()),
                order_count=Count("id"),
            )
            .order_by("date")
        )

        return {
            "summary": {
                "gross_sales": quantize_money(summary["gross_sales"]),
                "discounts": quantize_money(summary["discounts"]),
                "service_charge": quantize_money(summary["service_charge"]),
                "tax": quantize_money(summary["tax"]),
                "net_sales": quantize_money(net_sales),
                "total_paid": quantize_money(summary["total_paid"]),
                "balance_due": quantize_money(summary["balance_due"]),
                "bill_count": bill_count,
                "average_order_value": str(aov),
            },
            "daily_trends": [
                {
                    "date": d["date"].isoformat() if d["date"] else "",
                    "gross_sales": quantize_money(d["gross_sales"]),
                    "net_sales": quantize_money(d["net_sales"]),
                    "total_paid": quantize_money(d["total_paid"]),
                    "order_count": d["order_count"],
                }
                for d in daily_trends
            ],
        }

    @classmethod
    def get_payment_report(cls, restaurant: Restaurant, start_dt: datetime, end_dt: datetime) -> Dict[str, Any]:
        """Settled payment tenders breakdown."""
        payments_qs = Payment.objects.filter(
            restaurant=restaurant,
            created_at__range=(start_dt, end_dt),
            status=Payment.PaymentStatus.SUCCESS,
        )

        total_agg = payments_qs.aggregate(
            grand_total=Coalesce(Sum("amount"), Decimal("0.00"), output_field=DecimalField()),
            total_count=Count("id"),
        )
        grand_total = total_agg["grand_total"]

        breakdown = list(
            payments_qs.values("payment_method")
            .annotate(
                total_amount=Coalesce(Sum("amount"), Decimal("0.00"), output_field=DecimalField()),
                count=Count("id"),
            )
            .order_by("-total_amount")
        )

        results = []
        for b in breakdown:
            amt = b["total_amount"]
            pct = ((amt / grand_total) * 100).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP) if grand_total > 0 else Decimal("0.0")
            results.append({
                "payment_method": b["payment_method"],
                "total_amount": quantize_money(amt),
                "count": b["count"],
                "percentage": str(pct),
            })

        return {
            "total_amount": quantize_money(grand_total),
            "total_transactions": total_agg["total_count"],
            "breakdown": results,
        }

    @classmethod
    def get_popular_items(cls, restaurant: Restaurant, start_dt: datetime, end_dt: datetime, limit: int = 10) -> List[Dict[str, Any]]:
        """Top-performing dishes by quantity ordered & historical snapshot revenue."""
        items_qs = OrderItem.objects.filter(
            order__restaurant=restaurant,
            order__created_at__range=(start_dt, end_dt),
        ).exclude(order__status=Order.OrderStatus.CANCELLED)

        popular = list(
            items_qs.values("item_name_snapshot")
            .annotate(
                quantity_sold=Sum("quantity"),
                revenue=Sum(F("quantity") * F("unit_price_snapshot"), output_field=DecimalField()),
                order_count=Count("order_id", distinct=True),
            )
            .order_by("-quantity_sold")[:limit]
        )

        return [
            {
                "item_name": p["item_name_snapshot"],
                "quantity_sold": p["quantity_sold"],
                "revenue": quantize_money(p["revenue"]),
                "order_count": p["order_count"],
            }
            for p in popular
        ]
