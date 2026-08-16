from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse
from apps.core.pagination import FluxiflowPagination
from apps.rbac.permissions import require_permission
from apps.restaurants.services import RestaurantService
from apps.staff.models import StaffProfile
from apps.staff.services import StaffService
from apps.staff.serializers import (
    StaffSerializer,
    StaffCreateSerializer,
    StaffUpdateSerializer,
)

class StaffListView(APIView):
    """
    List and create staff members within the current restaurant organization.
    """
    permission_classes = [IsAuthenticated, require_permission("staff.view")]

    @extend_schema(summary="List Staff Members for Current Restaurant")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        queryset = StaffProfile.objects.filter(restaurant=restaurant).select_related(
            "primary_role", "user", "membership"
        ).prefetch_related("secondary_roles")

        # Status filter
        status_param = request.query_params.get("status")
        if status_param in ["ACTIVE", "DISABLED"]:
            queryset = queryset.filter(status=status_param)

        # Primary role filter
        role_param = request.query_params.get("role")
        if role_param:
            queryset = queryset.filter(primary_role__code=role_param.upper())

        # Search filter
        search_query = request.query_params.get("search", "").strip()
        if search_query:
            queryset = queryset.filter(
                Q(first_name__icontains=search_query)
                | Q(last_name__icontains=search_query)
                | Q(email__icontains=search_query)
                | Q(employee_id__icontains=search_query)
            )

        paginator = FluxiflowPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = StaffSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        summary="Create New Staff Member",
        request=StaffCreateSerializer,
        responses={201: OpenApiResponse(description="Staff member created successfully")},
    )
    def post(self, request):
        # Enforce staff.create / staff.invite permission
        if not request.user.is_superuser:
            check_perm = require_permission("staff.create")()
            if not check_perm.has_permission(request, self):
                return Response(
                    {
                        "success": False,
                        "error": {
                            "code": "PERMISSION_DENIED",
                            "message": "Permission 'staff.create' required to add staff.",
                            "status_code": status.HTTP_403_FORBIDDEN,
                        },
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        restaurant = RestaurantService.get_user_restaurant(request.user)
        serializer = StaffCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        staff = StaffService.create_staff_member(
            restaurant=restaurant,
            email=serializer.validated_data["email"],
            first_name=serializer.validated_data.get("first_name", ""),
            last_name=serializer.validated_data.get("last_name", ""),
            phone=serializer.validated_data.get("phone", ""),
            primary_role_identifier=serializer.validated_data["primary_role"],
            secondary_role_identifiers=serializer.validated_data.get("secondary_roles", []),
            password=serializer.validated_data.get("password"),
            employee_id=serializer.validated_data.get("employee_id"),
        )

        return Response(
            {"success": True, "data": StaffSerializer(staff).data},
            status=status.HTTP_201_CREATED,
        )

class StaffDetailView(APIView):
    """
    Retrieve and update individual staff profile within current restaurant.
    """
    permission_classes = [IsAuthenticated, require_permission("staff.view")]

    def get_staff(self, user, staff_id) -> StaffProfile:
        restaurant = RestaurantService.get_user_restaurant(user)
        staff = StaffProfile.objects.filter(
            id=staff_id, restaurant=restaurant
        ).select_related("primary_role", "user", "membership").prefetch_related("secondary_roles").first()
        if not staff:
            return None
        return staff

    @extend_schema(summary="Get Staff Member Profile")
    def get(self, request, staff_id):
        staff = self.get_staff(request.user, staff_id)
        if not staff:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "STAFF_NOT_FOUND",
                        "message": "Staff member not found in your restaurant organization.",
                        "status_code": status.HTTP_404_NOT_FOUND,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"success": True, "data": StaffSerializer(staff).data}, status=status.HTTP_200_OK)

    @extend_schema(summary="Update Staff Member", request=StaffUpdateSerializer)
    def patch(self, request, staff_id):
        # Enforce staff.update permission
        if not request.user.is_superuser:
            check_perm = require_permission("staff.update")()
            if not check_perm.has_permission(request, self):
                return Response(
                    {
                        "success": False,
                        "error": {
                            "code": "PERMISSION_DENIED",
                            "message": "Permission 'staff.update' required to edit staff details.",
                            "status_code": status.HTTP_403_FORBIDDEN,
                        },
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        staff = self.get_staff(request.user, staff_id)
        if not staff:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "STAFF_NOT_FOUND",
                        "message": "Staff member not found in your restaurant organization.",
                        "status_code": status.HTTP_404_NOT_FOUND,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = StaffUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        updated_staff = StaffService.update_staff_member(
            staff=staff,
            first_name=serializer.validated_data.get("first_name"),
            last_name=serializer.validated_data.get("last_name"),
            phone=serializer.validated_data.get("phone"),
            primary_role_identifier=serializer.validated_data.get("primary_role"),
            secondary_role_identifiers=serializer.validated_data.get("secondary_roles"),
            status=serializer.validated_data.get("status"),
        )

        return Response({"success": True, "data": StaffSerializer(updated_staff).data}, status=status.HTTP_200_OK)

class StaffDisableView(APIView):
    """
    Disable staff member account and terminate active user sessions.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Disable Staff Member Account")
    def post(self, request, staff_id):
        # Enforce staff.remove / staff.disable permission
        if not request.user.is_superuser:
            check_perm = require_permission("staff.remove")()
            if not check_perm.has_permission(request, self):
                return Response(
                    {
                        "success": False,
                        "error": {
                            "code": "PERMISSION_DENIED",
                            "message": "Permission 'staff.remove' required to disable staff accounts.",
                            "status_code": status.HTTP_403_FORBIDDEN,
                        },
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        restaurant = RestaurantService.get_user_restaurant(request.user)
        staff = StaffProfile.objects.filter(id=staff_id, restaurant=restaurant).first()
        if not staff:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "STAFF_NOT_FOUND",
                        "message": "Staff member not found in your restaurant organization.",
                        "status_code": status.HTTP_404_NOT_FOUND,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        disabled_staff = StaffService.disable_staff_member(staff)
        return Response(
            {"success": True, "data": StaffSerializer(disabled_staff).data},
            status=status.HTTP_200_OK,
        )

class StaffReactivateView(APIView):
    """
    Reactivate a disabled staff member.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Reactivate Disabled Staff Member")
    def post(self, request, staff_id):
        if not request.user.is_superuser:
            check_perm = require_permission("staff.update")()
            if not check_perm.has_permission(request, self):
                return Response(
                    {
                        "success": False,
                        "error": {
                            "code": "PERMISSION_DENIED",
                            "message": "Permission 'staff.update' required to reactivate staff.",
                            "status_code": status.HTTP_403_FORBIDDEN,
                        },
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        restaurant = RestaurantService.get_user_restaurant(request.user)
        staff = StaffProfile.objects.filter(id=staff_id, restaurant=restaurant).first()
        if not staff:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "STAFF_NOT_FOUND",
                        "message": "Staff member not found in your restaurant organization.",
                        "status_code": status.HTTP_404_NOT_FOUND,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        reactivated_staff = StaffService.reactivate_staff_member(staff)
        return Response(
            {"success": True, "data": StaffSerializer(reactivated_staff).data},
            status=status.HTTP_200_OK,
        )
