import uuid
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.restaurants.models import Restaurant
from apps.restaurants.services import RestaurantService
from apps.rbac.models import TenantMembership
from apps.rbac.services import RBACService
from apps.menu.models import MenuItem
from apps.inventory.models import (
    InventoryItem,
    InventoryBatch,
    StockMovement,
    Recipe,
    RecipeItem,
    StockCount,
    StockCountItem,
    InventoryTransfer,
    InventoryTransferItem,
    WasteRecord,
    UnitOfMeasure,
    ItemType,
    StorageLocation,
)
from apps.inventory.serializers import (
    InventoryItemSerializer,
    CreateInventoryItemSerializer,
    ReceiveStockSerializer,
    AdjustStockSerializer,
    InventoryBatchSerializer,
    StockMovementSerializer,
    RecipeSerializer,
    RecipeCreateUpdateSerializer,
    StockCountSerializer,
    StockCountItemUpdateEntrySerializer,
    InventoryTransferSerializer,
    WasteRecordSerializer,
    CreateWasteSerializer,
)
from apps.inventory.services import (
    InventoryService,
    RecipeService,
    StockCountService,
    TransferService,
    FoodCostAnalyticsService,
    ReorderService,
    UnitConverter,
    quantize_stock,
)


class TenantInventoryBaseViewSet:
    def get_restaurant(self) -> Restaurant:
        restaurant = getattr(self.request, "restaurant", None)
        if restaurant:
            return restaurant

        rest_id = (
            self.request.META.get("HTTP_X_RESTAURANT_ID")
            or self.request.META.get("HTTP_X_TENANT_ID")
            or getattr(self.request, "tenant_id", None)
        )
        if rest_id:
            try:
                return Restaurant.objects.get(id=rest_id)
            except (Restaurant.DoesNotExist, ValueError):
                pass

        membership = TenantMembership.objects.filter(user=self.request.user).first()
        if membership and membership.tenant_id:
            try:
                return Restaurant.objects.get(id=membership.tenant_id)
            except Restaurant.DoesNotExist:
                pass

        raise ValidationError("User is not associated with an active restaurant.")

    def check_user_permission(self, permission_code: str):
        if self.request.user.is_superuser:
            return
        restaurant = self.get_restaurant()
        perms = RBACService.get_effective_permissions(user=self.request.user, tenant_id=restaurant.id)
        if permission_code not in perms:
            raise PermissionDenied(f"Missing required permission: {permission_code}")


