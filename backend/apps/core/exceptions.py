import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import (
    APIException,
    ValidationError,
    AuthenticationFailed,
    NotAuthenticated,
    PermissionDenied,
    NotFound,
    MethodNotAllowed,
    Throttled,
)
from django.http import Http404
from django.core.exceptions import PermissionDenied as DjangoPermissionDenied

logger = logging.getLogger("fluxiflow.api")

class ConflictError(APIException):
    """HTTP 409 Conflict Exception for concurrent or state invariant conflicts."""
    status_code = status.HTTP_409_CONFLICT
    default_detail = "A conflict occurred with the current state of the resource."
    default_code = "RESOURCE_CONFLICT"

class BusinessRuleError(APIException):
    """HTTP 422 Unprocessable Entity Exception for domain rule violations."""
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = "The request violates a business rule."
    default_code = "BUSINESS_RULE_VIOLATION"

def get_error_code(exc):
    """Determine standardized error code for an exception."""
    if isinstance(exc, ValidationError):
        return "VALIDATION_ERROR"
    if isinstance(exc, (NotAuthenticated, AuthenticationFailed)):
        return "AUTHENTICATION_FAILED"
    if isinstance(exc, (PermissionDenied, DjangoPermissionDenied)):
        return "PERMISSION_DENIED"
    if isinstance(exc, (NotFound, Http404)):
        return "NOT_FOUND"
    if isinstance(exc, MethodNotAllowed):
        return "METHOD_NOT_ALLOWED"
    if isinstance(exc, Throttled):
        return "RATE_LIMIT_EXCEEDED"
    if isinstance(exc, ConflictError):
        return "RESOURCE_CONFLICT"
    return getattr(exc, "default_code", "API_ERROR")

def custom_exception_handler(exc, context):
    """
    Standardized DRF Exception Handler for Fluxiflow for Kitchen.
    Maps all framework and domain exceptions into a uniform JSON error envelope.
    """
    request = context.get("request")
    correlation_id = getattr(request, "correlation_id", None)

    # Let DRF handle standard exceptions first
    response = exception_handler(exc, context)

    if response is not None:
        error_code = get_error_code(exc)
        message = "Request validation failed" if isinstance(exc, ValidationError) else getattr(exc, "detail", str(exc))

        # Flatten string message if detail is an object/list
        if isinstance(message, (dict, list)):
            message = "Validation or processing error occurred."

        error_payload = {
            "success": False,
            "error": {
                "code": error_code,
                "message": str(message),
                "status_code": response.status_code,
            },
        }

        # Include structured field details for validation errors
        if isinstance(response.data, (dict, list)):
            error_payload["error"]["details"] = response.data

        if correlation_id:
            error_payload["error"]["correlation_id"] = correlation_id

        response.data = error_payload
        return response

    # Handle unhandled 500 server errors safely without leaking stack trace
    logger.exception("Unhandled server error: %s", exc, extra={"correlation_id": correlation_id})

    # Error aggregation (fingerprinted) — never breaks the response path
    try:
        from apps.monitoring.services import ErrorTrackingService

        ErrorTrackingService.record_exception(exc, request)
    except Exception:
        pass

    return Response(
        {
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred. Please try again later.",
                "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                "correlation_id": correlation_id,
            },
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
