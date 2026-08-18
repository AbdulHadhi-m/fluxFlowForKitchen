from rest_framework import serializers

from apps.security.models import (
    DataRetentionPolicy,
    LoginAttemptLog,
    MFADevice,
    SecurityEvent,
    SecurityIncident,
    SecurityPolicy,
)


class SecurityEventSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True, default="")

    class Meta:
        model = SecurityEvent
        fields = [
            "id",
            "event_type",
            "severity",
            "description",
            "user_email",
            "ip_address",
            "correlation_id",
            "metadata",
            "created_at",
        ]
        read_only_fields = fields


class MFADeviceSerializer(serializers.ModelSerializer):
    remaining_recovery_codes = serializers.SerializerMethodField()

    class Meta:
        model = MFADevice
        fields = [
            "id",
            "is_verified",
            "is_active",
            "verified_at",
            "last_used_at",
            "remaining_recovery_codes",
            "created_at",
        ]
        read_only_fields = fields

    def get_remaining_recovery_codes(self, obj) -> int:
        return obj.recovery_codes.filter(is_used=False).count()


class MFASetupSerializer(serializers.Serializer):
    """Returned when MFA setup is initiated."""
    secret = serializers.CharField(read_only=True)
    provisioning_uri = serializers.CharField(read_only=True)
    qr_code_data_url = serializers.CharField(read_only=True, required=False)


class MFAVerifySerializer(serializers.Serializer):
    otp_code = serializers.CharField(required=True, min_length=6, max_length=6)


class MFARecoveryCodeVerifySerializer(serializers.Serializer):
    recovery_code = serializers.CharField(required=True, min_length=6)


class SecurityPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = SecurityPolicy
        fields = [
            "id",
            "password_min_length",
            "password_require_uppercase",
            "password_require_number",
            "password_require_special",
            "password_reject_common",
            "mfa_required_for_admins",
            "mfa_required_for_all",
            "session_timeout_minutes",
            "max_concurrent_sessions",
            "max_failed_login_attempts",
            "lockout_duration_minutes",
            "notify_on_failed_logins",
            "failed_login_alert_threshold",
            "notify_on_privilege_changes",
            "notify_on_mfa_changes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SecurityIncidentSerializer(serializers.ModelSerializer):
    reported_by_email = serializers.CharField(source="reported_by.email", read_only=True, default="")
    assigned_to_email = serializers.CharField(source="assigned_to.email", read_only=True, default="")
    affected_user_email = serializers.CharField(source="affected_user.email", read_only=True, default="")

    class Meta:
        model = SecurityIncident
        fields = [
            "id",
            "title",
            "description",
            "severity",
            "status",
            "reported_by_email",
            "assigned_to_email",
            "affected_user_email",
            "notes",
            "actions_taken",
            "resolved_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "reported_by_email", "assigned_to_email", "affected_user_email",
                            "notes", "actions_taken", "resolved_at", "created_at", "updated_at"]


class SecurityIncidentCreateSerializer(serializers.Serializer):
    title = serializers.CharField(required=True, max_length=255)
    description = serializers.CharField(required=False, default="")
    severity = serializers.ChoiceField(
        choices=["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        default="MEDIUM",
    )
    assigned_to_id = serializers.UUIDField(required=False, allow_null=True)
    affected_user_id = serializers.UUIDField(required=False, allow_null=True)


class SecurityIncidentUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=["OPEN", "INVESTIGATING", "CONTAINED", "RESOLVED", "CLOSED"],
        required=False,
    )
    note = serializers.CharField(required=False, default="")
    assigned_to_id = serializers.UUIDField(required=False, allow_null=True)


class DataRetentionPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = DataRetentionPolicy
        fields = [
            "id",
            "category",
            "retention_days",
            "is_active",
            "auto_delete",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class LoginAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoginAttemptLog
        fields = [
            "id",
            "email",
            "success",
            "ip_address",
            "failure_reason",
            "created_at",
        ]
        read_only_fields = fields


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, min_length=8, write_only=True)
    confirm_password = serializers.CharField(required=True, min_length=8, write_only=True)

    def validate(self, data):
        if data["new_password"] != data["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        if data["current_password"] == data["new_password"]:
            raise serializers.ValidationError(
                {"new_password": "New password must be different from current password."}
            )
        return data


class StepUpAuthSerializer(serializers.Serializer):
    password = serializers.CharField(required=True, write_only=True)