class InventoryItemViewSet(TenantInventoryBaseViewSet, viewsets.ModelViewSet):
    """
    CRUD and operational control for master inventory items and ingredients.
    """
    serializer_class = InventoryItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["item_type", "storage_location", "storage_condition", "is_active", "track_expiry", "track_batch"]
    search_fields = ["name", "sku"]
    ordering_fields = ["name", "current_quantity", "weighted_average_cost", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        restaurant = self.get_restaurant()
        return InventoryItem.objects.filter(restaurant=restaurant)

    def create(self, request, *args, **kwargs):
        self.check_user_permission("inventory.manage")
        restaurant = self.get_restaurant()
        serializer = CreateInventoryItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        item = InventoryService.create_item(
            restaurant=restaurant,
            name=serializer.validated_data["name"],
            sku=serializer.validated_data.get("sku", ""),
            item_type=serializer.validated_data.get("item_type", ItemType.RAW_INGREDIENT),
            unit=serializer.validated_data.get("unit", UnitOfMeasure.KG),
            purchase_unit=serializer.validated_data.get("purchase_unit", UnitOfMeasure.KG),
            purchase_to_stock_factor=serializer.validated_data.get("purchase_to_stock_factor", Decimal("1.0000")),
            storage_location=serializer.validated_data.get("storage_location", StorageLocation.MAIN_STORE),
            storage_condition=serializer.validated_data.get("storage_condition", "AMBIENT"),
            minimum_stock_level=serializer.validated_data.get("minimum_stock_level", Decimal("5.000")),
            par_level=serializer.validated_data.get("par_level", Decimal("10.000")),
            max_stock_level=serializer.validated_data.get("max_stock_level", Decimal("100.000")),
            cost_per_unit=serializer.validated_data.get("cost_per_unit", Decimal("0.00")),
            initial_quantity=serializer.validated_data.get("initial_quantity", Decimal("0.000")),
            track_expiry=serializer.validated_data.get("track_expiry", False),
            track_batch=serializer.validated_data.get("track_batch", False),
            yield_percentage=serializer.validated_data.get("yield_percentage", Decimal("100.00")),
            user=request.user,
        )
        return Response(InventoryItemSerializer(item).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="receive")
    def receive_stock(self, request, pk=None):
        self.check_user_permission("inventory.update")
        restaurant = self.get_restaurant()
        item = self.get_object()

        serializer = ReceiveStockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        movement = InventoryService.receive_stock(
            restaurant=restaurant,
            item=item,
            quantity=serializer.validated_data["quantity"],
            unit=serializer.validated_data["unit"],
            unit_cost=serializer.validated_data.get("unit_cost", Decimal("0.00")),
            batch_number=serializer.validated_data.get("batch_number", ""),
            expiry_date=serializer.validated_data.get("expiry_date", None),
            supplier_name=serializer.validated_data.get("supplier_name", ""),
            reference=serializer.validated_data.get("reference", ""),
            reason=serializer.validated_data.get("reason", ""),
            user=request.user,
        )
        item.refresh_from_db()
        return Response({
            "success": True,
            "movement": StockMovementSerializer(movement).data,
            "item": InventoryItemSerializer(item).data,
        })

    @action(detail=True, methods=["post"], url_path="adjust")
    def adjust_stock(self, request, pk=None):
        self.check_user_permission("inventory.adjustment.create")
        restaurant = self.get_restaurant()
        item = self.get_object()

        serializer = AdjustStockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        movement = InventoryService.adjust_stock(
            restaurant=restaurant,
            item=item,
            delta_quantity=serializer.validated_data["delta_quantity"],
            reason=serializer.validated_data["reason"],
            user=request.user,
        )
        item.refresh_from_db()
        return Response({
            "success": True,
            "movement": StockMovementSerializer(movement).data,
            "item": InventoryItemSerializer(item).data,
        })

    @action(detail=True, methods=["get"], url_path="movements")
    def list_movements(self, request, pk=None):
        self.check_user_permission("inventory.view")
        item = self.get_object()
        movements = StockMovement.objects.filter(item=item).order_by("-created_at")[:50]
        return Response(StockMovementSerializer(movements, many=True).data)

    @action(detail=True, methods=["get"], url_path="batches")
    def list_batches(self, request, pk=None):
        self.check_user_permission("inventory.view")
        item = self.get_object()
        batches = InventoryBatch.objects.filter(item=item).order_by("expiry_date", "-created_at")
        return Response(InventoryBatchSerializer(batches, many=True).data)

    @action(detail=True, methods=["post"], url_path="impact-analysis")
    def impact_analysis(self, request, pk=None):
        self.check_user_permission("inventory.cost.view")
        item = self.get_object()
        new_cost = Decimal(str(request.data.get("new_unit_cost", item.cost_per_unit)))
        analysis = RecipeService.analyze_cost_change_impact(item, new_cost)
        return Response(analysis)


class InventoryBatchViewSet(TenantInventoryBaseViewSet, viewsets.ReadOnlyModelViewSet):
    """
    Active batch / lot monitoring and expiry tracking.
    """
    serializer_class = InventoryBatchSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["batch_status", "storage_location"]
    search_fields = ["batch_number", "item__name", "supplier_name"]
    ordering_fields = ["expiry_date", "current_quantity", "created_at"]
    ordering = ["expiry_date"]

    def get_queryset(self):
        self.check_user_permission("inventory.view")
        restaurant = self.get_restaurant()
        return InventoryBatch.objects.filter(restaurant=restaurant).select_related("item")


class StockMovementViewSet(TenantInventoryBaseViewSet, viewsets.ReadOnlyModelViewSet):
    """
    Full immutable inventory audit transaction ledger.
    """
    serializer_class = StockMovementSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["movement_type", "reference_type"]
    search_fields = ["item__name", "reference_id", "reason"]
    ordering_fields = ["created_at", "quantity"]
    ordering = ["-created_at"]

    def get_queryset(self):
        self.check_user_permission("inventory.view")
        restaurant = self.get_restaurant()
        return StockMovement.objects.filter(restaurant=restaurant).select_related("item", "created_by")


class RecipeViewSet(TenantInventoryBaseViewSet, viewsets.ModelViewSet):
    """
    Recipe BOM management, recursive sub-recipes, version control, and food costing.
    """
    serializer_class = RecipeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "recipe_type"]
    search_fields = ["name", "menu_item__name"]
    ordering_fields = ["version", "created_at", "name"]
    ordering = ["-created_at"]

    def get_queryset(self):
        self.check_user_permission("inventory.recipe.view")
        restaurant = self.get_restaurant()
        return Recipe.objects.filter(restaurant=restaurant).select_related("menu_item").prefetch_related(
            "ingredients__inventory_item", "ingredients__sub_recipe"
        )

    def create(self, request, *args, **kwargs):
        self.check_user_permission("inventory.recipe.create")
        restaurant = self.get_restaurant()
        serializer = RecipeCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        menu_item_id = data.get("menu_item_id")
        menu_item = MenuItem.objects.filter(id=menu_item_id, restaurant=restaurant).first() if menu_item_id else None

        # Next version number if same menu item or name exists
        next_ver = 1
        existing = Recipe.objects.filter(restaurant=restaurant)
        if menu_item:
            existing = existing.filter(menu_item=menu_item)
        elif data.get("name"):
            existing = existing.filter(name=data["name"])
        latest = existing.order_by("-version").first()
        if latest:
            next_ver = latest.version + 1

        with transaction.atomic():
            if menu_item:
                Recipe.objects.filter(
                    menu_item=menu_item,
                    status=Recipe.RecipeStatus.PUBLISHED,
                ).update(
                    status=Recipe.RecipeStatus.ARCHIVED,
                    effective_until=timezone.now(),
                )

            recipe = Recipe.objects.create(
                restaurant=restaurant,
                name=data.get("name", "") or (menu_item.name if menu_item else ""),
                version=next_ver,
                status=Recipe.RecipeStatus.PUBLISHED,
                recipe_type=data.get("recipe_type", Recipe.RecipeType.MENU_ITEM_RECIPE),
                menu_item=menu_item,
                output_quantity=data.get("output_quantity", Decimal("1.000")),
                output_unit=data.get("output_unit", UnitOfMeasure.PORTION),
                yield_percentage=data.get("yield_percentage", Decimal("100.00")),
                preparation_loss_pct=data.get("preparation_loss_pct", Decimal("0.00")),
                cooking_loss_pct=data.get("cooking_loss_pct", Decimal("0.00")),
                instructions=data.get("instructions", ""),
                notes=data.get("notes", ""),
                effective_from=timezone.now(),
                created_by=request.user,
            )

            for ing_data in data.get("ingredients", []):
                inv_id = ing_data.get("inventory_item_id")
                sub_id = ing_data.get("sub_recipe_id")

                if sub_id:
                    RecipeService.check_circular_dependencies(str(recipe.id), str(sub_id))

                RecipeItem.objects.create(
                    recipe=recipe,
                    inventory_item_id=inv_id,
                    sub_recipe_id=sub_id,
                    quantity=ing_data["quantity"],
                    unit=ing_data["unit"],
                    preparation_notes=ing_data.get("preparation_notes", ""),
                )

            return Response(RecipeSerializer(recipe).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="publish")
    def publish(self, request, pk=None):
        self.check_user_permission("inventory.recipe.publish")
        recipe = self.get_object()
        published = RecipeService.publish_recipe(recipe, user=request.user)
        return Response(RecipeSerializer(published).data)

    @action(detail=True, methods=["post"], url_path="archive")
    def archive(self, request, pk=None):
        self.check_user_permission("inventory.recipe.archive")
        recipe = self.get_object()
        recipe.status = Recipe.RecipeStatus.ARCHIVED
        recipe.effective_until = timezone.now()
        recipe.save(update_fields=["status", "effective_until", "updated_at"])
        return Response(RecipeSerializer(recipe).data)

    @action(detail=False, methods=["get"], url_path="menu-item-cost/(?P<menu_item_id>[^/.]+)")
    def menu_item_cost(self, request, menu_item_id=None):
        self.check_user_permission("inventory.cost.view")
        restaurant = self.get_restaurant()
        try:
            menu_item = MenuItem.objects.get(id=menu_item_id, restaurant=restaurant)
        except MenuItem.DoesNotExist:
            raise ValidationError("Menu item not found.")
        analysis = RecipeService.get_menu_item_food_cost_analysis(menu_item)
        return Response(analysis)


