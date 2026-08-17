"""
KPI computation engine: evaluates KPI formulas, compares actual vs target,
calculates variance/status, and triggers notification alerts.
"""
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, Optional, List
from django.utils import timezone

from apps.analytics.models import KPIDefinition, KPITarget, KPIDirection, KPIStatus
from apps.analytics.services import (
    SalesAnalyticsService, ProfitabilityAnalyticsService, InventoryAnalyticsService,
    LaborAnalyticsService, CustomerAnalyticsService, DeliveryAnalyticsService,
)
from apps.reports.services import DateFilterHelper

_ZERO = Decimal("0.00")


def _safe_pct(n, d) -> Decimal:
    try:
        if not d or Decimal(str(d)) == _ZERO:
            return _ZERO
        return ((Decimal(str(n)) / Decimal(str(d))) * Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except Exception:
        return _ZERO


class KPIEngine:
    """Evaluates KPI definitions and computes actual values from domain data."""

    # Registry mapping KPI codes to data extraction callables
    _EXTRACTORS = {}

    @classmethod
    def register_extractor(cls, code: str, fn):
        cls._EXTRACTORS[code] = fn

    @classmethod
    def compute_actual(cls, kpi: KPIDefinition, restaurant, start_dt, end_dt) -> Optional[Decimal]:
        """Compute the actual value for a KPI from domain data."""
        code = kpi.code

        # Check registered extractors first
        if code in cls._EXTRACTORS:
            return cls._EXTRACTORS[code](restaurant, start_dt, end_dt)

        # Built-in KPI calculations
        try:
            if code == "NET_REVENUE":
                data = SalesAnalyticsService.get_summary(restaurant, start_dt, end_dt)
                return Decimal(data["net_sales"])

            elif code == "GROSS_SALES":
                data = SalesAnalyticsService.get_summary(restaurant, start_dt, end_dt)
                return Decimal(data["gross_sales"])

            elif code == "AOV":
                data = SalesAnalyticsService.get_summary(restaurant, start_dt, end_dt)
                return Decimal(data["average_order_value"])

            elif code == "ORDER_COUNT":
                data = SalesAnalyticsService.get_summary(restaurant, start_dt, end_dt)
                return Decimal(str(data["bill_count"]))

            elif code == "FOOD_COST_PCT":
                data = ProfitabilityAnalyticsService.get_summary(restaurant, start_dt, end_dt)
                return Decimal(data["food_cost_pct"])

            elif code == "GROSS_MARGIN_PCT":
                data = ProfitabilityAnalyticsService.get_summary(restaurant, start_dt, end_dt)
                return Decimal(data["gross_margin_pct"])

            elif code == "NET_MARGIN_PCT":
                data = ProfitabilityAnalyticsService.get_summary(restaurant, start_dt, end_dt)
                return Decimal(data["net_margin_pct"])

            elif code == "LABOR_COST_PCT":
                data = LaborAnalyticsService.get_summary(restaurant, start_dt, end_dt)
                return Decimal(data["labor_cost_pct"])

            elif code == "SALES_PER_LABOR_HOUR":
                data = LaborAnalyticsService.get_summary(restaurant, start_dt, end_dt)
                return Decimal(data["sales_per_labor_hour"])

            elif code == "STOCKOUT_RATE":
                data = InventoryAnalyticsService.get_summary(restaurant)
                return Decimal(data["stockout_rate"])

            elif code == "INVENTORY_VALUE":
                data = InventoryAnalyticsService.get_summary(restaurant)
                return Decimal(data["total_value"])

            elif code == "CUSTOMER_COUNT":
                data = CustomerAnalyticsService.get_summary(restaurant, start_dt, end_dt)
                return Decimal(str(data["total_customers"]))

            elif code == "REPEAT_RATE":
                data = CustomerAnalyticsService.get_summary(restaurant, start_dt, end_dt)
                return Decimal(data["repeat_rate"])

            elif code == "DELIVERY_ON_TIME_PCT":
                data = DeliveryAnalyticsService.get_summary(restaurant, start_dt, end_dt)
                return Decimal(data["on_time_pct"])

        except Exception:
            return None

        return None

    @classmethod
    def evaluate_status(cls, actual: Decimal, target: Decimal, direction: str,
                        warning_threshold: Optional[Decimal] = None) -> str:
        """Determine KPI status based on actual vs target and direction."""
        if actual is None or target is None:
            return KPIStatus.AT_RISK

        variance_pct = _safe_pct(actual - target, target)
        threshold = warning_threshold or Decimal("10.00")

        if direction == KPIDirection.HIGHER_IS_BETTER:
            if actual >= target:
                return KPIStatus.ABOVE_TARGET
            elif abs(variance_pct) <= threshold:
                return KPIStatus.ON_TARGET
            else:
                return KPIStatus.BELOW_TARGET

        elif direction == KPIDirection.LOWER_IS_BETTER:
            if actual <= target:
                return KPIStatus.ABOVE_TARGET  # Good — below target on cost metrics
            elif abs(variance_pct) <= threshold:
                return KPIStatus.ON_TARGET
            else:
                return KPIStatus.BELOW_TARGET

        elif direction == KPIDirection.EXACT_TARGET:
            if abs(variance_pct) <= Decimal("2.00"):
                return KPIStatus.ON_TARGET
            elif abs(variance_pct) <= threshold:
                return KPIStatus.AT_RISK
            else:
                return KPIStatus.BELOW_TARGET

        elif direction == KPIDirection.TARGET_RANGE:
            return KPIStatus.ON_TARGET  # Range checked by caller with min/max

        return KPIStatus.AT_RISK

    @classmethod
    def get_kpi_performance(cls, kpi: KPIDefinition, restaurant, start_dt, end_dt) -> Dict[str, Any]:
        """Full KPI performance report: actual, target, variance, status."""
        actual = cls.compute_actual(kpi, restaurant, start_dt, end_dt)

        # Find target for this period
        target_obj = KPITarget.objects.filter(
            kpi=kpi, restaurant=restaurant,
            period_start__lte=end_dt.date() if hasattr(end_dt, 'date') else end_dt,
            period_end__gte=start_dt.date() if hasattr(start_dt, 'date') else start_dt,
        ).first()

        target_val = target_obj.target_value if target_obj else kpi.default_target

        if actual is not None and target_val is not None:
            variance = actual - target_val
            variance_pct = _safe_pct(variance, target_val)
            status = cls.evaluate_status(actual, target_val, kpi.direction, kpi.warning_threshold)
        else:
            variance = None
            variance_pct = None
            status = KPIStatus.AT_RISK if actual is None else KPIStatus.ON_TARGET

        return {
            "kpi_id": str(kpi.id),
            "code": kpi.code,
            "name": kpi.name,
            "category": kpi.category,
            "unit": kpi.unit,
            "direction": kpi.direction,
            "actual": str(actual) if actual is not None else None,
            "target": str(target_val) if target_val is not None else None,
            "variance": str(variance) if variance is not None else None,
            "variance_pct": str(variance_pct) if variance_pct is not None else None,
            "status": status,
            "period": {"start": start_dt.isoformat(), "end": end_dt.isoformat()},
        }

    @classmethod
    def evaluate_all_kpis(cls, restaurant, start_dt, end_dt) -> List[Dict]:
        """Evaluate all active KPIs for a restaurant."""
        kpis = KPIDefinition.objects.filter(restaurant=restaurant, is_active=True)
        return [cls.get_kpi_performance(kpi, restaurant, start_dt, end_dt) for kpi in kpis]

    @classmethod
    def check_alerts(cls, restaurant) -> List[Dict]:
        """Check all alert-enabled KPIs and return breached ones."""
        now = timezone.now()
        start_dt, end_dt = DateFilterHelper.get_range("THIS_MONTH")
        kpis = KPIDefinition.objects.filter(restaurant=restaurant, is_active=True, alert_enabled=True)

        alerts = []
        for kpi in kpis:
            perf = cls.get_kpi_performance(kpi, restaurant, start_dt, end_dt)
            if perf["status"] in (KPIStatus.BELOW_TARGET, KPIStatus.AT_RISK):
                alerts.append({
                    "kpi_code": kpi.code,
                    "kpi_name": kpi.name,
                    "status": perf["status"],
                    "actual": perf["actual"],
                    "target": perf["target"],
                    "variance": perf["variance"],
                    "checked_at": now.isoformat(),
                })

        return alerts
