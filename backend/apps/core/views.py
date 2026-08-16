import os
from django.db import connection
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema, OpenApiResponse
import redis

class HealthCheckView(APIView):
    """
    Public Health Check Endpoint for Fluxiflow for Kitchen.
    Verifies Application runtime, PostgreSQL connectivity, and Redis channel layer reachability.
    Safe for Docker health checks and frontend integration status.
    """
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
        db_status = "healthy"
        redis_status = "healthy"
        http_status = status.HTTP_200_OK

        # 1. Verify PostgreSQL
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
                cursor.fetchone()
        except Exception as e:
            db_status = f"unhealthy: {type(e).__name__}"
            http_status = status.HTTP_503_SERVICE_UNAVAILABLE

        # 2. Verify Redis
        redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
        try:
            r = redis.from_url(redis_url, socket_connect_timeout=2)
            r.ping()
        except Exception as e:
            redis_status = f"unhealthy: {type(e).__name__}"
            # Redis failure triggers 503 if strict, or keeps 200 in dev if not strictly required
            http_status = status.HTTP_503_SERVICE_UNAVAILABLE

        overall_status = "healthy" if http_status == status.HTTP_200_OK else "degraded"

        return Response(
            {
                "success": http_status == status.HTTP_200_OK,
                "data": {
                    "status": overall_status,
                    "service": "Fluxiflow for Kitchen API",
                    "version": "1.0.0-foundation",
                    "timestamp": timezone.now().isoformat(),
                    "dependencies": {
                        "database": db_status,
                        "redis": redis_status,
                    },
                },
            },
            status=http_status,
        )
