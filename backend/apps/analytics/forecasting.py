"""
Statistical forecasting engine for sales, demand, inventory, and labor.
Uses deterministic methods: moving average, weighted moving average, trend, seasonal baseline.
No ML infrastructure required.
"""
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, List, Optional
from django.db.models import Sum, Count, DecimalField, IntegerField
from django.db.models.functions import TruncDate, TruncWeek, Coalesce
from django.utils import timezone

from apps.restaurants.models import Restaurant
from apps.billing.models import Bill
from apps.orders.models import Order, OrderItem
from apps.inventory.models import InventoryItem, Recipe, RecipeItem

_ZERO = Decimal("0.00")
MIN_DATA_POINTS = 7  # Minimum data points for a forecast


class ForecastConfidence:
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INSUFFICIENT = "INSUFFICIENT_DATA"


def _confidence_from_points(n: int) -> str:
    if n >= 28:
        return ForecastConfidence.HIGH
    elif n >= 14:
        return ForecastConfidence.MEDIUM
    elif n >= MIN_DATA_POINTS:
        return ForecastConfidence.LOW
    return ForecastConfidence.INSUFFICIENT


class SalesForecastService:
    """Forecast daily/weekly/monthly sales based on historical data."""

    @classmethod
    def forecast_daily(cls, restaurant: Restaurant, horizon_days: int = 7,
                       lookback_weeks: int = 8) -> Dict[str, Any]:
        """Forecast next N days using weighted moving average + weekday seasonality."""
        end_dt = timezone.now()
        start_dt = end_dt - timedelta(weeks=lookback_weeks)

        daily_data = list(
            Bill.objects.filter(
                restaurant=restaurant,
                created_at__range=(start_dt, end_dt),
            ).exclude(status=Bill.BillStatus.VOID)
            .annotate(date=TruncDate("created_at"))
            .values("date")
            .annotate(
                revenue=Coalesce(Sum("grand_total"), _ZERO, output_field=DecimalField()),
                orders=Count("id"),
            )
            .order_by("date")
        )

        n = len(daily_data)
        confidence = _confidence_from_points(n)

        if confidence == ForecastConfidence.INSUFFICIENT:
            return {
                "status": "INSUFFICIENT_DATA",
                "confidence": confidence,
                "message": f"Need at least {MIN_DATA_POINTS} days of data, found {n}.",
                "forecast": [],
                "explanation": {
                    "method": "N/A",
                    "lookback_weeks": lookback_weeks,
                    "data_points": n,
                },
            }

        # Build weekday averages for seasonality
        weekday_totals: Dict[int, List[Decimal]] = {i: [] for i in range(7)}
        for d in daily_data:
            if d["date"]:
                wd = d["date"].weekday()
                weekday_totals[wd].append(d["revenue"])

        weekday_avg = {}
        for wd, vals in weekday_totals.items():
            weekday_avg[wd] = sum(vals, _ZERO) / len(vals) if vals else _ZERO

        # Overall daily average
        overall_avg = sum((d["revenue"] for d in daily_data), _ZERO) / n if n else _ZERO

        # Trend: compare recent half vs older half
        mid = n // 2
        old_avg = sum((d["revenue"] for d in daily_data[:mid]), _ZERO) / mid if mid else overall_avg
        new_avg = sum((d["revenue"] for d in daily_data[mid:]), _ZERO) / (n - mid) if (n - mid) else overall_avg
        trend_factor = (new_avg / old_avg) if old_avg > 0 else Decimal("1.0")
        trend_factor = min(max(trend_factor, Decimal("0.7")), Decimal("1.3"))  # Cap ±30%

        # Generate forecast
        forecast_points = []
        today = timezone.now().date()
        for i in range(1, horizon_days + 1):
            forecast_date = today + timedelta(days=i)
            wd = forecast_date.weekday()
            seasonal = weekday_avg.get(wd, overall_avg)
            # Weighted: 60% seasonal, 40% overall trend-adjusted
            predicted = (seasonal * Decimal("0.6") + overall_avg * trend_factor * Decimal("0.4"))
            forecast_points.append({
                "date": forecast_date.isoformat(),
                "predicted_revenue": str(predicted.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
                "weekday": forecast_date.strftime("%A"),
            })

        return {
            "status": "OK",
            "confidence": confidence,
            "forecast": forecast_points,
            "explanation": {
                "method": "Weighted Moving Average + Weekday Seasonality",
                "lookback_weeks": lookback_weeks,
                "data_points": n,
                "overall_daily_avg": str(overall_avg.quantize(Decimal("0.01"))),
                "trend_factor": str(trend_factor.quantize(Decimal("0.001"))),
                "inputs": [
                    f"Previous {lookback_weeks} weeks of daily sales",
                    "Same weekday pattern analysis",
                    "Recent trend direction",
                ],
                "limitations": [
                    "Does not account for holidays or special events",
                    "Based on historical averages, not predictive ML",
                ],
            },
        }


class DemandForecastService:
    """Forecast menu item demand using historical order data."""

    @classmethod
    def forecast_item_demand(cls, restaurant: Restaurant, horizon_days: int = 7,
                             lookback_weeks: int = 8) -> Dict[str, Any]:
        end_dt = timezone.now()
        start_dt = end_dt - timedelta(weeks=lookback_weeks)
        total_days = (end_dt - start_dt).days or 1

        items = list(
            OrderItem.objects.filter(
                order__restaurant=restaurant,
                order__created_at__range=(start_dt, end_dt),
            ).exclude(order__status=Order.OrderStatus.CANCELLED)
            .values("menu_item_id", "item_name_snapshot")
            .annotate(
                total_qty=Coalesce(Sum("quantity"), 0, output_field=IntegerField()),
            )
            .order_by("-total_qty")[:30]
        )

        if not items:
            return {"status": "INSUFFICIENT_DATA", "forecast": [], "confidence": ForecastConfidence.INSUFFICIENT}

        forecast = []
        for item in items:
            daily_avg = Decimal(str(item["total_qty"])) / Decimal(str(total_days))
            predicted = (daily_avg * Decimal(str(horizon_days))).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
            forecast.append({
                "menu_item_id": str(item["menu_item_id"]) if item["menu_item_id"] else None,
                "item_name": item["item_name_snapshot"],
                "historical_total": item["total_qty"],
                "daily_average": str(daily_avg.quantize(Decimal("0.1"))),
                "predicted_demand": int(predicted),
                "horizon_days": horizon_days,
            })

        return {
            "status": "OK",
            "confidence": _confidence_from_points(total_days),
            "forecast": forecast,
            "explanation": {
                "method": "Historical Daily Average Projection",
                "lookback_weeks": lookback_weeks,
                "total_data_days": total_days,
            },
        }


class InventoryDemandForecastService:
    """Convert menu demand forecast into ingredient demand using Recipe BOMs."""

    @classmethod
    def forecast_ingredient_demand(cls, restaurant: Restaurant, horizon_days: int = 7,
                                   lookback_weeks: int = 8) -> Dict[str, Any]:
        demand = DemandForecastService.forecast_item_demand(restaurant, horizon_days, lookback_weeks)

        if demand["status"] != "OK":
            return {"status": demand["status"], "forecast": [], "confidence": demand.get("confidence")}

        ingredient_totals: Dict[str, Dict] = {}

        for item in demand["forecast"]:
            if not item["menu_item_id"]:
                continue
            try:
                recipe = Recipe.objects.filter(
                    menu_item_id=item["menu_item_id"],
                    status=Recipe.RecipeStatus.PUBLISHED,
                ).first()
                if not recipe:
                    continue
                for ri in RecipeItem.objects.filter(recipe=recipe):
                    inv_id = str(ri.inventory_item_id)
                    qty_needed = Decimal(str(ri.quantity)) * Decimal(str(item["predicted_demand"]))
                    if inv_id in ingredient_totals:
                        ingredient_totals[inv_id]["required_quantity"] += qty_needed
                    else:
                        ingredient_totals[inv_id] = {
                            "inventory_item_id": inv_id,
                            "ingredient_name": ri.inventory_item.name if ri.inventory_item else "Unknown",
                            "unit": ri.unit,
                            "required_quantity": qty_needed,
                        }
            except Exception:
                continue

        # Compare with current stock
        forecast = []
        for inv_id, data in ingredient_totals.items():
            try:
                inv_item = InventoryItem.objects.get(id=inv_id)
                current = inv_item.current_quantity
                required = data["required_quantity"]
                shortfall = max(_ZERO, required - Decimal(str(current)))
                data["current_stock"] = str(current)
                data["required_quantity"] = str(required.quantize(Decimal("0.01")))
                data["shortfall"] = str(shortfall.quantize(Decimal("0.01")))
                data["needs_reorder"] = shortfall > 0
            except Exception:
                data["current_stock"] = "0.00"
                data["shortfall"] = data["required_quantity"]
                data["needs_reorder"] = True
            forecast.append(data)

        return {
            "status": "OK",
            "confidence": demand["confidence"],
            "forecast": sorted(forecast, key=lambda x: Decimal(x.get("shortfall", "0")), reverse=True),
            "explanation": {
                "method": "Menu Demand × Recipe BOM Ingredient Mapping",
                "horizon_days": horizon_days,
            },
        }


class LaborForecastService:
    """Forecast labor requirements based on historical demand patterns."""

    @classmethod
    def forecast(cls, restaurant: Restaurant, horizon_days: int = 7,
                 lookback_weeks: int = 8) -> Dict[str, Any]:
        from apps.hr.models import AttendanceSession

        end_dt = timezone.now()
        start_dt = end_dt - timedelta(weeks=lookback_weeks)
        total_days = (end_dt - start_dt).days or 1

        # Historical labor hours
        sessions = AttendanceSession.objects.filter(
            restaurant=restaurant,
            date__gte=start_dt.date() if hasattr(start_dt, 'date') else start_dt,
            date__lte=end_dt.date() if hasattr(end_dt, 'date') else end_dt,
            clock_out__isnull=False,
        )
        total_hours = sum((s.worked_hours for s in sessions), _ZERO)
        daily_avg_hours = total_hours / Decimal(str(total_days)) if total_days else _ZERO

        # Historical order volume
        total_orders = Order.objects.filter(
            restaurant=restaurant, created_at__range=(start_dt, end_dt),
        ).exclude(status=Order.OrderStatus.CANCELLED).count()
        daily_avg_orders = Decimal(str(total_orders)) / Decimal(str(total_days)) if total_days else _ZERO

        # Hours per order ratio
        hours_per_order = daily_avg_hours / daily_avg_orders if daily_avg_orders > 0 else _ZERO

        if total_days < MIN_DATA_POINTS:
            return {"status": "INSUFFICIENT_DATA", "confidence": ForecastConfidence.INSUFFICIENT, "forecast": []}

        # Forecast using sales forecast
        sales = SalesForecastService.forecast_daily(restaurant, horizon_days, lookback_weeks)
        forecast_points = []

        for point in sales.get("forecast", []):
            predicted_hours = (daily_avg_hours * Decimal("1.0")).quantize(Decimal("0.1"))
            forecast_points.append({
                "date": point["date"],
                "predicted_labor_hours": str(predicted_hours),
                "predicted_orders": str(daily_avg_orders.quantize(Decimal("0.1"))),
            })

        return {
            "status": "OK",
            "confidence": _confidence_from_points(total_days),
            "forecast": forecast_points,
            "explanation": {
                "method": "Historical Labor-to-Order Ratio Projection",
                "lookback_weeks": lookback_weeks,
                "avg_daily_hours": str(daily_avg_hours.quantize(Decimal("0.1"))),
                "avg_daily_orders": str(daily_avg_orders.quantize(Decimal("0.1"))),
                "hours_per_order": str(hours_per_order.quantize(Decimal("0.01"))),
            },
        }


class ScenarioAnalysisService:
    """What-if scenario simulations. Calculations only — never mutates real data."""

    @classmethod
    def run_scenario(cls, restaurant: Restaurant, start_dt, end_dt,
                     revenue_change_pct: Decimal = _ZERO,
                     food_cost_change_pct: Decimal = _ZERO,
                     labor_cost_change_pct: Decimal = _ZERO,
                     supplier_price_change_pct: Decimal = _ZERO) -> Dict[str, Any]:
        """Run what-if scenario and show estimated impact."""
        from apps.analytics.services import ProfitabilityAnalyticsService, LaborAnalyticsService

        base_profit = ProfitabilityAnalyticsService.get_summary(restaurant, start_dt, end_dt)
        base_labor = LaborAnalyticsService.get_summary(restaurant, start_dt, end_dt)

        base_rev = Decimal(base_profit.get("net_revenue", "0"))
        base_cogs = Decimal(base_profit.get("cogs", "0"))
        base_opex = Decimal(base_profit.get("operating_expenses", "0"))
        base_payroll = Decimal(base_labor.get("gross_payroll", "0"))

        # Apply scenario adjustments
        adj_rev = base_rev * (Decimal("1") + revenue_change_pct / Decimal("100"))
        adj_cogs = base_cogs * (Decimal("1") + food_cost_change_pct / Decimal("100"))
        adj_cogs = adj_cogs * (Decimal("1") + supplier_price_change_pct / Decimal("100"))
        adj_payroll = base_payroll * (Decimal("1") + labor_cost_change_pct / Decimal("100"))

        # Recalculate
        adj_gross = adj_rev - adj_cogs
        adj_opex_other = base_opex - base_payroll  # Non-labor opex stays same
        adj_total_opex = adj_payroll + adj_opex_other
        adj_net = adj_gross - adj_total_opex

        return {
            "scenario_label": "SIMULATION — NOT ACTUAL DATA",
            "adjustments": {
                "revenue_change_pct": str(revenue_change_pct),
                "food_cost_change_pct": str(food_cost_change_pct),
                "labor_cost_change_pct": str(labor_cost_change_pct),
                "supplier_price_change_pct": str(supplier_price_change_pct),
            },
            "baseline": {
                "revenue": str(base_rev),
                "cogs": str(base_cogs),
                "gross_profit": str(base_rev - base_cogs),
                "payroll": str(base_payroll),
                "net_profit": str(base_rev - base_cogs - base_opex),
            },
            "scenario": {
                "revenue": str(adj_rev.quantize(Decimal("0.01"))),
                "cogs": str(adj_cogs.quantize(Decimal("0.01"))),
                "gross_profit": str(adj_gross.quantize(Decimal("0.01"))),
                "payroll": str(adj_payroll.quantize(Decimal("0.01"))),
                "net_profit": str(adj_net.quantize(Decimal("0.01"))),
            },
            "impact": {
                "revenue_delta": str((adj_rev - base_rev).quantize(Decimal("0.01"))),
                "gross_profit_delta": str((adj_gross - (base_rev - base_cogs)).quantize(Decimal("0.01"))),
                "net_profit_delta": str((adj_net - (base_rev - base_cogs - base_opex)).quantize(Decimal("0.01"))),
            },
        }
