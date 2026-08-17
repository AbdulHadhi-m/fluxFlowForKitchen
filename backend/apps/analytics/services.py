"""
Central BI analytics services. Read-only consumers of existing domain models.
Each service queries its authoritative domain data and returns structured analytics.
"""
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from typing import Dict, Any, List, Optional, Tuple
from django.db.models import Sum, Count, Avg, F, Q, DecimalField, IntegerField, Case, When, Value
from django.db.models.functions import TruncDate, TruncHour, TruncWeek, TruncMonth, Coalesce, ExtractHour, ExtractWeekDay
from django.utils import timezone

from apps.restaurants.models import Restaurant
from apps.orders.models import Order, OrderItem
from apps.billing.models import Bill, Payment
from apps.inventory.models import InventoryItem, StockMovement, Recipe, RecipeItem, StockCount
from apps.procurement.models import PurchaseOrder, PurchaseOrderItem, Supplier, SupplierPriceHistory
from apps.reports.services import DateFilterHelper, quantize_money

_ZERO = Decimal("0.00")


def _safe_pct(numerator, denominator, places="0.01") -> Decimal:
    """Safe percentage: (numerator/denominator)*100, returns 0 if denominator is 0."""
    try:
        if not denominator or Decimal(str(denominator)) == _ZERO:
            return _ZERO
        return ((Decimal(str(numerator)) / Decimal(str(denominator))) * Decimal("100")).quantize(
            Decimal(places), rounding=ROUND_HALF_UP
        )
    except (InvalidOperation, TypeError, ZeroDivisionError):
        return _ZERO


def _safe_div(numerator, denominator, places="0.01") -> Decimal:
    try:
        if not denominator or Decimal(str(denominator)) == _ZERO:
            return _ZERO
        return (Decimal(str(numerator)) / Decimal(str(denominator))).quantize(Decimal(places), rounding=ROUND_HALF_UP)
    except (InvalidOperation, TypeError, ZeroDivisionError):
        return _ZERO


# ──────────────────────────────────────────────────────────────────────
# EXECUTIVE DASHBOARD
# ──────────────────────────────────────────────────────────────────────

class ExecutiveDashboardService:
    """Aggregates KPIs from all domains into a unified executive view."""

    @classmethod
    def get_executive_summary(cls, restaurant: Restaurant, start_dt: datetime, end_dt: datetime) -> Dict[str, Any]:
        """Single-flight executive dashboard with all key metrics."""
        sales = SalesAnalyticsService.get_summary(restaurant, start_dt, end_dt)
        profitability = ProfitabilityAnalyticsService.get_summary(restaurant, start_dt, end_dt)
        inventory = InventoryAnalyticsService.get_summary(restaurant)
        orders = _get_order_summary(restaurant, start_dt, end_dt)
        customers = CustomerAnalyticsService.get_summary(restaurant, start_dt, end_dt)
        delivery = DeliveryAnalyticsService.get_summary(restaurant, start_dt, end_dt)
        labor = LaborAnalyticsService.get_summary(restaurant, start_dt, end_dt)

        return {
            "period": {"start": start_dt.isoformat(), "end": end_dt.isoformat()},
            "revenue": sales.get("net_sales", "0.00"),
            "gross_profit": profitability.get("gross_profit", "0.00"),
            "net_profit": profitability.get("net_profit", "0.00"),
            "orders": orders,
            "average_order_value": sales.get("average_order_value", "0.00"),
            "customers": customers,
            "food_cost_pct": profitability.get("food_cost_pct", "0.00"),
            "labor_cost_pct": labor.get("labor_cost_pct", "0.00"),
            "inventory": inventory,
            "delivery": delivery,
            "data_freshness": "NEAR_REAL_TIME",
            "generated_at": timezone.now().isoformat(),
        }


def _get_order_summary(restaurant: Restaurant, start_dt: datetime, end_dt: datetime) -> Dict[str, Any]:
    qs = Order.objects.filter(restaurant=restaurant, created_at__range=(start_dt, end_dt))
    total = qs.count()
    completed = qs.filter(status=Order.OrderStatus.COMPLETED).count()
    cancelled = qs.filter(status=Order.OrderStatus.CANCELLED).count()
    return {
        "total": total,
        "completed": completed,
        "cancelled": cancelled,
        "active": total - completed - cancelled,
        "completion_rate": str(_safe_pct(completed, total)) if total else "0.00",
    }


# ──────────────────────────────────────────────────────────────────────
# SALES ANALYTICS
# ──────────────────────────────────────────────────────────────────────