class StockCountViewSet(TenantInventoryBaseViewSet, viewsets.ModelViewSet):
    """
    Physical stock audits, variance reconciliation, and manager approvals.
    """
    serializer_class = StockCountSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "location", "category"]
    search_fields = ["count_number", "notes"]
    ordering_fields = ["created_at", "counted_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        self.check_user_permission("inventory.view")
        restaurant = self.get_restaurant()
        return StockCount.objects.filter(restaurant=restaurant).prefetch_related("items__item")

    def create(self, request, *args, **kwargs):
        self.check_user_permission("inventory.stock_count.create")
        restaurant = self.get_restaurant()
        location = request.data.get("location", "ALL")
        category = request.data.get("category", "ALL")
        notes = request.data.get("notes", "")

        stock_count = StockCountService.create_stock_count(
            restaurant=restaurant,
            location=location,
            category=category,
            notes=notes,
            user=request.user,
        )
        return Response(StockCountSerializer(stock_count).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post", "patch"], url_path="update-items")
    def update_items(self, request, pk=None):
        self.check_user_permission("inventory.stock_count.create")
        stock_count = self.get_object()
        if stock_count.status not in [StockCount.CountStatus.DRAFT, StockCount.CountStatus.IN_PROGRESS]:
            raise ValidationError("Cannot update counts on an already submitted or approved session.")

        items_data = request.data.get("items", [])
        serializer = StockCountItemUpdateEntrySerializer(data=items_data, many=True)
        serializer.is_valid(raise_exception=True)

        updated = StockCountService.update_count_items(stock_count, serializer.validated_data)
        return Response(StockCountSerializer(updated).data)

    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, pk=None):
        self.check_user_permission("inventory.stock_count.create")
        stock_count = self.get_object()
        submitted = StockCountService.submit_stock_count(stock_count, user=request.user)
        return Response(StockCountSerializer(submitted).data)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        self.check_user_permission("inventory.stock_count.approve")
        stock_count = self.get_object()
        if stock_count.status == StockCount.CountStatus.APPROVED:
            raise ValidationError("Stock count is already approved and reconciled.")
        approved = StockCountService.approve_and_reconcile_count(stock_count, manager_user=request.user)
        return Response(StockCountSerializer(approved).data)


class InventoryTransferViewSet(TenantInventoryBaseViewSet, viewsets.ModelViewSet):
    """
    Inter-station / inter-location stock transfer coordination.
    """
    serializer_class = InventoryTransferSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "source_location", "destination_location"]
    search_fields = ["transfer_number", "notes"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        self.check_user_permission("inventory.transfer.manage")
        restaurant = self.get_restaurant()
        return InventoryTransfer.objects.filter(restaurant=restaurant).prefetch_related("items__item")

    def create(self, request, *args, **kwargs):
        self.check_user_permission("inventory.transfer.manage")
        restaurant = self.get_restaurant()
        source = request.data.get("source_location")
        dest = request.data.get("destination_location")
        items_data = request.data.get("items", [])
        notes = request.data.get("notes", "")

        if not source or not dest or not items_data:
            raise ValidationError("source_location, destination_location, and items list are required.")

        transfer = TransferService.create_transfer(
            restaurant=restaurant,
            source_location=source,
            destination_location=dest,
            items_data=items_data,
            notes=notes,
            user=request.user,
        )
        return Response(InventoryTransferSerializer(transfer).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        self.check_user_permission("inventory.transfer.manage")
        transfer = self.get_object()
        approved = TransferService.approve_and_dispatch(transfer, user=request.user)
        return Response(InventoryTransferSerializer(approved).data)

    @action(detail=True, methods=["post"], url_path="receive")
    def receive(self, request, pk=None):
        self.check_user_permission("inventory.transfer.manage")
        transfer = self.get_object()
        received = TransferService.receive_and_complete(transfer, user=request.user)
        return Response(InventoryTransferSerializer(received).data)


class WasteRecordViewSet(TenantInventoryBaseViewSet, viewsets.ModelViewSet):
    """
    Wastage, spoilage, and preparation loss recording.
    """
    serializer_class = WasteRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["reason", "location"]
    search_fields = ["item__name", "notes"]
    ordering_fields = ["created_at", "total_loss_cost"]
    ordering = ["-created_at"]

    def get_queryset(self):
        self.check_user_permission("inventory.view")
        restaurant = self.get_restaurant()
        return WasteRecord.objects.filter(restaurant=restaurant).select_related("item", "batch", "reported_by")

    def create(self, request, *args, **kwargs):
        self.check_user_permission("inventory.waste.create")
        restaurant = self.get_restaurant()
        serializer = CreateWasteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        item = InventoryItem.objects.get(id=data["item_id"], restaurant=restaurant)
        batch = InventoryBatch.objects.filter(id=data["batch_id"]).first() if data.get("batch_id") else None

        waste = InventoryService.record_wastage(
            restaurant=restaurant,
            item=item,
            quantity=data["quantity"],
            reason=data.get("reason", WasteRecord.WasteReason.SPOILAGE),
            batch=batch,
            location=data.get("location", StorageLocation.KITCHEN),
            notes=data.get("notes", ""),
            user=request.user,
        )
        return Response(WasteRecordSerializer(waste).data, status=status.HTTP_201_CREATED)


class FoodCostAnalyticsViewSet(TenantInventoryBaseViewSet, viewsets.ViewSet):
    """
    Inventory valuation, theoretical vs actual food costing, and replenishment suggestions.
    """
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=["get"], url_path="valuation")
    def valuation(self, request):
        self.check_user_permission("inventory.cost.view")
        restaurant = self.get_restaurant()
        data = FoodCostAnalyticsService.get_inventory_valuation(restaurant)
        return Response(data)

    @action(detail=False, methods=["get"], url_path="variance")
    def variance(self, request):
        self.check_user_permission("inventory.cost.view")
        restaurant = self.get_restaurant()

        # Dates default to current 30 days
        end_date = timezone.now()
        start_date = end_date - timezone.timedelta(days=30)
        if request.query_params.get("start_date"):
            start_date = request.query_params.get("start_date")
        if request.query_params.get("end_date"):
            end_date = request.query_params.get("end_date")

        variance_data = FoodCostAnalyticsService.get_variance_analysis(restaurant, start_date, end_date)
        return Response(variance_data)

    @action(detail=False, methods=["get"], url_path="reorder-suggestions")
    def reorder_suggestions(self, request):
        self.check_user_permission("inventory.view")
        restaurant = self.get_restaurant()
        suggestions = ReorderService.get_reorder_suggestions(restaurant)
        return Response(suggestions)
