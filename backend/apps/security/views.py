from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from apps.accounts.models import User, UserSession
from apps.core.pagination import FluxiflowPagination
from apps.rbac.permissions import require_permission
from apps.restaurants.services import RestaurantService
from apps.security.models import (
    DataRetentionPolicy,
    LoginAttemptLog,
    MFADevice,
    SecurityEvent,
    SecurityEventType,
    SecurityEventSeverity,
    SecurityIncident,
    SecurityPolicy,
)
from apps.security.serializers import (
    ChangePasswordSerializer,
    DataRetentionPolicySerializer,
    LoginAttemptSerializer,
    MFADeviceSerializer,
    MFAVerifySerializer,
    SecurityEventSerializer,
    SecurityIncidentCreateSerializer,
    SecurityIncidentSerializer,
    SecurityIncidentUpdateSerializer,
    SecurityPolicySerializer,
    StepUpAuthSerializer,
)
from apps.security.services import (
    MFAService,
    SecurityEventService,
    SecurityIncidentService,
    SecurityPolicyService,
    StepUpAuthService,
    SuspiciousActivityDetector,
)


# ---------------------------------------------------------------------------
# Security Dashboard
# ---------------------------------------------------------------------------
class SecurityDashboardView(APIView):
    """Aggregated security metrics for the restaurant."""
    permission_classes = [IsAuthenticated, require_permission("security.view")]

    @extend_schema(summary="Security Dashboard Overview")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        now = timezone.now()
        last_24h = now - timezone.timedelta(hours=24)
        last_7d = now - timezone.timedelta(days=7)

        # Security events summary
        events_24h = SecurityEvent.objects.filter(
            restaurant=restaurant, created_at__gte=last_24h
        )
        failed_logins_24h = events_24h.filter(
            event_type=SecurityEventType.AUTH_LOGIN_FAILED
        ).count()
        successful_logins_24h = events_24h.filter(
            event_type=SecurityEventType.AUTH_LOGIN_SUCCESS
        ).count()

        # Active sessions
        active_sessions = UserSession.objects.filter(
            user__memberships__tenant_id=restaurant.id if restaurant else None,
            is_revoked=False,
            expires_at__gt=now,
        ).count() if restaurant else 0

        # MFA adoption
        from apps.rbac.models import TenantMembership
        total_staff = TenantMembership.objects.filter(
            tenant_id=restaurant.id if restaurant else None,
            is_active=True,
        ).count() if restaurant else 0
        mfa_enabled_count = MFADevice.objects.filter(
            is_active=True,
            is_verified=True,
            user__memberships__tenant_id=restaurant.id if restaurant else None,
        ).count() if restaurant else 0

        # Open incidents
        open_incidents = SecurityIncident.objects.filter(
            restaurant=restaurant,
            status__in=["OPEN", "INVESTIGATING", "CONTAINED"],
        ).count() if restaurant else 0

        # Suspicious activity
        alerts = SuspiciousActivityDetector.run_all_checks(restaurant)

        # Recent permission denials
        permission_denials_24h = events_24h.filter(
            event_type=SecurityEventType.PERMISSION_DENIED
        ).count()

        return Response({
            "success": True,
            "data": {
                "failed_logins_24h": failed_logins_24h,
                "successful_logins_24h": successful_logins_24h,
                "active_sessions": active_sessions,
                "total_staff": total_staff,
                "mfa_enabled_count": mfa_enabled_count,
                "mfa_adoption_percent": round(
                    (mfa_enabled_count / total_staff * 100) if total_staff > 0 else 0, 1
                ),
                "open_incidents": open_incidents,
                "permission_denials_24h": permission_denials_24h,
                "suspicious_alerts": alerts,
            },
        })


# ---------------------------------------------------------------------------
# Security Events
# ---------------------------------------------------------------------------
class SecurityEventListView(APIView, FluxiflowPagination):
    """Paginated security event log with filters."""
    permission_classes = [IsAuthenticated, require_permission("security.view")]

    @extend_schema(summary="List Security Events")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        queryset = SecurityEvent.objects.filter(restaurant=restaurant).order_by("-created_at")

        # Filters
        event_type = request.query_params.get("event_type")
        if event_type:
            queryset = queryset.filter(event_type=event_type)

        severity = request.query_params.get("severity")
        if severity:
            queryset = queryset.filter(severity=severity.upper())

        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(description__icontains=search)
                | Q(user__email__icontains=search)
                | Q(ip_address__icontains=search)
            )

        page = self.paginate_queryset(queryset, request, view=self)
        if page is not None:
            serializer = SecurityEventSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = SecurityEventSerializer(queryset[:100], many=True)
        return Response({"success": True, "data": serializer.data})


