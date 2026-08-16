from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from apps.rbac.permissions import require_permission
from apps.restaurants.services import RestaurantService
from apps.procurement.models import Supplier, PurchaseOrder
from apps.procurement.services import SupplierService, PurchaseOrderService
from apps.procurement.serializers import (
    SupplierSerializer,
    CreateSupplierSerializer,
    PurchaseOrderSerializer,
    CreatePurchaseOrderSerializer,
    ReceivePurchaseOrderSerializer,
    PurchaseReceiptSerializer,
)

class SupplierListCreateView(APIView):
    """
    List restaurant suppliers or register a new supplier.
    """
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), require_permission("procurement.manage")()]
        return [IsAuthenticated(), require_permission("procurement.view")()]

    @extend_schema(summary="List Suppliers")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        queryset = Supplier.objects.filter(restaurant=restaurant).order_by("name")

        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(supplier_code__icontains=search)
                | Q(contact_person__icontains=search)
                | Q(phone__icontains=search)
            )

        is_active = request.query_params.get("is_active")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() in ["true", "1"])

        return Response({"success": True, "data": SupplierSerializer(queryset, many=True).data}, status=status.HTTP_200_OK)

    @extend_schema(summary="Create Supplier", request=CreateSupplierSerializer)
    def post(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        serializer = CreateSupplierSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        supplier = SupplierService.create_supplier(
            restaurant=restaurant,
            name=data["name"],
            contact_person=data.get("contact_person", ""),
            email=data.get("email", ""),
            phone=data.get("phone", ""),
            address=data.get("address", ""),
            notes=data.get("notes", ""),
        )

        return Response({"success": True, "data": SupplierSerializer(supplier).data}, status=status.HTTP_201_CREATED)


class SupplierDetailView(APIView):
    """
    Retrieve or edit a supplier.
    """
    def get_permissions(self):
        if self.request.method in ["PATCH", "PUT"]:
            return [IsAuthenticated(), require_permission("procurement.manage")()]
        return [IsAuthenticated(), require_permission("procurement.view")()]

    @extend_schema(summary="Get Supplier Detail")
    def get(self, request, supplier_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        supplier = Supplier.objects.filter(id=supplier_id, restaurant=restaurant).first()
        if not supplier:
            return Response(
                {"success": False, "error": {"code": "SUPPLIER_NOT_FOUND", "message": "Supplier not found.", "status_code": status.HTTP_404_NOT_FOUND}},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"success": True, "data": SupplierSerializer(supplier).data}, status=status.HTTP_200_OK)

    @extend_schema(summary="Update Supplier")
    def patch(self, request, supplier_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        supplier = Supplier.objects.filter(id=supplier_id, restaurant=restaurant).first()
        if not supplier:
            return Response(
                {"success": False, "error": {"code": "SUPPLIER_NOT_FOUND", "message": "Supplier not found.", "status_code": status.HTTP_404_NOT_FOUND}},
                status=status.HTTP_404_NOT_FOUND,
            )

        for field in ["name", "contact_person", "email", "phone", "address", "notes", "is_active"]:
            if field in request.data:
                setattr(supplier, field, request.data[field])

        supplier.save()
        return Response({"success": True, "data": SupplierSerializer(supplier).data}, status=status.HTTP_200_OK)


class PurchaseOrderListCreateView(APIView):
    """
    List purchase orders or create a draft PO.
    """
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), require_permission("procurement.create")()]
        return [IsAuthenticated(), require_permission("procurement.view")()]

    @extend_schema(summary="List Purchase Orders")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        queryset = (
            PurchaseOrder.objects.filter(restaurant=restaurant)
            .select_related("supplier", "created_by", "approved_by")
            .prefetch_related("items", "receipts__items")
            .order_by("-created_at")
        )

        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(po_number__icontains=search)
                | Q(supplier__name__icontains=search)
                | Q(notes__icontains=search)
            )

        status_param = request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)

        supplier_id = request.query_params.get("supplier_id")
        if supplier_id:
            queryset = queryset.filter(supplier_id=supplier_id)

        return Response({"success": True, "data": PurchaseOrderSerializer(queryset, many=True).data}, status=status.HTTP_200_OK)

    @extend_schema(summary="Create Purchase Order Draft", request=CreatePurchaseOrderSerializer)
    def post(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        serializer = CreatePurchaseOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        supplier = Supplier.objects.filter(id=data["supplier_id"], restaurant=restaurant).first()
        if not supplier:
            return Response(
                {"success": False, "error": {"code": "SUPPLIER_NOT_FOUND", "message": "Supplier not found.", "status_code": status.HTTP_404_NOT_FOUND}},
                status=status.HTTP_404_NOT_FOUND,
            )

        po = PurchaseOrderService.create_purchase_order(
            restaurant=restaurant,
            supplier=supplier,
            items_data=data["items"],
            order_date=data.get("order_date"),
            expected_delivery_date=data.get("expected_delivery_date"),
            tax_amount=data.get("tax_amount", 0),
            notes=data.get("notes", ""),
            user=request.user,
        )

        return Response({"success": True, "data": PurchaseOrderSerializer(po).data}, status=status.HTTP_201_CREATED)


class PurchaseOrderDetailView(APIView):
    """
    Retrieve single Purchase Order details with items and physical intake receipts.
    """
    permission_classes = [IsAuthenticated, require_permission("procurement.view")]

    @extend_schema(summary="Get Purchase Order Detail")
    def get(self, request, po_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        po = (
            PurchaseOrder.objects.filter(id=po_id, restaurant=restaurant)
            .select_related("supplier", "created_by", "approved_by")
            .prefetch_related("items", "receipts__items")
            .first()
        )
        if not po:
            return Response(
                {"success": False, "error": {"code": "PO_NOT_FOUND", "message": "Purchase order not found.", "status_code": status.HTTP_404_NOT_FOUND}},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"success": True, "data": PurchaseOrderSerializer(po).data}, status=status.HTTP_200_OK)


class PurchaseOrderSubmitView(APIView):
    """
    Submit a Draft Purchase Order for approval/procurement.
    """
    permission_classes = [IsAuthenticated, require_permission("procurement.manage")]

    @extend_schema(summary="Submit Purchase Order")
    def post(self, request, po_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        po = PurchaseOrder.objects.filter(id=po_id, restaurant=restaurant).first()
        if not po:
            return Response(
                {"success": False, "error": {"code": "PO_NOT_FOUND", "message": "Purchase order not found.", "status_code": status.HTTP_404_NOT_FOUND}},
                status=status.HTTP_404_NOT_FOUND,
            )

        updated_po = PurchaseOrderService.submit_purchase_order(po)
        return Response({"success": True, "data": PurchaseOrderSerializer(updated_po).data}, status=status.HTTP_200_OK)


class PurchaseOrderApproveView(APIView):
    """
    Managerial approval of a submitted Purchase Order.
    """
    permission_classes = [IsAuthenticated, require_permission("procurement.approve")]

    @extend_schema(summary="Approve Purchase Order")
    def post(self, request, po_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        po = PurchaseOrder.objects.filter(id=po_id, restaurant=restaurant).first()
        if not po:
            return Response(
                {"success": False, "error": {"code": "PO_NOT_FOUND", "message": "Purchase order not found.", "status_code": status.HTTP_404_NOT_FOUND}},
                status=status.HTTP_404_NOT_FOUND,
            )

        updated_po = PurchaseOrderService.approve_purchase_order(po, user=request.user)
        return Response({"success": True, "data": PurchaseOrderSerializer(updated_po).data}, status=status.HTTP_200_OK)


class PurchaseOrderCancelView(APIView):
    """
    Cancel an unfulfilled purchase order.
    """
    permission_classes = [IsAuthenticated, require_permission("procurement.manage")]

    @extend_schema(summary="Cancel Purchase Order")
    def post(self, request, po_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        po = PurchaseOrder.objects.filter(id=po_id, restaurant=restaurant).first()
        if not po:
            return Response(
                {"success": False, "error": {"code": "PO_NOT_FOUND", "message": "Purchase order not found.", "status_code": status.HTTP_404_NOT_FOUND}},
                status=status.HTTP_404_NOT_FOUND,
            )

        reason = request.data.get("reason", "Cancelled by user")
        cancelled_po = PurchaseOrderService.cancel_purchase_order(po, reason=reason, user=request.user)
        return Response({"success": True, "data": PurchaseOrderSerializer(cancelled_po).data}, status=status.HTTP_200_OK)


class PurchaseOrderReceiveView(APIView):
    """
    Record physical intake receipt of goods against an approved PO.
    Updates inventory stock and PO status atomically.
    """
    permission_classes = [IsAuthenticated, require_permission("procurement.receive")]

    @extend_schema(summary="Receive Purchase Order Delivery", request=ReceivePurchaseOrderSerializer)
    def post(self, request, po_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        po = PurchaseOrder.objects.filter(id=po_id, restaurant=restaurant).first()
        if not po:
            return Response(
                {"success": False, "error": {"code": "PO_NOT_FOUND", "message": "Purchase order not found.", "status_code": status.HTTP_404_NOT_FOUND}},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ReceivePurchaseOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        receipt = PurchaseOrderService.receive_purchase_order(
            restaurant=restaurant,
            po=po,
            items_received_data=data["items"],
            idempotency_key=data.get("idempotency_key", ""),
            notes=data.get("notes", ""),
            user=request.user,
        )

        po.refresh_from_db()
        return Response(
            {
                "success": True,
                "data": {
                    "receipt": PurchaseReceiptSerializer(receipt).data,
                    "purchase_order": PurchaseOrderSerializer(po).data,
                },
            },
            status=status.HTTP_200_OK,
        )