class SalesAnalyticsService:
    """Sales analytics: revenue, orders, AOV, trends, channels, heatmap."""

    @classmethod
    def get_summary(cls, restaurant: Restaurant, start_dt: datetime, end_dt: datetime) -> Dict[str, Any]:
        bills = Bill.objects.filter(
            restaurant=restaurant, created_at__range=(start_dt, end_dt)
        ).exclude(status=Bill.BillStatus.VOID)

        agg = bills.aggregate(
            gross_sales=Coalesce(Sum("subtotal"), _ZERO, output_field=DecimalField()),
            discounts=Coalesce(Sum("discount_amount"), _ZERO, output_field=DecimalField()),
            tax=Coalesce(Sum("tax_amount"), _ZERO, output_field=DecimalField()),
            net_sales=Coalesce(Sum("grand_total"), _ZERO, output_field=DecimalField()),
            total_paid=Coalesce(Sum("total_paid"), _ZERO, output_field=DecimalField()),
            bill_count=Count("id"),
        )
        count = agg["bill_count"]
        net = agg["net_sales"]
        aov = _safe_div(net, count) if count else _ZERO

        # Refunds
        refund_total = Payment.objects.filter(
            restaurant=restaurant, created_at__range=(start_dt, end_dt),
            status=Payment.PaymentStatus.REFUNDED,
        ).aggregate(t=Coalesce(Sum("amount"), _ZERO, output_field=DecimalField()))["t"]

        return {
            "gross_sales": quantize_money(agg["gross_sales"]),
            "discounts": quantize_money(agg["discounts"]),
            "refunds": quantize_money(refund_total),
            "net_sales": quantize_money(net),
            "tax": quantize_money(agg["tax"]),
            "total_paid": quantize_money(agg["total_paid"]),
            "bill_count": count,
            "average_order_value": str(aov),
            "items_sold": cls._items_sold(restaurant, start_dt, end_dt),
        }

    @classmethod
    def _items_sold(cls, restaurant, start_dt, end_dt) -> int:
        return OrderItem.objects.filter(
            order__restaurant=restaurant,
            order__created_at__range=(start_dt, end_dt),
        ).exclude(order__status=Order.OrderStatus.CANCELLED).aggregate(
            total=Coalesce(Sum("quantity"), 0, output_field=IntegerField())
        )["total"]

    @classmethod
    def get_daily_trend(cls, restaurant: Restaurant, start_dt: datetime, end_dt: datetime) -> List[Dict]:
        bills = Bill.objects.filter(
            restaurant=restaurant, created_at__range=(start_dt, end_dt)
        ).exclude(status=Bill.BillStatus.VOID)

        return list(
            bills.annotate(date=TruncDate("created_at"))
            .values("date")
            .annotate(
                net_sales=Coalesce(Sum("grand_total"), _ZERO, output_field=DecimalField()),
                order_count=Count("id"),
            )
            .order_by("date")
            .values("date", "net_sales", "order_count")
        )

    @classmethod
    def get_hourly_heatmap(cls, restaurant: Restaurant, start_dt: datetime, end_dt: datetime) -> List[Dict]:
        """Day-of-week × hour-of-day sales heatmap."""
        bills = Bill.objects.filter(
            restaurant=restaurant, created_at__range=(start_dt, end_dt)
        ).exclude(status=Bill.BillStatus.VOID)

        return list(
            bills.annotate(
                weekday=ExtractWeekDay("created_at"),
                hour=ExtractHour("created_at"),
            )
            .values("weekday", "hour")
            .annotate(
                revenue=Coalesce(Sum("grand_total"), _ZERO, output_field=DecimalField()),
                count=Count("id"),
            )
            .order_by("weekday", "hour")
        )

    @classmethod
    def get_by_category(cls, restaurant: Restaurant, start_dt: datetime, end_dt: datetime) -> List[Dict]:
        """Sales breakdown by menu category."""
        items = OrderItem.objects.filter(
            order__restaurant=restaurant,
            order__created_at__range=(start_dt, end_dt),
        ).exclude(order__status=Order.OrderStatus.CANCELLED)

        return list(
            items.values("category_snapshot")
            .annotate(
                quantity=Coalesce(Sum("quantity"), 0, output_field=IntegerField()),
                revenue=Coalesce(Sum(F("quantity") * F("unit_price_snapshot"), output_field=DecimalField()), _ZERO),
            )
            .order_by("-revenue")
        )

    @classmethod
    def get_by_channel(cls, restaurant: Restaurant, start_dt: datetime, end_dt: datetime) -> List[Dict]:
        """Sales breakdown by order type/channel."""
        orders = Order.objects.filter(
            restaurant=restaurant, created_at__range=(start_dt, end_dt),
        ).exclude(status=Order.OrderStatus.CANCELLED)

        return list(
            orders.values("order_type")
            .annotate(
                order_count=Count("id"),
                revenue=Coalesce(Sum("total_amount"), _ZERO, output_field=DecimalField()),
            )
            .order_by("-revenue")
        )

    @classmethod
    def get_period_comparison(cls, restaurant: Restaurant, current_start: datetime, current_end: datetime) -> Dict:
        """Compare current period to equivalent previous period."""
        duration = current_end - current_start
        prev_end = current_start - timedelta(seconds=1)
        prev_start = prev_end - duration

        current = cls.get_summary(restaurant, current_start, current_end)
        previous = cls.get_summary(restaurant, prev_start, prev_end)

        def _compare(curr_val, prev_val):
            c = Decimal(str(curr_val))
            p = Decimal(str(prev_val))
            change = c - p
            pct = _safe_pct(change, p)
            return {"current": str(c), "previous": str(p), "change": str(change), "change_pct": str(pct)}

        return {
            "period": {"current_start": current_start.isoformat(), "current_end": current_end.isoformat(),
                       "previous_start": prev_start.isoformat(), "previous_end": prev_end.isoformat()},
            "net_sales": _compare(current["net_sales"], previous["net_sales"]),
            "bill_count": _compare(current["bill_count"], previous["bill_count"]),
            "average_order_value": _compare(current["average_order_value"], previous["average_order_value"]),
        }


