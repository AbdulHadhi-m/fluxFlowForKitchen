from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from apps.core.pagination import FluxiflowPagination
from apps.rbac.permissions import require_permission
from apps.restaurants.services import RestaurantService
from apps.orders.models import Order, OrderItem
from apps.orders.services import OrderService
from apps.orders.serializers import (
    OrderSerializer,
    OrderCreateSerializer,
    OrderItemSerializer,
    OrderItemInputSerializer,
    OrderItemUpdateSerializer,
)

class OrderListCreateView(APIView):
    """
    List and create restaurant customer orders.
    """
    permission_classes = [IsAuthenticated, require_permission("orders.view")]

    @extend_schema(summary="List Orders for Current Restaurant")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        queryset = (
            Order.objects.filter(restaurant=restaurant)
            .select_related("table", "created_by")
            .prefetch_related("items")
            .order_by("-created_at")
        )

        # Status filter
        status_param = request.query_params.get("status")
        if status_param in Order.OrderStatus.values:
            queryset = queryset.filter(status=status_param)

        # Table filter
        table_param = request.query_params.get("table_id")
        if table_param:
            queryset = queryset.filter(table_id=table_param)

        # Search
        search_query = request.query_params.get("search", "").strip()
        if search_query:
            queryset = queryset.filter(
                Q(order_number__icontains=search_query) | Q(notes__icontains=search_query)
            )

        paginator = FluxiflowPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = OrderSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(summary="Create New Restaurant Order", request=OrderCreateSerializer)
    def post(self, request):
        if not request.user.is_superuser:
            check_perm = require_permission("orders.create")()
            if not check_perm.has_permission(request, self):
                return Response(
                    {
                        "success": False,
                        "error": {
                            "code": "PERMISSION_DENIED",
                            "message": "Permission 'orders.create' required to place orders.",
                            "status_code": status.HTTP_403_FORBIDDEN,
                        },
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        restaurant = RestaurantService.get_user_restaurant(request.user)
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order = OrderService.create_order(
            restaurant=restaurant,
            user=request.user,
            items_data=serializer.validated_data["items"],
            table_id=serializer.validated_data.get("table_id"),
            notes=serializer.validated_data.get("notes", ""),
            status_value=serializer.validated_data.get("status", Order.OrderStatus.PLACED),
        )

        return Response(
            {"success": True, "data": OrderSerializer(order).data},
            status=status.HTTP_201_CREATED,
        )

class OrderDetailView(APIView):
    """
    Retrieve full details of a specific order.
    """
    permission_classes = [IsAuthenticated, require_permission("orders.view")]

    def get_order(self, user, order_id) -> Order:
        restaurant = RestaurantService.get_user_restaurant(user)
        return (
            Order.objects.filter(id=order_id, restaurant=restaurant)
            .select_related("table", "created_by")
            .prefetch_related("items")
            .first()
        )

    @extend_schema(summary="Get Order Details")
    def get(self, request, order_id):
        order = self.get_order(request.user, order_id)
        if not order:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "ORDER_NOT_FOUND",
                        "message": "Order not found in your restaurant organization.",
                        "status_code": status.HTTP_404_NOT_FOUND,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"success": True, "data": OrderSerializer(order).data}, status=status.HTTP_200_OK)

