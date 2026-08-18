"""Deployment health verification: python manage.py check_startup"""
from django.core.management.base import BaseCommand

from apps.core.startup import run_config_checks, run_connectivity_checks


class Command(BaseCommand):
    help = "Verify startup configuration and dependency connectivity (deployment health)."

    def handle(self, *args, **options):
        self.stdout.write("Running startup configuration checks...")
        issues = run_config_checks(fail_fast=False)
        for level, message in issues:
            style = self.style.ERROR if level == "CRITICAL" else self.style.WARNING
            self.stdout.write(style(f"[{level}] {message}"))

        self.stdout.write("Running dependency connectivity checks...")
        result = run_connectivity_checks()
        for key, status in result["checks"].items():
            style = self.style.SUCCESS if status == "HEALTHY" else self.style.ERROR
            self.stdout.write(style(f"  {key}: {status}"))

        if result["status"] != "ok" or any(level == "CRITICAL" for level, _ in issues):
            self.stdout.write(self.style.ERROR("Startup checks FAILED."))
            raise SystemExit(1)
        self.stdout.write(self.style.SUCCESS("Startup checks passed."))