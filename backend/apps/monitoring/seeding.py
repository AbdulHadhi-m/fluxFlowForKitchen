"""Seed defaults for alert rules and SLOs (idempotent)."""
from apps.monitoring.constants import DEFAULT_ALERT_RULES, DEFAULT_SLOS
from apps.monitoring.models import AlertRule, ServiceSLO


def seed_defaults() -> dict:
    """Create any missing default alert rules and SLOs. Returns counts."""
    rules_created = 0
    for spec in DEFAULT_ALERT_RULES:
        _, created = AlertRule.objects.get_or_create(code=spec["code"], defaults=spec)
        if created:
            rules_created += 1

    slos_created = 0
    for spec in DEFAULT_SLOS:
        _, created = ServiceSLO.objects.get_or_create(code=spec["code"], defaults=spec)
        if created:
            slos_created += 1

    return {"alert_rules": rules_created, "slos": slos_created}