from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse
from apps.rbac.permissions import require_permission
from apps.restaurants.services import RestaurantService
from apps.restaurants.serializers import (
    RestaurantSerializer,
    RestaurantCreateSerializer,
    RestaurantUpdateSerializer,
    BusinessHourSerializer,
)

class CurrentRestaurantView(APIView):
    """
    Retrieve or update the current restaurant organization context for authenticated employee.
    """
    permission_classes = [IsAuthenticated, require_permission("settings.view")]

    @extend_schema(summary="Get Current Restaurant Profile & Settings")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        serializer = RestaurantSerializer(restaurant)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Update Current Restaurant Profile & Settings",
        request=RestaurantUpdateSerializer,
    )
    def patch(self, request):
        # Enforce settings.update permission for modifications
        if not request.user.is_superuser:
            check_perm = require_permission("settings.update")()
            if not check_perm.has_permission(request, self):
                return Response(
                    {
                        "success": False,
                        "error": {
                            "code": "PERMISSION_DENIED",
                            "message": "Permission 'settings.update' required to modify restaurant profile.",
                            "status_code": status.HTTP_403_FORBIDDEN,
                        },
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        restaurant = RestaurantService.get_user_restaurant(request.user)
        serializer = RestaurantUpdateSerializer(restaurant, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        updated_restaurant = RestaurantService.update_restaurant(
            restaurant, **serializer.validated_data
        )
        return Response(
            {"success": True, "data": RestaurantSerializer(updated_restaurant).data},
            status=status.HTTP_200_OK,
        )

class RestaurantCreateView(APIView):
    """
    Initial onboarding / setup endpoint to create a new Restaurant tenant organization.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Create New Restaurant Organization",
        request=RestaurantCreateSerializer,
        responses={201: OpenApiResponse(description="Restaurant created successfully")},
    )
    def post(self, request):
        serializer = RestaurantCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        restaurant, membership = RestaurantService.create_restaurant(
            user=request.user,
            **serializer.validated_data,
        )

        return Response(
            {"success": True, "data": RestaurantSerializer(restaurant).data},
            status=status.HTTP_201_CREATED,
        )

class BusinessHoursView(APIView):
    """
    Manage weekly operating hours for current restaurant tenant.
    """
    permission_classes = [IsAuthenticated, require_permission("settings.view")]

    @extend_schema(summary="Get Restaurant Operating Hours Schedule")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        hours = restaurant.business_hours.all()
        serializer = BusinessHourSerializer(hours, many=True)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Batch Update Weekly Operating Hours Schedule",
        request=BusinessHourSerializer(many=True),
    )
    def put(self, request):
        # Enforce settings.update permission
        if not request.user.is_superuser:
            check_perm = require_permission("settings.update")()
            if not check_perm.has_permission(request, self):
                return Response(
                    {
                        "success": False,
                        "error": {
                            "code": "PERMISSION_DENIED",
                            "message": "Permission 'settings.update' required to modify business hours.",
                            "status_code": status.HTTP_403_FORBIDDEN,
                        },
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        restaurant = RestaurantService.get_user_restaurant(request.user)
        serializer = BusinessHourSerializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)

        updated_hours = RestaurantService.update_business_hours(
            restaurant, serializer.validated_data
        )
        return Response(
            {"success": True, "data": BusinessHourSerializer(updated_hours, many=True).data},
            status=status.HTTP_200_OK,
        )
