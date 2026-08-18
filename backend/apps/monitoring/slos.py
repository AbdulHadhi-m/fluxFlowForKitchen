"""SLO foundation: configurable internal service-level objectives with SLI
computation and error-budget tracking.

SLOs defined here are explicitly internal targets (is_contractual=False) —
they are never represented as contractual SLAs (section 70).
"""
import logging
from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone

from apps.monitoring.constants import SLOType
from apps.monitoring.models import ServiceSLO
from apps.monitoring.queries import latency_percentiles, request_summary

logger = logging.getLogger("fluxiflow.monitoring.slos")


class SLOComputeService:
    """Evaluates every active SLO from monitored data."""

    @classmethod
    def evaluate_all(cls) -> dict:
        results = {"evaluated": 0}
        for slo in ServiceSLO.objects.filter(is_active=True):
            sli, budget = cls._compute(slo)
            if sli is None:
                continue
            slo.latest_sli = sli
            slo.latest_error_budget_remaining = budget
            slo.evaluated_at = timezone.now()
            slo.save(update_fields=["latest_sli", "latest_error_budget_remaining", "evaluated_at", "updated_at"])
            results["evaluated"] += 1
        return results

    @classmethod
    def compute(cls, slo: ServiceSLO):
        """Compute SLI + remaining error budget for a single SLO."""
        sli, budget = cls._compute(slo)
        return {"sli": sli, "error_budget_remaining": budget}

    @classmethod
    def _compute(cls, slo: ServiceSLO):
        """Returns (sli_percent_or_ms, error_budget_remaining_percent) or
        (None, None) when insufficient data exists."""
        window_start = timezone.now() - timedelta(days=slo.window_days)

        if slo.service == "API":
            if slo.slo_type == SLOType.AVAILABILITY:
                summary = request_summary(1440 * slo.window_days)
                total = summary["total"]
                if not total:
                    return None, None
                sli = round((total - summary["errors"]) / total * 100, 2)
                return sli, cls._budget(sli, slo.target, "availability")
            if slo.slo_type == SLOType.LATENCY:
                threshold_ms = slo.evaluation_config.get("latency_ms", slo.target)
                from apps.monitoring.models import RequestLatencySample

                samples = list(
                    RequestLatencySample.objects.filter(sampled_at__gte=window_start).values_list(
                        "duration_ms", flat=True
                    )
                )
                if not samples:
                    return None, None
                within = sum(1 for s in samples if s <= threshold_ms)
                sli = round(within / len(samples) * 100, 2)
                return sli, cls._budget(sli, slo.target, "percentage")
            if slo.slo_type == SLOType.ERROR_RATE:
                summary = request_summary(1440 * slo.window_days)
                total = summary["total"]
                if not total:
                    return None, None
                sli = summary["error_rate"]
                budget = round(slo.target - sli, 2) if slo.target >= sli else 0.0
                return sli, budget

        if slo.service == "WORKFLOW" and slo.slo_type == SLOType.SUCCESS_RATE:
            from apps.workflows.models import ExecutionStatus, WorkflowExecution

            base = WorkflowExecution.objects.filter(started_at__gte=window_start)
            total = base.count()
            completed = base.filter(status=ExecutionStatus.COMPLETED).count()
            failed = base.filter(status=ExecutionStatus.FAILED).count()
            if not total:
                return None, None
            sli = round(completed / total * 100, 2)
            return sli, cls._budget(sli, slo.target, "percentage")

        if slo.service == "NOTIFICATION" and slo.slo_type == SLOType.SUCCESS_RATE:
            from apps.monitoring.models import NotificationDeliveryMetric

            base = NotificationDeliveryMetric.objects.filter(created_at__gte=window_start)
            total = base.count()
            if not total:
                return None, None
            sent = base.filter(status="SENT").count()
            sli = round(sent / total * 100, 2)
            return sli, cls._budget(sli, slo.target, "percentage")

        if slo.service == "WEBHOOK" and slo.slo_type == SLOType.SUCCESS_RATE:
            from apps.monitoring.models import WebhookDelivery

            base = WebhookDelivery.objects.filter(created_at__gte=window_start)
            total = base.count()
            if not total:
                return None, None
            ok = base.filter(success=True).count()
            sli = round(ok / total * 100, 2)
            return sli, cls._budget(sli, slo.target, "percentage")

        if slo.service == "INTEGRATION" and slo.slo_type == SLOType.SUCCESS_RATE:
            from apps.monitoring.models import ExternalServiceMetric

            base = ExternalServiceMetric.objects.filter(created_at__gte=window_start)
            total = base.count()
            if not total:
                return None, None
            ok = base.exclude(status__in=["FAILURE", "TIMEOUT", "RATE_LIMITED"]).count()
            sli = round(ok / total * 100, 2)
            return sli, cls._budget(sli, slo.target, "percentage")

        return None, None

    @classmethod
    def _budget(cls, sli: float, target: float, kind: str) -> float:
        """Remaining error budget as a percentage of the allowed error share."""
        if kind == "availability":
            allowed_error = 100 - target
            if allowed_error <= 0:
                return 0.0
            current_error = max(0.0, 100 - sli)
            return round(max(0.0, (allowed_error - current_error) / allowed_error * 100), 2)
        # Success-rate style budgets
        allowed_error = 100 - target
        if allowed_error <= 0:
            return 0.0
        current_error = max(0.0, 100 - sli)
        return round(max(0.0, (allowed_error - current_error) / allowed_error * 100), 2)