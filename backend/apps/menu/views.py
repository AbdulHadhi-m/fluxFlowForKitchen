from django.db.models import Count, Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse
from apps.core.pagination import FluxiflowPagination
from apps.rbac.permissions import require_permission
from apps.restaurants.services import RestaurantService
from apps.menu.models import MenuCategory, MenuItem
from apps.menu.services import MenuService
from apps.menu.serializers import (
    MenuCategorySerializer,
    MenuCategoryCreateSerializer,
    MenuCategoryUpdateSerializer,
    MenuItemSerializer,
    MenuItemCreateSerializer,
    MenuItemUpdateSerializer,
    MenuItemAvailabilitySerializer,
)

# ------------------------------------------------------------------------------
# Category Views
# ------------------------------------------------------------------------------

class CategoryListCreateView(APIView):
    """
    List and create menu categories within the current restaurant organization.
    """
    permission_classes = [IsAuthenticated, require_permission("menu.view")]

    @extend_schema(summary="List Menu Categories for Current Restaurant")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        queryset = MenuCategory.objects.filter(restaurant=restaurant).annotate(
            item_count=Count("items", filter=Q(items__is_active=True))
        )

        active_param = request.query_params.get("is_active")
        if active_param is not None:
            queryset = queryset.filter(is_active=active_param.lower() in ["true", "1"])

        serializer = MenuCategorySerializer(queryset, many=True)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)

    @extend_schema(summary="Create New Menu Category", request=MenuCategoryCreateSerializer)
    def post(self, request):
        if not request.user.is_superuser:
            check_perm = require_permission("menu.create")()
            if not check_perm.has_permission(request, self):
                return Response(
                    {
                        "success": False,
                        "error": {
                            "code": "PERMISSION_DENIED",
                            "message": "Permission 'menu.create' required to create categories.",
                            "status_code": status.HTTP_403_FORBIDDEN,
                        },
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        restaurant = RestaurantService.get_user_restaurant(request.user)
        serializer = MenuCategoryCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        category = MenuService.create_category(
            restaurant=restaurant,
            name=serializer.validated_data["name"],
            description=serializer.validated_data.get("description", ""),
            display_order=serializer.validated_data.get("display_order", 0),
            is_active=serializer.validated_data.get("is_active", True),
        )

        return Response(
            {"success": True, "data": MenuCategorySerializer(category).data},
            status=status.HTTP_201_CREATED,
        )

class CategoryDetailUpdateView(APIView):
    """
    Retrieve, update, and deactivate an individual menu category.
    """
    permission_classes = [IsAuthenticated, require_permission("menu.view")]

    def get_category(self, user, category_id) -> MenuCategory:
        restaurant = RestaurantService.get_user_restaurant(user)
        category = MenuCategory.objects.filter(id=category_id, restaurant=restaurant).annotate(
            item_count=Count("items", filter=Q(items__is_active=True))
        ).first()
        return category

    @extend_schema(summary="Get Menu Category Details")
    def get(self, request, category_id):
        category = self.get_category(request.user, category_id)
        if not category:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "CATEGORY_NOT_FOUND",
                        "message": "Category not found in your restaurant organization.",
                        "status_code": status.HTTP_404_NOT_FOUND,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"success": True, "data": MenuCategorySerializer(category).data}, status=status.HTTP_200_OK)

    @extend_schema(summary="Update Menu Category", request=MenuCategoryUpdateSerializer)
    def patch(self, request, category_id):
        if not request.user.is_superuser:
            check_perm = require_permission("menu.update")()
            if not check_perm.has_permission(request, self):
                return Response(
                    {
                        "success": False,
                        "error": {
                            "code": "PERMISSION_DENIED",
                            "message": "Permission 'menu.update' required to edit categories.",
                            "status_code": status.HTTP_403_FORBIDDEN,
                        },
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        category = self.get_category(request.user, category_id)
        if not category:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "CATEGORY_NOT_FOUND",
                        "message": "Category not found in your restaurant organization.",
                        "status_code": status.HTTP_404_NOT_FOUND,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = MenuCategoryUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        updated_category = MenuService.update_category(
            category=category,
            name=serializer.validated_data.get("name"),
            description=serializer.validated_data.get("description"),
            display_order=serializer.validated_data.get("display_order"),
            is_active=serializer.validated_data.get("is_active"),
        )
        return Response({"success": True, "data": MenuCategorySerializer(updated_category).data}, status=status.HTTP_200_OK)

    @extend_schema(summary="Deactivate Menu Category")
    def delete(self, request, category_id):
        if not request.user.is_superuser:
            check_perm = require_permission("menu.delete")()
            if not check_perm.has_permission(request, self):
                return Response(
                    {
                        "success": False,
                        "error": {
                            "code": "PERMISSION_DENIED",
                            "message": "Permission 'menu.delete' required to deactivate categories.",
                            "status_code": status.HTTP_403_FORBIDDEN,
                        },
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        category = self.get_category(request.user, category_id)
        if not category:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "CATEGORY_NOT_FOUND",
                        "message": "Category not found in your restaurant organization.",
                        "status_code": status.HTTP_404_NOT_FOUND,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        deactivated = MenuService.deactivate_category(category)
        return Response({"success": True, "data": MenuCategorySerializer(deactivated).data}, status=status.HTTP_200_OK)

# ------------------------------------------------------------------------------
# Menu Item Views
# ------------------------------------------------------------------------------

class MenuItemListCreateView(APIView):
    """
    List and create menu items with search, category filtering, and availability toggles.
    """
    permission_classes = [IsAuthenticated, require_permission("menu.view")]

    @extend_schema(summary="List Menu Items for Current Restaurant")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        queryset = MenuItem.objects.filter(restaurant=restaurant).select_related("category")

        category_param = request.query_params.get("category_id")
        if category_param:
            queryset = queryset.filter(category_id=category_param)

        available_param = request.query_params.get("is_available")
        if available_param is not None:
            queryset = queryset.filter(is_available=available_param.lower() in ["true", "1"])

        active_param = request.query_params.get("is_active")
        if active_param is not None:
            queryset = queryset.filter(is_active=active_param.lower() in ["true", "1"])

        search_query = request.query_params.get("search", "").strip()
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query)
                | Q(description__icontains=search_query)
                | Q(category__name__icontains=search_query)
            )

        paginator = FluxiflowPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = MenuItemSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(summary="Create New Menu Item", request=MenuItemCreateSerializer)
    def post(self, request):
        if not request.user.is_superuser:
            check_perm = require_permission("menu.create")()
            if not check_perm.has_permission(request, self):
                return Response(
                    {
                        "success": False,
                        "error": {
                            "code": "PERMISSION_DENIED",
                            "message": "Permission 'menu.create' required to add menu items.",
                            "status_code": status.HTTP_403_FORBIDDEN,
                        },
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        restaurant = RestaurantService.get_user_restaurant(request.user)
        serializer = MenuItemCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        item = MenuService.create_menu_item(
            restaurant=restaurant,
            category_id=serializer.validated_data["category_id"],
            name=serializer.validated_data["name"],
            price=serializer.validated_data["price"],
            description=serializer.validated_data.get("description", ""),
            is_available=serializer.validated_data.get("is_available", True),
            is_active=serializer.validated_data.get("is_active", True),
            display_order=serializer.validated_data.get("display_order", 0),
        )

        return Response(
            {"success": True, "data": MenuItemSerializer(item).data},
            status=status.HTTP_201_CREATED,
        )

class MenuItemDetailUpdateView(APIView):
    """
    Retrieve and update individual menu item.
    """
    permission_classes = [IsAuthenticated, require_permission("menu.view")]

    def get_item(self, user, item_id) -> MenuItem:
        restaurant = RestaurantService.get_user_restaurant(user)
        return MenuItem.objects.filter(id=item_id, restaurant=restaurant).select_related("category").first()

    @extend_schema(summary="Get Menu Item Details")
    def get(self, request, item_id):
        item = self.get_item(request.user, item_id)
        if not item:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "ITEM_NOT_FOUND",
                        "message": "Menu item not found in your restaurant organization.",
                        "status_code": status.HTTP_404_NOT_FOUND,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"success": True, "data": MenuItemSerializer(item).data}, status=status.HTTP_200_OK)

    @extend_schema(summary="Update Menu Item", request=MenuItemUpdateSerializer)
    def patch(self, request, item_id):
        if not request.user.is_superuser:
            check_perm = require_permission("menu.update")()
            if not check_perm.has_permission(request, self):
                return Response(
                    {
                        "success": False,
                        "error": {
                            "code": "PERMISSION_DENIED",
                            "message": "Permission 'menu.update' required to edit menu items.",
                            "status_code": status.HTTP_403_FORBIDDEN,
                        },
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        item = self.get_item(request.user, item_id)
        if not item:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "ITEM_NOT_FOUND",
                        "message": "Menu item not found in your restaurant organization.",
                        "status_code": status.HTTP_404_NOT_FOUND,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = MenuItemUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        updated_item = MenuService.update_menu_item(
            item=item,
            category_id=serializer.validated_data.get("category_id"),
            name=serializer.validated_data.get("name"),
            price=serializer.validated_data.get("price"),
            description=serializer.validated_data.get("description"),
            is_available=serializer.validated_data.get("is_available"),
            is_active=serializer.validated_data.get("is_active"),
            display_order=serializer.validated_data.get("display_order"),
        )
        return Response({"success": True, "data": MenuItemSerializer(updated_item).data}, status=status.HTTP_200_OK)

class MenuItemAvailabilityView(APIView):
    """
    Fast-action availability toggle (In Stock ↔ 86'd) for live floor and kitchen operations.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Toggle Menu Item Availability", request=MenuItemAvailabilitySerializer)
    def patch(self, request, item_id):
        # Permitted for menu.availability.manage or menu.update
        if not request.user.is_superuser:
            check_avail = require_permission("menu.availability.manage")()
            check_update = require_permission("menu.update")()
            if not (check_avail.has_permission(request, self) or check_update.has_permission(request, self)):
                return Response(
                    {
                        "success": False,
                        "error": {
                            "code": "PERMISSION_DENIED",
                            "message": "Permission 'menu.availability.manage' required to toggle item availability.",
                            "status_code": status.HTTP_403_FORBIDDEN,
                        },
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        restaurant = RestaurantService.get_user_restaurant(request.user)
        item = MenuItem.objects.filter(id=item_id, restaurant=restaurant).first()
        if not item:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "ITEM_NOT_FOUND",
                        "message": "Menu item not found in your restaurant organization.",
                        "status_code": status.HTTP_404_NOT_FOUND,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = MenuItemAvailabilitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated_item = MenuService.set_item_availability(
            item=item, is_available=serializer.validated_data["is_available"]
        )
        return Response({"success": True, "data": MenuItemSerializer(updated_item).data}, status=status.HTTP_200_OK)