# ──────────────────────────────────────────────────────────────────────
# PROFITABILITY ANALYTICS
# ──────────────────────────────────────────────────────────────────────

class ProfitabilityAnalyticsService:
    """Profitability analytics using authoritative finance P&L data."""

    @classmethod
    def get_summary(cls, restaurant: Restaurant, start_dt: datetime, end_dt: datetime) -> Dict[str, Any]:
        from apps.finance.services import FinancialReportingService
        try:
            pnl = FinancialReportingService.generate_profit_and_loss(
                restaurant, start_dt.date() if hasattr(start_dt, 'date') else start_dt,
                end_dt.date() if hasattr(end_dt, 'date') else end_dt,
            )
        except Exception:
            return cls._empty_profitability()

        net_revenue = Decimal(pnl["revenue"]["net_revenue"])
        total_cogs = Decimal(pnl["cogs"]["total_cogs"])
        gross_profit = Decimal(pnl["gross_profit"])
        net_profit = Decimal(pnl["net_profit"])
        food_cost = Decimal(pnl["cogs"]["food"])

        return {
            "net_revenue": str(net_revenue),
            "cogs": str(total_cogs),
            "gross_profit": str(gross_profit),
            "gross_margin_pct": str(_safe_pct(gross_profit, net_revenue)),
            "food_cost": str(food_cost),
            "food_cost_pct": str(_safe_pct(total_cogs, net_revenue)),
            "operating_expenses": pnl["operating_expenses"]["total_operating_expenses"],
            "net_profit": str(net_profit),
            "net_margin_pct": str(_safe_pct(net_profit, net_revenue)),
            "expense_breakdown": pnl["operating_expenses"],
        }

    @classmethod
    def _empty_profitability(cls) -> Dict:
        return {k: "0.00" for k in [
            "net_revenue", "cogs", "gross_profit", "gross_margin_pct",
            "food_cost", "food_cost_pct", "operating_expenses",
            "net_profit", "net_margin_pct",
        ]}


# ──────────────────────────────────────────────────────────────────────
# MENU ANALYTICS & ENGINEERING
# ──────────────────────────────────────────────────────────────────────