class OrderCancelView(APIView):
    """
    Cancel an order and free its table if no other active orders remain.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Cancel Order")
    def post(self, request, order_id):
        if not request.user.is_superuser:
            check_perm = require_permission("orders.cancel")()
            if not check_perm.has_permission(request, self):
                return Response(
                    {
                        "success": False,
                        "error": {
                            "code": "PERMISSION_DENIED",
                            "message": "Permission 'orders.cancel' required to void/cancel orders.",
                            "status_code": status.HTTP_403_FORBIDDEN,
                        },
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        restaurant = RestaurantService.get_user_restaurant(request.user)
        order = Order.objects.filter(id=order_id, restaurant=restaurant).first()
        if not order:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "ORDER_NOT_FOUND",
                        "message": "Order not found in your restaurant organization.",
                        "status_code": status.HTTP_404_NOT_FOUND,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        cancelled_order = OrderService.cancel_order(order)
        return Response({"success": True, "data": OrderSerializer(cancelled_order).data}, status=status.HTTP_200_OK)

class OrderCompleteView(APIView):
    """
    Mark an active PLACED order as COMPLETED.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Complete Order")
    def post(self, request, order_id):
        if not request.user.is_superuser:
            check_perm = require_permission("orders.complete")()
            if not check_perm.has_permission(request, self):
                return Response(
                    {
                        "success": False,
                        "error": {
                            "code": "PERMISSION_DENIED",
                            "message": "Permission 'orders.complete' required to complete orders.",
                            "status_code": status.HTTP_403_FORBIDDEN,
                        },
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        restaurant = RestaurantService.get_user_restaurant(request.user)
        order = Order.objects.filter(id=order_id, restaurant=restaurant).first()
        if not order:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "ORDER_NOT_FOUND",
                        "message": "Order not found in your restaurant organization.",
                        "status_code": status.HTTP_404_NOT_FOUND,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        completed_order = OrderService.complete_order(order)
        return Response({"success": True, "data": OrderSerializer(completed_order).data}, status=status.HTTP_200_OK)

class OrderItemListCreateView(APIView):
    """
    Add a line item to an existing DRAFT order.
    """
    permission_classes = [IsAuthenticated, require_permission("orders.update")]

    @extend_schema(summary="Add Item to Draft Order", request=OrderItemInputSerializer)
    def post(self, request, order_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        order = Order.objects.filter(id=order_id, restaurant=restaurant).first()
        if not order:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "ORDER_NOT_FOUND",
                        "message": "Order not found.",
                        "status_code": status.HTTP_404_NOT_FOUND,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = OrderItemInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        item = OrderService.add_order_item(
            order=order,
            menu_item_id=str(serializer.validated_data["menu_item_id"]),
            quantity=serializer.validated_data.get("quantity", 1),
            notes=serializer.validated_data.get("notes", ""),
        )
        return Response({"success": True, "data": OrderItemSerializer(item).data}, status=status.HTTP_201_CREATED)

class OrderItemDetailView(APIView):
    """
    Update or remove a line item from a DRAFT order.
    """
    permission_classes = [IsAuthenticated, require_permission("orders.update")]

    def get_order_item(self, user, order_id, item_id) -> OrderItem:
        restaurant = RestaurantService.get_user_restaurant(user)
        return OrderItem.objects.filter(
            id=item_id,
            order_id=order_id,
            order__restaurant=restaurant
        ).select_related("order").first()

    @extend_schema(summary="Update Draft Order Item", request=OrderItemUpdateSerializer)
    def patch(self, request, order_id, item_id):
        order_item = self.get_order_item(request.user, order_id, item_id)
        if not order_item:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "ITEM_NOT_FOUND",
                        "message": "Order line item not found.",
                        "status_code": status.HTTP_404_NOT_FOUND,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = OrderItemUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        updated_item = OrderService.update_order_item(
            order_item=order_item,
            quantity=serializer.validated_data.get("quantity"),
            notes=serializer.validated_data.get("notes"),
        )
        return Response({"success": True, "data": OrderItemSerializer(updated_item).data}, status=status.HTTP_200_OK)

    @extend_schema(summary="Remove Draft Order Item")
    def delete(self, request, order_id, item_id):
        order_item = self.get_order_item(request.user, order_id, item_id)
        if not order_item:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "ITEM_NOT_FOUND",
                        "message": "Order line item not found.",
                        "status_code": status.HTTP_404_NOT_FOUND,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        OrderService.remove_order_item(order_item)
        return Response({"success": True, "data": {"message": "Item removed successfully."}}, status=status.HTTP_200_OK)