# ---------------------------------------------------------------------------
# MFA Endpoints
# ---------------------------------------------------------------------------
class MFAStatusView(APIView):
    """Get current MFA status for authenticated user."""
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Get MFA Status")
    def get(self, request):
        device = MFADevice.objects.filter(user=request.user).first()
        if not device:
            return Response({
                "success": True,
                "data": {
                    "mfa_enabled": False,
                    "device": None,
                },
            })
        return Response({
            "success": True,
            "data": {
                "mfa_enabled": device.is_active and device.is_verified,
                "device": MFADeviceSerializer(device).data,
            },
        })


class MFASetupView(APIView):
    """Initiate MFA setup — returns TOTP secret and provisioning URI."""
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Setup MFA Device")
    def post(self, request):
        device, raw_secret, provisioning_uri = MFAService.setup_mfa(request.user)

        SecurityEventService.record(
            event_type=SecurityEventType.MFA_ENABLED,
            description=f"MFA setup initiated for {request.user.email}",
            severity=SecurityEventSeverity.MEDIUM,
            user=request.user,
            request=request,
        )

        return Response({
            "success": True,
            "data": {
                "secret": raw_secret,
                "provisioning_uri": provisioning_uri,
                "device": MFADeviceSerializer(device).data,
            },
        })


class MFAVerifyView(APIView):
    """Verify TOTP code and activate MFA. Returns recovery codes."""
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Verify and Activate MFA")
    def post(self, request):
        serializer = MFAVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        device, recovery_codes = MFAService.verify_and_activate(
            request.user, serializer.validated_data["otp_code"]
        )

        SecurityEventService.record(
            event_type=SecurityEventType.MFA_ENABLED,
            description=f"MFA activated for {request.user.email}",
            severity=SecurityEventSeverity.MEDIUM,
            user=request.user,
            request=request,
        )

        return Response({
            "success": True,
            "data": {
                "device": MFADeviceSerializer(device).data,
                "recovery_codes": recovery_codes,
                "message": "MFA activated. Save your recovery codes — they will not be shown again.",
            },
        })


class MFADisableView(APIView):
    """Disable MFA. Requires password re-authentication."""
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Disable MFA")
    def post(self, request):
        serializer = StepUpAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not request.user.check_password(serializer.validated_data["password"]):
            return Response({
                "success": False,
                "error": {
                    "code": "INVALID_PASSWORD",
                    "message": "Current password is incorrect.",
                    "status_code": 403,
                },
            }, status=status.HTTP_403_FORBIDDEN)

        MFAService.disable_mfa(request.user)

        SecurityEventService.record(
            event_type=SecurityEventType.MFA_DISABLED,
            description=f"MFA disabled for {request.user.email}",
            severity=SecurityEventSeverity.HIGH,
            user=request.user,
            request=request,
        )

        return Response({
            "success": True,
            "data": {"message": "MFA has been disabled."},
        })