class MenuAnalyticsService:
    """Menu item analytics and engineering classification (Star/Plowhorse/Puzzle/Dog)."""

    @classmethod
    def get_item_analytics(cls, restaurant: Restaurant, start_dt: datetime, end_dt: datetime,
                           limit: int = 50) -> List[Dict]:
        items = OrderItem.objects.filter(
            order__restaurant=restaurant,
            order__created_at__range=(start_dt, end_dt),
        ).exclude(order__status=Order.OrderStatus.CANCELLED)

        item_data = list(
            items.values("menu_item_id", "item_name_snapshot")
            .annotate(
                units_sold=Coalesce(Sum("quantity"), 0, output_field=IntegerField()),
                revenue=Coalesce(Sum(F("quantity") * F("unit_price_snapshot"), output_field=DecimalField()), _ZERO),
            )
            .order_by("-revenue")[:limit]
        )

        # Calculate food cost per item using Recipe BOM if available
        for item in item_data:
            item["food_cost"] = str(cls._get_item_food_cost(item.get("menu_item_id"), item["units_sold"]))
            rev = Decimal(str(item["revenue"]))
            cost = Decimal(item["food_cost"])
            item["gross_margin"] = str(rev - cost)
            item["food_cost_pct"] = str(_safe_pct(cost, rev))
            item["revenue"] = quantize_money(item["revenue"])

        return item_data

    @classmethod
    def _get_item_food_cost(cls, menu_item_id, units_sold) -> Decimal:
        """Get food cost from Recipe BOM for a menu item."""
        if not menu_item_id:
            return _ZERO
        try:
            recipe = Recipe.objects.filter(
                menu_item_id=menu_item_id, status=Recipe.RecipeStatus.PUBLISHED
            ).first()
            if recipe:
                ingredients = RecipeItem.objects.filter(recipe=recipe)
                cost_per_unit = sum(
                    (Decimal(str(ri.quantity)) * Decimal(str(ri.unit_cost or 0)) for ri in ingredients),
                    _ZERO,
                )
                return (cost_per_unit * Decimal(str(units_sold))).quantize(Decimal("0.01"))
        except Exception:
            pass
        return _ZERO

    @classmethod
    def get_menu_engineering(cls, restaurant: Restaurant, start_dt: datetime, end_dt: datetime) -> List[Dict]:
        """Classify menu items into Star/Plowhorse/Puzzle/Dog based on popularity and profitability."""
        items = cls.get_item_analytics(restaurant, start_dt, end_dt)
        if not items:
            return []

        # Calculate medians for classification thresholds
        units_list = [i["units_sold"] for i in items]
        margins_list = [Decimal(i["gross_margin"]) for i in items]

        avg_units = sum(units_list) / len(units_list) if units_list else 0
        avg_margin = sum(margins_list) / len(margins_list) if margins_list else _ZERO

        for item in items:
            high_popularity = item["units_sold"] >= avg_units
            high_profit = Decimal(item["gross_margin"]) >= avg_margin

            if high_popularity and high_profit:
                item["classification"] = "STAR"
            elif high_popularity and not high_profit:
                item["classification"] = "PLOWHORSE"
            elif not high_popularity and high_profit:
                item["classification"] = "PUZZLE"
            else:
                item["classification"] = "DOG"

        return items


# ──────────────────────────────────────────────────────────────────────
# INVENTORY ANALYTICS
# ──────────────────────────────────────────────────────────────────────

class InventoryAnalyticsService:
    """Inventory analytics: value, turnover, stockouts, waste, slow movers."""

    @classmethod
    def get_summary(cls, restaurant: Restaurant) -> Dict[str, Any]:
        items = InventoryItem.objects.filter(restaurant=restaurant, is_active=True)
        total = items.count()
        low_stock = items.filter(current_quantity__gt=0, current_quantity__lte=F("minimum_stock_level")).count()
        out_of_stock = items.filter(current_quantity__lte=0).count()

        total_value = items.aggregate(
            val=Coalesce(Sum(F("current_quantity") * F("unit_cost"), output_field=DecimalField()), _ZERO)
        )["val"]

        return {
            "total_items": total,
            "in_stock": total - low_stock - out_of_stock,
            "low_stock": low_stock,
            "out_of_stock": out_of_stock,
            "stockout_rate": str(_safe_pct(out_of_stock, total)),
            "total_value": quantize_money(total_value),
        }

    @classmethod
    def get_waste_analytics(cls, restaurant: Restaurant, start_dt: datetime, end_dt: datetime) -> Dict[str, Any]:
        """Waste analytics from stock movements of type WASTE."""
        waste_movements = StockMovement.objects.filter(
            inventory_item__restaurant=restaurant,
            created_at__range=(start_dt, end_dt),
            movement_type=StockMovement.MovementType.WASTE,
        )

        waste_agg = waste_movements.aggregate(
            total_qty=Coalesce(Sum("quantity"), _ZERO, output_field=DecimalField()),
            total_value=Coalesce(Sum("total_cost"), _ZERO, output_field=DecimalField()),
            count=Count("id"),
        )

        by_reason = list(
            waste_movements.values("reference")
            .annotate(
                quantity=Coalesce(Sum("quantity"), _ZERO, output_field=DecimalField()),
                value=Coalesce(Sum("total_cost"), _ZERO, output_field=DecimalField()),
            )
            .order_by("-value")
        )

        return {
            "total_waste_quantity": str(waste_agg["total_qty"]),
            "total_waste_value": quantize_money(waste_agg["total_value"]),
            "waste_events": waste_agg["count"],
            "by_reason": by_reason,
        }

    @classmethod
    def get_turnover(cls, restaurant: Restaurant, start_dt: datetime, end_dt: datetime) -> Dict:
        """Inventory turnover = COGS / Average Inventory Value."""
        from apps.finance.services import FinancialReportingService
        try:
            pnl = FinancialReportingService.generate_profit_and_loss(
                restaurant,
                start_dt.date() if hasattr(start_dt, 'date') else start_dt,
                end_dt.date() if hasattr(end_dt, 'date') else end_dt,
            )
            cogs = Decimal(pnl["cogs"]["total_cogs"])
        except Exception:
            cogs = _ZERO

        current_value = InventoryItem.objects.filter(
            restaurant=restaurant, is_active=True
        ).aggregate(
            val=Coalesce(Sum(F("current_quantity") * F("unit_cost"), output_field=DecimalField()), _ZERO)
        )["val"]

        # Use current inventory as proxy for average (start+end/2 not tracked)
        turnover = _safe_div(cogs, current_value) if current_value > 0 else _ZERO

        return {
            "cogs": str(cogs),
            "current_inventory_value": quantize_money(current_value),
            "turnover_ratio": str(turnover),
            "data_quality": "HEALTHY" if current_value > 0 else "WARNING",
        }

    @classmethod
    def get_slow_movers(cls, restaurant: Restaurant, days: int = 30, limit: int = 20) -> List[Dict]:
        """Items with no outbound movement in the last N days."""
        cutoff = timezone.now() - timedelta(days=days)
        items = InventoryItem.objects.filter(
            restaurant=restaurant, is_active=True, current_quantity__gt=0
        ).exclude(
            stock_movements__movement_type__in=[
                StockMovement.MovementType.SALE,
                StockMovement.MovementType.WASTE,
            ],
            stock_movements__created_at__gte=cutoff,
        ).values("id", "name", "current_quantity", "unit_cost")[:limit]

        return list(items)


