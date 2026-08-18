"""Deployment version/build information used across health checks, logs,
errors, and incidents. Values come from the environment; never from code."""

import os


def build_info() -> dict:
    """Return safe, non-secret build identity for the running deployment."""
    return {
        "version": os.environ.get("FLUXIFLOW_VERSION", "dev"),
        "commit_sha": os.environ.get("FLUXIFLOW_COMMIT_SHA", "unknown")[:12],
        "build_timestamp": os.environ.get("FLUXIFLOW_BUILD_TIMESTAMP", ""),
        "environment": os.environ.get("FLUXIFLOW_ENVIRONMENT", "development"),
    }


def build_version() -> str:
    return build_info()["version"]