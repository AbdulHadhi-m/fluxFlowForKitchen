from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from apps.rbac.permissions import require_permission
from apps.restaurants.services import RestaurantService
from apps.restaurants.serializers import RestaurantSerializer
from apps.settings.services import SettingsService, SettingsSelector
from apps.settings.serializers import (
    RestaurantConfigurationSerializer,
    UserPreferenceSerializer,
)

class RestaurantProfileSettingsView(APIView):
    """
    Retrieve and update restaurant profile, legal info, currency, timezone, and location.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Get Restaurant Profile Settings")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        serializer = RestaurantSerializer(restaurant)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)

    @extend_schema(summary="Update Restaurant Profile Settings")
    def patch(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        # Check update permission
        from apps.rbac.services import RBACService
        perms = RBACService.get_effective_permissions(user=request.user, tenant_id=restaurant.id)
        if "settings.update" not in perms and "settings.manage" not in perms:
            return Response(
                {"success": False, "error": {"code": "PERMISSION_DENIED", "message": "You do not have permission to update restaurant settings.", "status_code": 403}},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = RestaurantSerializer(restaurant, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_restaurant = serializer.save()
        return Response({"success": True, "data": RestaurantSerializer(updated_restaurant).data}, status=status.HTTP_200_OK)


class OperationalSettingsView(APIView):
    """
    Retrieve and update operational rules for KDS, Orders, Taxes, Inventory, and Procurement.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Get Operational Configurations")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        config = SettingsSelector.get_configuration(restaurant)
        serializer = RestaurantConfigurationSerializer(config)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)

    @extend_schema(summary="Update Operational Configurations")
    def patch(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        # Verify permissions
        from apps.rbac.services import RBACService
        perms = RBACService.get_effective_permissions(user=request.user, tenant_id=restaurant.id)
        if "settings.update" not in perms and "settings.manage" not in perms:
            return Response(
                {"success": False, "error": {"code": "PERMISSION_DENIED", "message": "You do not have permission to modify settings.", "status_code": 403}},
                status=status.HTTP_403_FORBIDDEN,
            )

        config = SettingsService.update_configuration(
            restaurant=restaurant,
            user=request.user,
            payload=request.data,
            request=request,
        )
        return Response(
            {"success": True, "data": RestaurantConfigurationSerializer(config).data},
            status=status.HTTP_200_OK,
        )


class UserPreferencesView(APIView):
    """
    Manage user-scoped UI preferences (Theme, date/time formatting, table density).
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Get Current User Preferences")
    def get(self, request):
        prefs = SettingsSelector.get_user_preferences(request.user)
        serializer = UserPreferenceSerializer(prefs)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)

    @extend_schema(summary="Update Current User Preferences")
    def patch(self, request):
        prefs = SettingsService.update_user_preferences(request.user, request.data)
        serializer = UserPreferenceSerializer(prefs)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)
