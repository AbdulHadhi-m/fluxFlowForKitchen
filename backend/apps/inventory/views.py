from django.db.models import Q, F
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from apps.rbac.permissions import require_permission
from apps.restaurants.services import RestaurantService
from apps.inventory.models import InventoryItem, StockMovement, Recipe, RecipeItem
from apps.inventory.services import InventoryService
from apps.inventory.serializers import (
    InventoryItemSerializer,
    CreateInventoryItemSerializer,
    ReceiveStockSerializer,
    AdjustStockSerializer,
    WastageSerializer,
    StockMovementSerializer,
    RecipeSerializer,
)

class InventoryItemListCreateView(APIView):
    """
    List raw material stock or create a new inventory item.
    """
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), require_permission("inventory.update")()]
        return [IsAuthenticated(), require_permission("inventory.view")()]

    @extend_schema(summary="List Inventory Items")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        queryset = InventoryItem.objects.filter(restaurant=restaurant).order_by("name")

        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(sku__icontains=search))

        low_stock = request.query_params.get("low_stock")
        if low_stock and low_stock.lower() in ["true", "1"]:
            queryset = queryset.filter(current_quantity__lte=F("minimum_stock_level"))

        is_active = request.query_params.get("is_active")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() in ["true", "1"])

        serializer = InventoryItemSerializer(queryset, many=True)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)

    @extend_schema(summary="Create Inventory Item", request=CreateInventoryItemSerializer)
    def post(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        serializer = CreateInventoryItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        item = InventoryService.create_item(
            restaurant=restaurant,
            name=data["name"],
            sku=data.get("sku", ""),
            unit=data.get("unit", "kg"),
            minimum_stock_level=data.get("minimum_stock_level", 5),
            cost_per_unit=data.get("cost_per_unit", 0),
            initial_quantity=data.get("initial_quantity", 0),
            user=request.user,
        )

        return Response(
            {"success": True, "data": InventoryItemSerializer(item).data},
            status=status.HTTP_201_CREATED,
        )


class InventoryItemDetailView(APIView):
    """
    Retrieve or edit an inventory item.
    """
    def get_permissions(self):
        if self.request.method in ["PATCH", "PUT"]:
            return [IsAuthenticated(), require_permission("inventory.update")()]
        return [IsAuthenticated(), require_permission("inventory.view")()]

    @extend_schema(summary="Get Inventory Item Detail")
    def get(self, request, item_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        item = InventoryItem.objects.filter(id=item_id, restaurant=restaurant).first()
        if not item:
            return Response(
                {"success": False, "error": {"code": "ITEM_NOT_FOUND", "message": "Inventory item not found.", "status_code": status.HTTP_404_NOT_FOUND}},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"success": True, "data": InventoryItemSerializer(item).data}, status=status.HTTP_200_OK)

    @extend_schema(summary="Update Inventory Item Metadata")
    def patch(self, request, item_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        item = InventoryItem.objects.filter(id=item_id, restaurant=restaurant).first()
        if not item:
            return Response(
                {"success": False, "error": {"code": "ITEM_NOT_FOUND", "message": "Inventory item not found.", "status_code": status.HTTP_404_NOT_FOUND}},
                status=status.HTTP_404_NOT_FOUND,
            )

        for field in ["name", "sku", "minimum_stock_level", "cost_per_unit", "is_active"]:
            if field in request.data:
                setattr(item, field, request.data[field])

        item.save()
        return Response({"success": True, "data": InventoryItemSerializer(item).data}, status=status.HTTP_200_OK)


class InventoryItemReceiveView(APIView):
    """
    Record stock intake / supplier purchase.
    """
    permission_classes = [IsAuthenticated, require_permission("inventory.update")]

    @extend_schema(summary="Receive Stock Intake", request=ReceiveStockSerializer)
    def post(self, request, item_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        item = InventoryItem.objects.filter(id=item_id, restaurant=restaurant).first()
        if not item:
            return Response(
                {"success": False, "error": {"code": "ITEM_NOT_FOUND", "message": "Inventory item not found.", "status_code": status.HTTP_404_NOT_FOUND}},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ReceiveStockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        movement = InventoryService.receive_stock(
            restaurant=restaurant,
            item=item,
            quantity=data["quantity"],
            unit=data["unit"],
            reference=data.get("reference", ""),
            reason=data.get("reason", ""),
            user=request.user,
        )

        item.refresh_from_db()
        return Response(
            {
                "success": True,
                "data": {
                    "movement": StockMovementSerializer(movement).data,
                    "item": InventoryItemSerializer(item).data,
                },
            },
            status=status.HTTP_200_OK,
        )


class InventoryItemAdjustView(APIView):
    """
    Record authorized positive or negative stock adjustment.
    """
    permission_classes = [IsAuthenticated, require_permission("inventory.update")]

    @extend_schema(summary="Adjust Stock Balance", request=AdjustStockSerializer)
    def post(self, request, item_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        item = InventoryItem.objects.filter(id=item_id, restaurant=restaurant).first()
        if not item:
            return Response(
                {"success": False, "error": {"code": "ITEM_NOT_FOUND", "message": "Inventory item not found.", "status_code": status.HTTP_404_NOT_FOUND}},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AdjustStockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        movement = InventoryService.adjust_stock(
            restaurant=restaurant,
            item=item,
            delta_quantity=data["delta_quantity"],
            reason=data["reason"],
            user=request.user,
        )

        item.refresh_from_db()
        return Response(
            {
                "success": True,
                "data": {
                    "movement": StockMovementSerializer(movement).data,
                    "item": InventoryItemSerializer(item).data,
                },
            },
            status=status.HTTP_200_OK,
        )


class InventoryItemWastageView(APIView):
    """
    Record spoilage or preparation wastage.
    """
    permission_classes = [IsAuthenticated, require_permission("inventory.update")]

    @extend_schema(summary="Record Wastage / Spoilage", request=WastageSerializer)
    def post(self, request, item_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        item = InventoryItem.objects.filter(id=item_id, restaurant=restaurant).first()
        if not item:
            return Response(
                {"success": False, "error": {"code": "ITEM_NOT_FOUND", "message": "Inventory item not found.", "status_code": status.HTTP_404_NOT_FOUND}},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = WastageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        movement = InventoryService.record_wastage(
            restaurant=restaurant,
            item=item,
            quantity=data["quantity"],
            reason=data.get("reason", "Spoiled / Expired"),
            user=request.user,
        )

        item.refresh_from_db()
        return Response(
            {
                "success": True,
                "data": {
                    "movement": StockMovementSerializer(movement).data,
                    "item": InventoryItemSerializer(item).data,
                },
            },
            status=status.HTTP_200_OK,
        )


class StockMovementListView(APIView):
    """
    List immutable stock movement audit ledger for restaurant.
    """
    permission_classes = [IsAuthenticated, require_permission("inventory.view")]

    @extend_schema(summary="List Stock Movements")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        queryset = (
            StockMovement.objects.filter(restaurant=restaurant)
            .select_related("item", "created_by")
            .order_by("-created_at")
        )

        item_id = request.query_params.get("item_id")
        if item_id:
            queryset = queryset.filter(item_id=item_id)

        movement_type = request.query_params.get("movement_type")
        if movement_type:
            queryset = queryset.filter(movement_type=movement_type)

        serializer = StockMovementSerializer(queryset, many=True)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)


class RecipeListCreateView(APIView):
    """
    List or configure menu item recipes (BOM).
    """
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), require_permission("inventory.manage")()]
        return [IsAuthenticated(), require_permission("inventory.view")()]

    @extend_schema(summary="List Recipes")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        recipes = Recipe.objects.filter(restaurant=restaurant).prefetch_related("ingredients__inventory_item", "menu_item")
        return Response({"success": True, "data": RecipeSerializer(recipes, many=True).data}, status=status.HTTP_200_OK)

    @extend_schema(summary="Create Recipe with Ingredients")
    def post(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        menu_item_id = request.data.get("menu_item_id")
        ingredients_data = request.data.get("ingredients", [])

        from apps.menu.models import MenuItem
        menu_item = MenuItem.objects.filter(id=menu_item_id, restaurant=restaurant).first()
        if not menu_item:
            return Response(
                {"success": False, "error": {"code": "MENU_ITEM_NOT_FOUND", "message": "Menu item not found.", "status_code": status.HTTP_404_NOT_FOUND}},
                status=status.HTTP_404_NOT_FOUND,
            )

        recipe, _ = Recipe.objects.get_or_create(
            restaurant=restaurant,
            menu_item=menu_item,
            defaults={"yield_quantity": request.data.get("yield_quantity", 1), "instructions": request.data.get("instructions", "")},
        )

        # Sync ingredients
        RecipeItem.objects.filter(recipe=recipe).delete()
        for ing in ingredients_data:
            inv_item = InventoryItem.objects.filter(id=ing["inventory_item_id"], restaurant=restaurant).first()
            if inv_item:
                RecipeItem.objects.create(
                    recipe=recipe,
                    inventory_item=inv_item,
                    quantity=Decimal(str(ing["quantity"])),
                    unit=ing.get("unit", inv_item.unit),
                )

        recipe.refresh_from_db()
        return Response({"success": True, "data": RecipeSerializer(recipe).data}, status=status.HTTP_201_CREATED)