# ──────────────────────────────────────────────────────────────────────
# PROCUREMENT ANALYTICS
# ──────────────────────────────────────────────────────────────────────

class ProcurementAnalyticsService:
    """Procurement analytics: spend, supplier ranking, price variance."""

    @classmethod
    def get_summary(cls, restaurant: Restaurant, start_dt: datetime, end_dt: datetime) -> Dict[str, Any]:
        pos = PurchaseOrder.objects.filter(
            restaurant=restaurant, created_at__range=(start_dt, end_dt),
        ).exclude(status=PurchaseOrder.POStatus.CANCELLED)

        agg = pos.aggregate(
            total_spend=Coalesce(Sum("total_amount"), _ZERO, output_field=DecimalField()),
            po_count=Count("id"),
        )

        return {
            "total_spend": quantize_money(agg["total_spend"]),
            "purchase_order_count": agg["po_count"],
            "avg_po_value": quantize_money(_safe_div(agg["total_spend"], agg["po_count"])),
        }

    @classmethod
    def get_supplier_ranking(cls, restaurant: Restaurant, start_dt: datetime, end_dt: datetime,
                             limit: int = 20) -> List[Dict]:
        items = PurchaseOrderItem.objects.filter(
            purchase_order__restaurant=restaurant,
            purchase_order__created_at__range=(start_dt, end_dt),
        ).exclude(purchase_order__status=PurchaseOrder.POStatus.CANCELLED)

        suppliers = list(
            items.values("purchase_order__supplier__id", "purchase_order__supplier__name")
            .annotate(
                total_spend=Coalesce(Sum("line_total"), _ZERO, output_field=DecimalField()),
                order_count=Count("purchase_order", distinct=True),
                item_count=Count("id"),
            )
            .order_by("-total_spend")[:limit]
        )
        return suppliers

    @classmethod
    def get_price_variance(cls, restaurant: Restaurant, limit: int = 20) -> List[Dict]:
        """Identify significant price changes from supplier price history."""
        history = SupplierPriceHistory.objects.filter(
            supplier_item__supplier__restaurant=restaurant
        ).order_by("supplier_item", "-effective_date")

        # Group by supplier_item, compare latest vs previous
        variances = []
        seen = set()
        for entry in history:
            key = str(entry.supplier_item_id)
            if key in seen:
                continue
            prev = SupplierPriceHistory.objects.filter(
                supplier_item=entry.supplier_item,
                effective_date__lt=entry.effective_date,
            ).order_by("-effective_date").first()
            if prev:
                change = entry.unit_price - prev.unit_price
                pct = _safe_pct(change, prev.unit_price)
                if abs(pct) > Decimal("1.0"):  # Only show >1% changes
                    variances.append({
                        "item": str(entry.supplier_item),
                        "current_price": str(entry.unit_price),
                        "previous_price": str(prev.unit_price),
                        "change": str(change),
                        "change_pct": str(pct),
                    })
            seen.add(key)
            if len(variances) >= limit:
                break

        return variances


# ──────────────────────────────────────────────────────────────────────
# LABOR ANALYTICS
# ──────────────────────────────────────────────────────────────────────

