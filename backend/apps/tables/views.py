from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse
from apps.core.pagination import FluxiflowPagination
from apps.rbac.permissions import require_permission
from apps.restaurants.services import RestaurantService
from apps.tables.models import RestaurantTable
from apps.tables.services import TableService
from apps.tables.serializers import (
    TableSerializer,
    TableCreateSerializer,
    TableUpdateSerializer,
    TableStatusUpdateSerializer,
)

class TableListCreateView(APIView):
    """
    List and create restaurant floor tables.
    """
    permission_classes = [IsAuthenticated, require_permission("tables.view")]

    @extend_schema(summary="List Tables for Current Restaurant")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        queryset = RestaurantTable.objects.filter(restaurant=restaurant)

        # Status filter
        status_param = request.query_params.get("status")
        if status_param in RestaurantTable.TableStatus.values:
            queryset = queryset.filter(status=status_param)

        # Section filter
        section_param = request.query_params.get("section")
        if section_param:
            queryset = queryset.filter(section__iexact=section_param.strip())

        # Active filter
        active_param = request.query_params.get("is_active")
        if active_param is not None:
            queryset = queryset.filter(is_active=active_param.lower() in ["true", "1"])

        # Search filter
        search_query = request.query_params.get("search", "").strip()
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) | Q(section__icontains=search_query)
            )

        paginator = FluxiflowPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = TableSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(summary="Create New Restaurant Table", request=TableCreateSerializer)
    def post(self, request):
        if not request.user.is_superuser:
            check_perm = require_permission("tables.create")()
            if not check_perm.has_permission(request, self):
                return Response(
                    {
                        "success": False,
                        "error": {
                            "code": "PERMISSION_DENIED",
                            "message": "Permission 'tables.create' required to add tables.",
                            "status_code": status.HTTP_403_FORBIDDEN,
                        },
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        restaurant = RestaurantService.get_user_restaurant(request.user)
        serializer = TableCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        table = TableService.create_table(
            restaurant=restaurant,
            name=serializer.validated_data["name"],
            capacity=serializer.validated_data.get("capacity", 4),
            section=serializer.validated_data.get("section", "Main Dining"),
            display_order=serializer.validated_data.get("display_order", 0),
            is_active=serializer.validated_data.get("is_active", True),
        )

        return Response(
            {"success": True, "data": TableSerializer(table).data},
            status=status.HTTP_201_CREATED,
        )

class TableDetailUpdateView(APIView):
    """
    Retrieve, update, and deactivate an individual restaurant table.
    """
    permission_classes = [IsAuthenticated, require_permission("tables.view")]

    def get_table(self, user, table_id) -> RestaurantTable:
        restaurant = RestaurantService.get_user_restaurant(user)
        return RestaurantTable.objects.filter(id=table_id, restaurant=restaurant).first()

    @extend_schema(summary="Get Table Details")
    def get(self, request, table_id):
        table = self.get_table(request.user, table_id)
        if not table:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "TABLE_NOT_FOUND",
                        "message": "Table not found in your restaurant organization.",
                        "status_code": status.HTTP_404_NOT_FOUND,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"success": True, "data": TableSerializer(table).data}, status=status.HTTP_200_OK)

    @extend_schema(summary="Update Table Configuration", request=TableUpdateSerializer)
    def patch(self, request, table_id):
        if not request.user.is_superuser:
            check_perm = require_permission("tables.update")()
            if not check_perm.has_permission(request, self):
                return Response(
                    {
                        "success": False,
                        "error": {
                            "code": "PERMISSION_DENIED",
                            "message": "Permission 'tables.update' required to edit table configurations.",
                            "status_code": status.HTTP_403_FORBIDDEN,
                        },
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        table = self.get_table(request.user, table_id)
        if not table:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "TABLE_NOT_FOUND",
                        "message": "Table not found in your restaurant organization.",
                        "status_code": status.HTTP_404_NOT_FOUND,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = TableUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        updated_table = TableService.update_table(
            table=table,
            name=serializer.validated_data.get("name"),
            capacity=serializer.validated_data.get("capacity"),
            section=serializer.validated_data.get("section"),
            display_order=serializer.validated_data.get("display_order"),
            is_active=serializer.validated_data.get("is_active"),
        )
        return Response({"success": True, "data": TableSerializer(updated_table).data}, status=status.HTTP_200_OK)

    @extend_schema(summary="Deactivate Restaurant Table")
    def delete(self, request, table_id):
        if not request.user.is_superuser:
            check_perm = require_permission("tables.delete")()
            if not check_perm.has_permission(request, self):
                return Response(
                    {
                        "success": False,
                        "error": {
                            "code": "PERMISSION_DENIED",
                            "message": "Permission 'tables.delete' required to deactivate tables.",
                            "status_code": status.HTTP_403_FORBIDDEN,
                        },
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        table = self.get_table(request.user, table_id)
        if not table:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "TABLE_NOT_FOUND",
                        "message": "Table not found in your restaurant organization.",
                        "status_code": status.HTTP_404_NOT_FOUND,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        deactivated = TableService.deactivate_table(table)
        return Response({"success": True, "data": TableSerializer(deactivated).data}, status=status.HTTP_200_OK)

class TableStatusView(APIView):
    """
    Controlled operational status update (AVAILABLE, OCCUPIED, RESERVED, OUT_OF_SERVICE).
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Change Operational Table Status", request=TableStatusUpdateSerializer)
    def patch(self, request, table_id):
        if not request.user.is_superuser:
            check_status = require_permission("tables.status.manage")()
            check_update = require_permission("tables.update")()
            if not (check_status.has_permission(request, self) or check_update.has_permission(request, self)):
                return Response(
                    {
                        "success": False,
                        "error": {
                            "code": "PERMISSION_DENIED",
                            "message": "Permission 'tables.status.manage' required to change table operational status.",
                            "status_code": status.HTTP_403_FORBIDDEN,
                        },
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        restaurant = RestaurantService.get_user_restaurant(request.user)
        table = RestaurantTable.objects.filter(id=table_id, restaurant=restaurant).first()
        if not table:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "TABLE_NOT_FOUND",
                        "message": "Table not found in your restaurant organization.",
                        "status_code": status.HTTP_404_NOT_FOUND,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = TableStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated_table = TableService.update_table_status(
            table=table, status_value=serializer.validated_data["status"]
        )
        return Response({"success": True, "data": TableSerializer(updated_table).data}, status=status.HTTP_200_OK)
