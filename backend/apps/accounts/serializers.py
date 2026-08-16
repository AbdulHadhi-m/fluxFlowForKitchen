from rest_framework import serializers
from apps.accounts.models import User, UserSession

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "is_active",
            "is_staff",
            "last_login",
            "created_at",
        ]
        read_only_fields = ["id", "is_staff", "last_login", "created_at"]

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True, style={"input_type": "password"})

class TokenRefreshSerializer(serializers.Serializer):
    refresh_token = serializers.CharField(required=False, allow_blank=True)

class UserSessionSerializer(serializers.ModelSerializer):
    is_current = serializers.SerializerMethodField()

    class Meta:
        model = UserSession
        fields = [
            "id",
            "ip_address",
            "device_info",
            "is_current",
            "created_at",
            "last_activity",
            "expires_at",
        ]

    def get_is_current(self, obj) -> bool:
        request = self.context.get("request")
        if not request or not hasattr(request, "auth"):
            return False
        # If token has session_id, compare it
        token_session_id = getattr(request.auth, "get", lambda k: None)("session_id")
        return str(obj.id) == str(token_session_id)

class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    reset_url = serializers.CharField(required=False, default="http://localhost:5173/reset-password")

class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    password = serializers.CharField(required=True, min_length=8, write_only=True, style={"input_type": "password"})
    confirm_password = serializers.CharField(required=True, min_length=8, write_only=True, style={"input_type": "password"})

    def validate(self, data):
        if data["password"] != data["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": ["Passwords do not match."]})
        return data