class LaborAnalyticsService:
    """Labor analytics: cost, overtime, productivity, staffing gaps."""

    @classmethod
    def get_summary(cls, restaurant: Restaurant, start_dt: datetime, end_dt: datetime) -> Dict[str, Any]:
        from apps.hr.services import WorkforceAnalyticsService
        try:
            labor = WorkforceAnalyticsService.get_labor_cost_report(
                restaurant,
                start_date=start_dt.date() if hasattr(start_dt, 'date') else start_dt,
                end_date=end_dt.date() if hasattr(end_dt, 'date') else end_dt,
            )
            return {
                "gross_payroll": labor["gross_payroll"],
                "net_payroll": labor["net_payroll"],
                "overtime_cost": labor["overtime_cost"],
                "total_labor_hours": labor["total_labor_hours"],
                "labor_cost_pct": labor["labor_cost_percentage"].replace("%", ""),
                "sales_per_labor_hour": labor["sales_per_labor_hour"],
            }
        except Exception:
            return {k: "0.00" for k in [
                "gross_payroll", "net_payroll", "overtime_cost",
                "total_labor_hours", "labor_cost_pct", "sales_per_labor_hour",
            ]}

    @classmethod
    def get_staffing_analysis(cls, restaurant: Restaurant) -> Dict[str, Any]:
        from apps.hr.services import WorkforceAnalyticsService
        try:
            return WorkforceAnalyticsService.get_workforce_dashboard_summary(restaurant)
        except Exception:
            return {}


# ──────────────────────────────────────────────────────────────────────
# CUSTOMER ANALYTICS
# ──────────────────────────────────────────────────────────────────────

class CustomerAnalyticsService:
    """Customer analytics: new/returning, retention, cohorts, CLV."""

    @classmethod
    def get_summary(cls, restaurant: Restaurant, start_dt: datetime, end_dt: datetime) -> Dict[str, Any]:
        from apps.customers.models import Customer, CustomerVisit

        customers = Customer.objects.filter(restaurant=restaurant)
        total = customers.count()
        new_in_period = customers.filter(created_at__range=(start_dt, end_dt)).count()

        # Visits in period
        visits = CustomerVisit.objects.filter(
            customer__restaurant=restaurant,
            visited_at__range=(start_dt, end_dt),
        )
        unique_visitors = visits.values("customer").distinct().count()

        # Repeat: customers with >1 visit total
        repeat_customers = customers.filter(total_visits__gt=1).count()

        # AOV from bills linked to customers
        customer_bills = Bill.objects.filter(
            restaurant=restaurant,
            created_at__range=(start_dt, end_dt),
            customer__isnull=False,
        ).exclude(status=Bill.BillStatus.VOID)
        aov_data = customer_bills.aggregate(
            avg_val=Coalesce(Avg("grand_total"), _ZERO, output_field=DecimalField())
        )

        return {
            "total_customers": total,
            "new_customers": new_in_period,
            "unique_visitors": unique_visitors,
            "repeat_customers": repeat_customers,
            "repeat_rate": str(_safe_pct(repeat_customers, total)),
            "average_order_value": quantize_money(aov_data["avg_val"]),
        }

    @classmethod
    def get_cohort_analysis(cls, restaurant: Restaurant, cohort_by: str = "month") -> List[Dict]:
        """Customer cohorts by first order period."""
        from apps.customers.models import Customer

        trunc_fn = TruncMonth if cohort_by == "month" else TruncWeek

        cohorts = list(
            Customer.objects.filter(restaurant=restaurant, first_visited_at__isnull=False)
            .annotate(cohort=trunc_fn("first_visited_at"))
            .values("cohort")
            .annotate(
                customer_count=Count("id"),
                total_revenue=Coalesce(Sum("total_spent"), _ZERO, output_field=DecimalField()),
                avg_spend=Coalesce(Avg("total_spent"), _ZERO, output_field=DecimalField()),
            )
            .order_by("cohort")
        )

        for c in cohorts:
            if c["cohort"]:
                c["cohort"] = c["cohort"].isoformat()
            c["total_revenue"] = quantize_money(c["total_revenue"])
            c["avg_spend"] = quantize_money(c["avg_spend"])

        return cohorts

    @classmethod
    def get_retention(cls, restaurant: Restaurant, start_dt: datetime, end_dt: datetime) -> Dict:
        from apps.customers.models import Customer
        customers = Customer.objects.filter(restaurant=restaurant)
        total = customers.count()
        first_time = customers.filter(total_visits=1).count()
        returning = customers.filter(total_visits__gt=1).count()
        inactive = customers.filter(last_visited_at__lt=start_dt - timedelta(days=90)).count()

        return {
            "total": total,
            "first_time": first_time,
            "returning": returning,
            "inactive_90d": inactive,
            "retention_rate": str(_safe_pct(returning, total)),
        }


# ──────────────────────────────────────────────────────────────────────
# MARKETING ANALYTICS
# ──────────────────────────────────────────────────────────────────────

