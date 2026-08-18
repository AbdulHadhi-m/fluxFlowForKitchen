"""Public health check endpoints.

- ``GET /health/live/`` — process liveness (always 200 when the process runs)
- ``GET /health/ready/`` — readiness (critical dependencies)
- ``GET /health/dependencies/`` — full dependency detail (safe metadata only)
- ``GET /health/`` — backwards-compatible composite health check

Health responses never expose credentials, connection strings, internal
network details, or secrets (section 44).
"""
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema, OpenApiResponse

from apps.core.health import HEALTHY, HealthService
from apps.core.version import build_info


class HealthCheckView(APIView):
    """Backwards-compatible composite health check (PostgreSQL + Redis)."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        summary="Service Health Check",
        description="Returns runtime status of Backend, PostgreSQL, and Redis infrastructure.",
        responses={
            200: OpenApiResponse(description="All services operational"),
            503: OpenApiResponse(description="One or more critical services degraded"),
        },
    )
    def get(self, request):
        result = HealthService.run_all()
        overall = result["status"]
        http_status = (
            status.HTTP_200_OK if overall == HEALTHY else status.HTTP_503_SERVICE_UNAVAILABLE
        )
        return Response(
            {
                "success": http_status == status.HTTP_200_OK,
                "data": {
                    "status": "healthy" if overall == HEALTHY else "degraded",
                    "service": "Fluxiflow for Kitchen API",
                    "version": build_info()["version"],
                    "timestamp": timezone.now().isoformat(),
                    "dependencies": {
                        ("database" if key == "postgres" else key): dep["status"]
                        for key, dep in result["dependencies"].items()
                    },
                },
            },
            status=http_status,
        )


class LivenessView(APIView):
    """Liveness probe: answers 'is this application process alive?'."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(summary="Liveness Probe", responses={200: OpenApiResponse(description="Alive")})
    def get(self, request):
        result = HealthService.liveness()
        return Response(
            {
                "success": True,
                "data": {
                    "status": result["status"],
                    "service": "Fluxiflow for Kitchen API",
                    "version": build_info()["version"],
                    "timestamp": timezone.now().isoformat(),
                },
            }
        )


class ReadinessView(APIView):
    """Readiness probe: answers 'can this instance safely receive traffic?'."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        summary="Readiness Probe",
        responses={
            200: OpenApiResponse(description="Ready"),
            503: OpenApiResponse(description="Critical dependency unavailable"),
        },
    )
    def get(self, request):
        result = HealthService.readiness()
        http_status = status.HTTP_200_OK if result["ready"] else status.HTTP_503_SERVICE_UNAVAILABLE
        return Response(
            {
                "success": result["ready"],
                "data": {
                    "status": result["status"],
                    "ready": result["ready"],
                    "service": "Fluxiflow for Kitchen API",
                    "version": build_info()["version"],
                    "timestamp": timezone.now().isoformat(),
                    "dependencies": result["dependencies"],
                },
            },
            status=http_status,
        )


class DependenciesView(APIView):
    """Full dependency health detail (safe metadata only — no secrets)."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(summary="Dependency Health")
    def get(self, request):
        result = HealthService.run_all()
        return Response(
            {
                "success": True,
                "data": {
                    "status": result["status"],
                    "version": build_info(),
                    "timestamp": timezone.now().isoformat(),
                    "dependencies": result["dependencies"],
                },
            }
        )