# ---------------------------------------------------------------------------
# Change Password
# ---------------------------------------------------------------------------
class ChangePasswordView(APIView):
    """Change password with current password verification."""
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Change Password")
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not request.user.check_password(serializer.validated_data["current_password"]):
            return Response({
                "success": False,
                "error": {
                    "code": "INVALID_PASSWORD",
                    "message": "Current password is incorrect.",
                    "status_code": 400,
                },
            }, status=status.HTTP_400_BAD_REQUEST)

        new_password = serializer.validated_data["new_password"]

        # Validate against Django validators
        from django.contrib.auth.password_validation import validate_password
        try:
            validate_password(new_password, request.user)
        except Exception as e:
            return Response({
                "success": False,
                "error": {
                    "code": "WEAK_PASSWORD",
                    "message": str(e),
                    "status_code": 400,
                },
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate against tenant security policy
        restaurant = RestaurantService.get_user_restaurant(request.user)
        if restaurant:
            policy_errors = SecurityPolicyService.validate_password_against_policy(
                new_password, restaurant
            )
            if policy_errors:
                return Response({
                    "success": False,
                    "error": {
                        "code": "POLICY_VIOLATION",
                        "message": " ".join(policy_errors),
                        "status_code": 400,
                    },
                }, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_password)
        request.user.save(update_fields=["password"])

        # Revoke all other sessions
        current_session_id = getattr(request.auth, "get", lambda k: None)("session_id")
        UserSession.objects.filter(
            user=request.user, is_revoked=False
        ).exclude(id=current_session_id).update(is_revoked=True)

        SecurityEventService.record(
            event_type=SecurityEventType.PASSWORD_CHANGED,
            description=f"Password changed for {request.user.email}",
            severity=SecurityEventSeverity.MEDIUM,
            user=request.user,
            request=request,
        )

        return Response({
            "success": True,
            "data": {"message": "Password changed successfully. Other sessions have been revoked."},
        })


# ---------------------------------------------------------------------------
# Step-Up Authentication
# ---------------------------------------------------------------------------
class StepUpAuthView(APIView):
    """Re-authenticate with password for sensitive operations."""
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Step-Up Authentication")
    def post(self, request):
        serializer = StepUpAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not request.user.check_password(serializer.validated_data["password"]):
            return Response({
                "success": False,
                "error": {
                    "code": "INVALID_PASSWORD",
                    "message": "Password is incorrect.",
                    "status_code": 403,
                },
            }, status=status.HTTP_403_FORBIDDEN)

        StepUpAuthService.record_step_up(request.user, request)

        return Response({
            "success": True,
            "data": {"message": "Step-up authentication successful. Valid for 15 minutes."},
        })


# ---------------------------------------------------------------------------
# Security Policy
# ---------------------------------------------------------------------------
class SecurityPolicyView(APIView):
    """Manage tenant security policy."""
    permission_classes = [IsAuthenticated, require_permission("security.manage")]

    @extend_schema(summary="Get Security Policy")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        policy = SecurityPolicyService.get_or_create_policy(restaurant)
        return Response({
            "success": True,
            "data": SecurityPolicySerializer(policy).data,
        })

    @extend_schema(summary="Update Security Policy")
    def put(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        policy = SecurityPolicyService.get_or_create_policy(restaurant)
        serializer = SecurityPolicySerializer(policy, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        SecurityEventService.record(
            event_type=SecurityEventType.SECURITY_SETTING_CHANGED,
            description="Security policy updated",
            severity=SecurityEventSeverity.HIGH,
            user=request.user,
            restaurant=restaurant,
            request=request,
        )

        return Response({"success": True, "data": serializer.data})


# ---------------------------------------------------------------------------
# Security Incidents
# ---------------------------------------------------------------------------
class SecurityIncidentListView(APIView, FluxiflowPagination):
    """List and create security incidents."""
    permission_classes = [IsAuthenticated, require_permission("security.view")]

    @extend_schema(summary="List Security Incidents")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        queryset = SecurityIncident.objects.filter(restaurant=restaurant).order_by("-created_at")

        status_filter = request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())

        severity = request.query_params.get("severity")
        if severity:
            queryset = queryset.filter(severity=severity.upper())

        page = self.paginate_queryset(queryset, request, view=self)
        if page is not None:
            serializer = SecurityIncidentSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = SecurityIncidentSerializer(queryset[:50], many=True)
        return Response({"success": True, "data": serializer.data})

    @extend_schema(summary="Create Security Incident")
    def post(self, request):
        serializer = SecurityIncidentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        restaurant = RestaurantService.get_user_restaurant(request.user)
        data = serializer.validated_data

        assigned_to = None
        if data.get("assigned_to_id"):
            assigned_to = User.objects.filter(id=data["assigned_to_id"]).first()

        affected_user = None
        if data.get("affected_user_id"):
            affected_user = User.objects.filter(id=data["affected_user_id"]).first()

        incident = SecurityIncidentService.create_incident(
            restaurant=restaurant,
            title=data["title"],
            description=data.get("description", ""),
            severity=data.get("severity", "MEDIUM"),
            reported_by=request.user,
            affected_user=affected_user,
        )
        if assigned_to:
            incident.assigned_to = assigned_to
            incident.save(update_fields=["assigned_to"])

        return Response({
            "success": True,
            "data": SecurityIncidentSerializer(incident).data,
        }, status=status.HTTP_201_CREATED)


class SecurityIncidentDetailView(APIView):
    """Manage a specific security incident."""
    permission_classes = [IsAuthenticated, require_permission("security.view")]

    @extend_schema(summary="Get Security Incident Detail")
    def get(self, request, incident_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        incident = SecurityIncident.objects.filter(
            id=incident_id, restaurant=restaurant
        ).first()
        if not incident:
            return Response({
                "success": False,
                "error": {"code": "NOT_FOUND", "message": "Incident not found.", "status_code": 404},
            }, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "success": True,
            "data": SecurityIncidentSerializer(incident).data,
        })

    @extend_schema(summary="Update Security Incident")
    def patch(self, request, incident_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        incident = SecurityIncident.objects.filter(
            id=incident_id, restaurant=restaurant
        ).first()
        if not incident:
            return Response({
                "success": False,
                "error": {"code": "NOT_FOUND", "message": "Incident not found.", "status_code": 404},
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = SecurityIncidentUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if data.get("status"):
            incident = SecurityIncidentService.update_status(
                incident, data["status"], request.user, data.get("note", "")
            )
        elif data.get("note"):
            incident = SecurityIncidentService.add_note(incident, request.user, data["note"])

        if data.get("assigned_to_id"):
            assigned_to = User.objects.filter(id=data["assigned_to_id"]).first()
            if assigned_to:
                incident.assigned_to = assigned_to
                incident.save(update_fields=["assigned_to"])

        return Response({
            "success": True,
            "data": SecurityIncidentSerializer(incident).data,
        })


# ---------------------------------------------------------------------------
# Admin Session Control
# ---------------------------------------------------------------------------
class AdminSessionControlView(APIView):
    """Allow administrators to revoke other users' sessions."""
    permission_classes = [IsAuthenticated, require_permission("security.admin_sessions")]

    @extend_schema(summary="Admin: Revoke User Sessions")
    def post(self, request, user_id):
        target_user = User.objects.filter(id=user_id).first()
        if not target_user:
            return Response({
                "success": False,
                "error": {"code": "NOT_FOUND", "message": "User not found.", "status_code": 404},
            }, status=status.HTTP_404_NOT_FOUND)

        revoked_count = UserSession.objects.filter(
            user=target_user, is_revoked=False
        ).update(is_revoked=True)

        SecurityEventService.record(
            event_type=SecurityEventType.ADMIN_SESSION_REVOKE,
            description=f"Admin {request.user.email} revoked all sessions for {target_user.email}",
            severity=SecurityEventSeverity.HIGH,
            user=request.user,
            request=request,
            metadata={"target_user": str(target_user.id), "revoked_count": revoked_count},
        )

        return Response({
            "success": True,
            "data": {
                "message": f"Revoked {revoked_count} sessions for {target_user.email}.",
                "revoked_count": revoked_count,
            },
        })


# ---------------------------------------------------------------------------
# Access Review
# ---------------------------------------------------------------------------
class AccessReviewView(APIView):
    """Admin view of users, roles, permissions, sessions for access review."""
    permission_classes = [IsAuthenticated, require_permission("security.view")]

    @extend_schema(summary="Access Review Overview")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        now = timezone.now()

        from apps.rbac.models import TenantMembership
        memberships = TenantMembership.objects.filter(
            tenant_id=restaurant.id if restaurant else None,
            is_active=True,
        ).select_related("user", "active_role")

        users_data = []
        for m in memberships:
            has_mfa = MFADevice.objects.filter(
                user=m.user, is_active=True, is_verified=True
            ).exists()
            active_sessions = UserSession.objects.filter(
                user=m.user, is_revoked=False, expires_at__gt=now
            ).count()
            users_data.append({
                "user_id": str(m.user.id),
                "email": m.user.email,
                "full_name": m.user.full_name,
                "active_role": m.active_role.code if m.active_role else None,
                "mfa_enabled": has_mfa,
                "active_sessions": active_sessions,
                "last_login": m.user.last_login.isoformat() if m.user.last_login else None,
                "is_active": m.user.is_active,
            })

        return Response({
            "success": True,
            "data": {
                "users": users_data,
                "total_users": len(users_data),
            },
        })


# ---------------------------------------------------------------------------
# Data Retention
# ---------------------------------------------------------------------------
class DataRetentionPolicyView(APIView):
    """Manage data retention policies."""
    permission_classes = [IsAuthenticated, require_permission("security.manage")]

    @extend_schema(summary="List Data Retention Policies")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        policies = DataRetentionPolicy.objects.filter(restaurant=restaurant)
        serializer = DataRetentionPolicySerializer(policies, many=True)
        return Response({"success": True, "data": serializer.data})

    @extend_schema(summary="Create/Update Data Retention Policy")
    def post(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        serializer = DataRetentionPolicySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        policy, created = DataRetentionPolicy.objects.update_or_create(
            restaurant=restaurant,
            category=serializer.validated_data["category"],
            defaults={
                "retention_days": serializer.validated_data.get("retention_days", 365),
                "is_active": serializer.validated_data.get("is_active", True),
                "auto_delete": serializer.validated_data.get("auto_delete", False),
            },
        )
        return Response({
            "success": True,
            "data": DataRetentionPolicySerializer(policy).data,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