class MarketingAnalyticsService:
    """Marketing analytics: campaign performance, ROI, discount cost."""

    @classmethod
    def get_summary(cls, restaurant: Restaurant, start_dt: datetime, end_dt: datetime) -> Dict[str, Any]:
        from apps.marketing.models import Campaign, Promotion

        campaigns = Campaign.objects.filter(restaurant=restaurant, created_at__range=(start_dt, end_dt))
        total_campaigns = campaigns.count()
        active_campaigns = campaigns.filter(status="ACTIVE").count()

        # Discount cost from bills
        discount_cost = Bill.objects.filter(
            restaurant=restaurant,
            created_at__range=(start_dt, end_dt),
        ).exclude(status=Bill.BillStatus.VOID).aggregate(
            total=Coalesce(Sum("discount_amount"), _ZERO, output_field=DecimalField())
        )["total"]

        promotions = Promotion.objects.filter(restaurant=restaurant)
        active_promos = promotions.filter(is_active=True).count()

        return {
            "total_campaigns": total_campaigns,
            "active_campaigns": active_campaigns,
            "active_promotions": active_promos,
            "total_discount_cost": quantize_money(discount_cost),
        }


# ──────────────────────────────────────────────────────────────────────
# LOYALTY ANALYTICS
# ──────────────────────────────────────────────────────────────────────

class LoyaltyAnalyticsService:
    """Loyalty analytics: members, points, redemptions."""

    @classmethod
    def get_summary(cls, restaurant: Restaurant, start_dt: datetime, end_dt: datetime) -> Dict[str, Any]:
        from apps.loyalty.models import LoyaltyAccount, PointsLedgerEntry

        accounts = LoyaltyAccount.objects.filter(restaurant=restaurant)
        total_members = accounts.count()
        new_members = accounts.filter(created_at__range=(start_dt, end_dt)).count()

        ledger = PointsLedgerEntry.objects.filter(
            account__restaurant=restaurant,
            created_at__range=(start_dt, end_dt),
        )
        earned = ledger.filter(entry_type="EARN").aggregate(
            total=Coalesce(Sum("points"), 0, output_field=IntegerField())
        )["total"]
        redeemed = ledger.filter(entry_type="REDEEM").aggregate(
            total=Coalesce(Sum("points"), 0, output_field=IntegerField())
        )["total"]

        return {
            "total_members": total_members,
            "new_members": new_members,
            "points_earned": earned,
            "points_redeemed": abs(redeemed) if redeemed else 0,
        }


# ──────────────────────────────────────────────────────────────────────
# DELIVERY ANALYTICS
# ──────────────────────────────────────────────────────────────────────

class DeliveryAnalyticsService:
    """Delivery analytics: volume, time, on-time rate, zone performance."""

    @classmethod
    def get_summary(cls, restaurant: Restaurant, start_dt: datetime, end_dt: datetime) -> Dict[str, Any]:
        from apps.delivery.models import Delivery

        deliveries = Delivery.objects.filter(
            restaurant=restaurant, created_at__range=(start_dt, end_dt),
        )
        total = deliveries.count()
        completed = deliveries.filter(status=Delivery.DeliveryStatus.DELIVERED).count()
        failed = deliveries.filter(status=Delivery.DeliveryStatus.FAILED).count()
        cancelled = deliveries.filter(status=Delivery.DeliveryStatus.CANCELLED).count()

        # Average delivery time (delivered_at - dispatched_at)
        avg_minutes = _ZERO
        delivered = deliveries.filter(
            status=Delivery.DeliveryStatus.DELIVERED,
            delivered_at__isnull=False,
            dispatched_at__isnull=False,
        )
        if delivered.exists():
            total_minutes = sum(
                ((d.delivered_at - d.dispatched_at).total_seconds() / 60 for d in delivered),
                0
            )
            avg_minutes = Decimal(str(total_minutes / delivered.count())).quantize(Decimal("0.1"))

        return {
            "total_deliveries": total,
            "completed": completed,
            "failed": failed,
            "cancelled": cancelled,
            "on_time_pct": str(_safe_pct(completed, total)),
            "avg_delivery_minutes": str(avg_minutes),
        }


# ──────────────────────────────────────────────────────────────────────
# SUPPORT ANALYTICS
# ──────────────────────────────────────────────────────────────────────

class SupportAnalyticsService:
    """Support analytics placeholder — uses domain models if available."""

    @classmethod
    def get_summary(cls, restaurant: Restaurant, start_dt: datetime, end_dt: datetime) -> Dict[str, Any]:
        # Attempt to pull from customer feedback/complaints if they exist
        try:
            from apps.customers.models import CustomerVisit
            visits_with_feedback = CustomerVisit.objects.filter(
                customer__restaurant=restaurant,
                visited_at__range=(start_dt, end_dt),
                feedback_rating__isnull=False,
            )
            avg_rating = visits_with_feedback.aggregate(
                avg=Coalesce(Avg("feedback_rating"), _ZERO, output_field=DecimalField())
            )["avg"]
            return {
                "feedback_count": visits_with_feedback.count(),
                "avg_rating": str(Decimal(str(avg_rating)).quantize(Decimal("0.1"))),
                "data_quality": "HEALTHY" if visits_with_feedback.count() > 0 else "INSUFFICIENT_DATA",
            }
        except Exception:
            return {"feedback_count": 0, "avg_rating": "0.0", "data_quality": "INSUFFICIENT_DATA"}


# ──────────────────────────────────────────────────────────────────────
# FINANCIAL ANALYTICS
# ──────────────────────────────────────────────────────────────────────

class FinancialAnalyticsService:
    """Financial analytics delegating to authoritative finance services."""

    @classmethod
    def get_summary(cls, restaurant: Restaurant, start_dt: datetime, end_dt: datetime) -> Dict[str, Any]:
        from apps.finance.services import FinancialReportingService, CashManagementService
        try:
            pnl = FinancialReportingService.generate_profit_and_loss(
                restaurant,
                start_dt.date() if hasattr(start_dt, 'date') else start_dt,
                end_dt.date() if hasattr(end_dt, 'date') else end_dt,
            )
            balance = FinancialReportingService.generate_balance_sheet(restaurant)
            cash_flow = FinancialReportingService.generate_cash_flow(
                restaurant,
                start_dt.date() if hasattr(start_dt, 'date') else start_dt,
                end_dt.date() if hasattr(end_dt, 'date') else end_dt,
            )
        except Exception:
            return {"data_quality": "ERROR"}

        return {
            "revenue": pnl["revenue"],
            "gross_profit": pnl["gross_profit"],
            "net_profit": pnl["net_profit"],
            "assets": balance.get("assets", {}),
            "liabilities": balance.get("liabilities", {}),
            "equity": balance.get("equity", {}),
            "cash_flow": cash_flow.get("operating_activities", {}),
            "data_quality": "HEALTHY",
        }


# ──────────────────────────────────────────────────────────────────────
# MULTI-LOCATION COMPARISON
# ──────────────────────────────────────────────────────────────────────

class MultiLocationService:
    """Compare multiple restaurants on key KPIs."""

    @classmethod
    def compare(cls, restaurants: List[Restaurant], start_dt: datetime, end_dt: datetime) -> List[Dict]:
        results = []
        for r in restaurants:
            sales = SalesAnalyticsService.get_summary(r, start_dt, end_dt)
            inv = InventoryAnalyticsService.get_summary(r)
            results.append({
                "restaurant_id": str(r.id),
                "restaurant_name": r.name,
                "net_sales": sales.get("net_sales", "0.00"),
                "orders": sales.get("bill_count", 0),
                "aov": sales.get("average_order_value", "0.00"),
                "inventory_value": inv.get("total_value", "0.00"),
                "stockout_rate": inv.get("stockout_rate", "0.00"),
            })
        return sorted(results, key=lambda x: Decimal(x["net_sales"]), reverse=True)


# ──────────────────────────────────────────────────────────────────────
# DATA QUALITY
# ──────────────────────────────────────────────────────────────────────

class DataQualityService:
    """Data freshness and quality indicators."""

    @classmethod
    def get_quality_report(cls, restaurant: Restaurant) -> Dict[str, Any]:
        now = timezone.now()
        checks = {}

        # Check orders freshness
        latest_order = Order.objects.filter(restaurant=restaurant).order_by("-created_at").first()
        if latest_order:
            age = (now - latest_order.created_at).total_seconds()
            checks["orders"] = {"status": "HEALTHY" if age < 86400 else "STALE",
                                "last_update": latest_order.created_at.isoformat()}
        else:
            checks["orders"] = {"status": "INSUFFICIENT_DATA", "last_update": None}

        # Check inventory freshness
        latest_movement = StockMovement.objects.filter(
            inventory_item__restaurant=restaurant
        ).order_by("-created_at").first()
        if latest_movement:
            age = (now - latest_movement.created_at).total_seconds()
            checks["inventory"] = {"status": "HEALTHY" if age < 172800 else "STALE",
                                   "last_update": latest_movement.created_at.isoformat()}
        else:
            checks["inventory"] = {"status": "INSUFFICIENT_DATA", "last_update": None}

        # Check finance freshness
        from apps.finance.models import JournalEntry
        latest_je = JournalEntry.objects.filter(
            restaurant=restaurant, status=JournalEntry.EntryStatus.POSTED
        ).order_by("-entry_date").first()
        if latest_je:
            checks["finance"] = {"status": "HEALTHY", "last_update": latest_je.entry_date.isoformat()}
        else:
            checks["finance"] = {"status": "INSUFFICIENT_DATA", "last_update": None}

        overall = "HEALTHY"
        if any(c["status"] in ("ERROR", "STALE") for c in checks.values()):
            overall = "WARNING"
        if all(c["status"] == "INSUFFICIENT_DATA" for c in checks.values()):
            overall = "INSUFFICIENT_DATA"

        return {"overall_status": overall, "domains": checks, "checked_at": now.isoformat()}
