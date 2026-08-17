from decimal import Decimal
from django.db.models import Q, Sum, Avg, Count
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from apps.rbac.permissions import require_permission
from apps.restaurants.services import RestaurantService
from apps.inventory.models import InventoryItem
from apps.procurement.models import (
    Supplier,
    SupplierContact,
    SupplierItem,
    SupplierPriceHistory,
    PurchaseRequisition,
    PurchaseRequisitionItem,
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseReceipt,
    PurchaseReturn,
    SupplierCredit,
    SupplierInvoice,
    ProcurementBudget,
)
from apps.procurement.services import (
    SupplierService,
    PurchaseRequisitionService,
    PurchaseOrderService,
    PurchaseReturnService,
    SupplierInvoiceMatchService,
    ProcurementPlanningService,
    ProcurementBudgetService,
)
from apps.procurement.serializers import (
    SupplierSerializer,
    CreateSupplierSerializer,
    SupplierContactSerializer,
    SupplierItemSerializer,
    SupplierPriceHistorySerializer,
    PurchaseRequisitionSerializer,
    PurchaseOrderSerializer,
    PurchaseReceiptSerializer,
    PurchaseReturnSerializer,
    SupplierCreditSerializer,
    SupplierInvoiceSerializer,
    ProcurementBudgetSerializer,
)


class SupplierListCreateView(APIView):
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

        supplier_type = request.query_params.get("supplier_type")
        if supplier_type:
            queryset = queryset.filter(supplier_type=supplier_type)

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
            supplier_type=data.get("supplier_type", "PRIMARY_WHOLESALER"),
            contact_person=data.get("contact_person", ""),
            email=data.get("email", ""),
            phone=data.get("phone", ""),
            address=data.get("address", ""),
            tax_id=data.get("tax_id", ""),
            payment_terms=data.get("payment_terms", "NET_30"),
            currency=data.get("currency", "USD"),
            lead_time_days=data.get("lead_time_days", 2),
            minimum_order_value=data.get("minimum_order_value", Decimal("0.00")),
            notes=data.get("notes", ""),
            created_by=request.user,
        )

        return Response({"success": True, "data": SupplierSerializer(supplier).data}, status=status.HTTP_201_CREATED)


class SupplierDetailView(APIView):
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

        for field in [
            "name", "supplier_type", "contact_person", "email", "phone",
            "address", "tax_id", "payment_terms", "currency",
            "lead_time_days", "minimum_order_value", "notes", "is_active"
        ]:
            if field in request.data:
                setattr(supplier, field, request.data[field])

        supplier.save()
        return Response({"success": True, "data": SupplierSerializer(supplier).data}, status=status.HTTP_200_OK)


class SupplierContactListCreateView(APIView):
    permission_classes = [IsAuthenticated, require_permission("procurement.manage")]

    @extend_schema(summary="Add Supplier Contact")
    def post(self, request, supplier_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        supplier = Supplier.objects.filter(id=supplier_id, restaurant=restaurant).first()
        if not supplier:
            return Response({"success": False, "error": {"message": "Supplier not found."}}, status=status.HTTP_404_NOT_FOUND)

        contact = SupplierService.add_contact(
            supplier=supplier,
            name=request.data.get("name", ""),
            role=request.data.get("role", "Sales Rep"),
            email=request.data.get("email", ""),
            phone=request.data.get("phone", ""),
            is_primary=bool(request.data.get("is_primary", False)),
        )
        return Response({"success": True, "data": SupplierContactSerializer(contact).data}, status=status.HTTP_201_CREATED)


class SupplierItemListView(APIView):
    permission_classes = [IsAuthenticated, require_permission("procurement.view")]

    @extend_schema(summary="List Items Supplied by Vendor")
    def get(self, request, supplier_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        supplier = Supplier.objects.filter(id=supplier_id, restaurant=restaurant).first()
        if not supplier:
            return Response({"success": False, "error": {"message": "Supplier not found."}}, status=status.HTTP_404_NOT_FOUND)

        items = SupplierItem.objects.filter(supplier=supplier, is_active=True).select_related("inventory_item")
        return Response({"success": True, "data": SupplierItemSerializer(items, many=True).data}, status=status.HTTP_200_OK)

    @extend_schema(summary="Upsert Supplier Item Mapping")
    def post(self, request, supplier_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        supplier = Supplier.objects.filter(id=supplier_id, restaurant=restaurant).first()
        if not supplier:
            return Response({"success": False, "error": {"message": "Supplier not found."}}, status=status.HTTP_404_NOT_FOUND)

        inv_item = InventoryItem.objects.filter(id=request.data.get("inventory_item_id"), restaurant=restaurant).first()
        if not inv_item:
            return Response({"success": False, "error": {"message": "Inventory Item not found."}}, status=status.HTTP_404_NOT_FOUND)

        item = SupplierService.upsert_supplier_item(
            supplier=supplier,
            inventory_item=inv_item,
            unit_cost=Decimal(str(request.data.get("unit_cost", "0.00"))),
            supplier_sku=request.data.get("supplier_sku", ""),
            purchase_unit=request.data.get("purchase_unit", inv_item.unit),
            conversion_factor=Decimal(str(request.data.get("conversion_factor", "1.0000"))),
            minimum_order_quantity=Decimal(str(request.data.get("minimum_order_quantity", "1.000"))),
            pack_size=Decimal(str(request.data.get("pack_size", "1.000"))),
            lead_time_days=int(request.data.get("lead_time_days", supplier.lead_time_days)),
            is_preferred=bool(request.data.get("is_preferred", False)),
            changed_by=request.user,
        )
        return Response({"success": True, "data": SupplierItemSerializer(item).data}, status=status.HTTP_200_OK)


class SupplierPerformanceScorecardView(APIView):
    permission_classes = [IsAuthenticated, require_permission("procurement.view")]

    @extend_schema(summary="Get Supplier Performance Scorecard")
    def get(self, request, supplier_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        supplier = Supplier.objects.filter(id=supplier_id, restaurant=restaurant).first()
        if not supplier:
            return Response({"success": False, "error": {"message": "Supplier not found."}}, status=status.HTTP_404_NOT_FOUND)

        scorecard = SupplierService.calculate_supplier_scorecard(supplier)
        return Response({"success": True, "data": scorecard}, status=status.HTTP_200_OK)


class PurchaseRequisitionListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), require_permission("procurement.requisition.create")()]
        return [IsAuthenticated(), require_permission("procurement.view")()]

    @extend_schema(summary="List Purchase Requisitions")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        qs = PurchaseRequisition.objects.filter(restaurant=restaurant).order_by("-created_at")

        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        return Response({"success": True, "data": PurchaseRequisitionSerializer(qs, many=True).data}, status=status.HTTP_200_OK)

    @extend_schema(summary="Create Purchase Requisition")
    def post(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        req = PurchaseRequisitionService.create_requisition(
            restaurant=restaurant,
            requester=request.user,
            items_data=request.data.get("items", []),
            location=request.data.get("location", "KITCHEN"),
            required_date=request.data.get("required_date"),
            priority=request.data.get("priority", "NORMAL"),
            reason=request.data.get("reason", ""),
            notes=request.data.get("notes", ""),
        )
        return Response({"success": True, "data": PurchaseRequisitionSerializer(req).data}, status=status.HTTP_201_CREATED)


class PurchaseRequisitionSubmitView(APIView):
    permission_classes = [IsAuthenticated, require_permission("procurement.requisition.create")]

    @extend_schema(summary="Submit Requisition for Approval")
    def post(self, request, requisition_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        req = PurchaseRequisition.objects.filter(id=requisition_id, restaurant=restaurant).first()
        if not req:
            return Response({"success": False, "error": {"message": "Requisition not found."}}, status=status.HTTP_404_NOT_FOUND)

        req = PurchaseRequisitionService.submit_requisition(req, request.user)
        return Response({"success": True, "data": PurchaseRequisitionSerializer(req).data}, status=status.HTTP_200_OK)


class PurchaseRequisitionApproveView(APIView):
    permission_classes = [IsAuthenticated, require_permission("procurement.requisition.approve")]

    @extend_schema(summary="Approve Purchase Requisition")
    def post(self, request, requisition_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        req = PurchaseRequisition.objects.filter(id=requisition_id, restaurant=restaurant).first()
        if not req:
            return Response({"success": False, "error": {"message": "Requisition not found."}}, status=status.HTTP_404_NOT_FOUND)

        req = PurchaseRequisitionService.approve_requisition(req, request.user)
        return Response({"success": True, "data": PurchaseRequisitionSerializer(req).data}, status=status.HTTP_200_OK)


class PurchaseOrderListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), require_permission("procurement.create")()]
        return [IsAuthenticated(), require_permission("procurement.view")()]

    @extend_schema(summary="List Purchase Orders")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        queryset = PurchaseOrder.objects.filter(restaurant=restaurant).select_related("supplier", "created_by", "approved_by").prefetch_related("items").order_by("-created_at")

        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(po_number__icontains=search)
                | Q(supplier__name__icontains=search)
                | Q(supplier__supplier_code__icontains=search)
            )

        status_filter = request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        supplier_id = request.query_params.get("supplier_id")
        if supplier_id:
            queryset = queryset.filter(supplier_id=supplier_id)

        return Response({"success": True, "data": PurchaseOrderSerializer(queryset, many=True).data}, status=status.HTTP_200_OK)

    @extend_schema(summary="Create Purchase Order")
    def post(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        supplier = Supplier.objects.filter(id=request.data.get("supplier_id"), restaurant=restaurant).first()
        if not supplier:
            return Response({"success": False, "error": {"message": "Supplier not found."}}, status=status.HTTP_404_NOT_FOUND)

        po = PurchaseOrderService.create_purchase_order(
            restaurant=restaurant,
            supplier=supplier,
            items_data=request.data.get("items", []),
            created_by=request.user,
            order_date=request.data.get("order_date"),
            expected_delivery_date=request.data.get("expected_delivery_date"),
            tax_amount=Decimal(str(request.data.get("tax_amount", "0.00"))),
            discount_amount=Decimal(str(request.data.get("discount_amount", "0.00"))),
            location=request.data.get("location", "MAIN_STORE"),
            notes=request.data.get("notes", ""),
        )
        return Response({"success": True, "data": PurchaseOrderSerializer(po).data}, status=status.HTTP_201_CREATED)


class PurchaseOrderDetailView(APIView):
    permission_classes = [IsAuthenticated, require_permission("procurement.view")]

    @extend_schema(summary="Get Purchase Order Detail")
    def get(self, request, po_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        po = PurchaseOrder.objects.filter(id=po_id, restaurant=restaurant).select_related("supplier", "created_by", "approved_by").prefetch_related("items", "receipts__items", "revisions").first()
        if not po:
            return Response({"success": False, "error": {"message": "Purchase order not found."}}, status=status.HTTP_404_NOT_FOUND)

        return Response({"success": True, "data": PurchaseOrderSerializer(po).data}, status=status.HTTP_200_OK)


class PurchaseOrderSubmitView(APIView):
    permission_classes = [IsAuthenticated, require_permission("procurement.create")]

    @extend_schema(summary="Submit PO for Approval")
    def post(self, request, po_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        po = PurchaseOrder.objects.filter(id=po_id, restaurant=restaurant).first()
        if not po:
            return Response({"success": False, "error": {"message": "Purchase order not found."}}, status=status.HTTP_404_NOT_FOUND)

        po = PurchaseOrderService.submit_purchase_order(po, request.user)
        return Response({"success": True, "data": PurchaseOrderSerializer(po).data}, status=status.HTTP_200_OK)


class PurchaseOrderApproveView(APIView):
    permission_classes = [IsAuthenticated, require_permission("procurement.approve")]

    @extend_schema(summary="Approve Purchase Order")
    def post(self, request, po_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        po = PurchaseOrder.objects.filter(id=po_id, restaurant=restaurant).first()
        if not po:
            return Response({"success": False, "error": {"message": "Purchase order not found."}}, status=status.HTTP_404_NOT_FOUND)

        po = PurchaseOrderService.approve_purchase_order(po, request.user)
        return Response({"success": True, "data": PurchaseOrderSerializer(po).data}, status=status.HTTP_200_OK)


class PurchaseOrderSendView(APIView):
    permission_classes = [IsAuthenticated, require_permission("procurement.order.send")]

    @extend_schema(summary="Send Purchase Order to Supplier")
    def post(self, request, po_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        po = PurchaseOrder.objects.filter(id=po_id, restaurant=restaurant).first()
        if not po:
            return Response({"success": False, "error": {"message": "Purchase order not found."}}, status=status.HTTP_404_NOT_FOUND)

        po = PurchaseOrderService.send_purchase_order(po, request.user)
        return Response({"success": True, "data": PurchaseOrderSerializer(po).data}, status=status.HTTP_200_OK)


class PurchaseOrderReceiveView(APIView):
    permission_classes = [IsAuthenticated, require_permission("procurement.receive")]

    @extend_schema(summary="Receive PO Goods Intake")
    def post(self, request, po_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        po = PurchaseOrder.objects.filter(id=po_id, restaurant=restaurant).first()
        if not po:
            return Response({"success": False, "error": {"message": "Purchase order not found."}}, status=status.HTTP_404_NOT_FOUND)

        receipt = PurchaseOrderService.receive_goods(
            purchase_order=po,
            received_items=request.data.get("items", []),
            received_by=request.user,
            invoice_number=request.data.get("invoice_number", ""),
            delivery_note_number=request.data.get("delivery_note_number", ""),
            idempotency_key=request.data.get("idempotency_key", ""),
            notes=request.data.get("notes", ""),
        )
        return Response({"success": True, "data": PurchaseReceiptSerializer(receipt).data}, status=status.HTTP_200_OK)


class PurchaseOrderCancelView(APIView):
    permission_classes = [IsAuthenticated, require_permission("procurement.create")]

    @extend_schema(summary="Cancel Purchase Order")
    def post(self, request, po_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        po = PurchaseOrder.objects.filter(id=po_id, restaurant=restaurant).first()
        if not po:
            return Response({"success": False, "error": {"message": "Purchase order not found."}}, status=status.HTTP_404_NOT_FOUND)

        if po.status in [PurchaseOrder.POStatus.RECEIVED, PurchaseOrder.POStatus.CLOSED]:
            return Response({"success": False, "error": {"message": "Cannot cancel completed purchase order."}}, status=status.HTTP_400_BAD_REQUEST)

        po.status = PurchaseOrder.POStatus.CANCELLED
        po.save()
        return Response({"success": True, "data": PurchaseOrderSerializer(po).data}, status=status.HTTP_200_OK)


class PurchaseReturnListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), require_permission("procurement.return")()]
        return [IsAuthenticated(), require_permission("procurement.view")()]

    @extend_schema(summary="List Purchase Returns")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        qs = PurchaseReturn.objects.filter(restaurant=restaurant).order_by("-created_at")
        return Response({"success": True, "data": PurchaseReturnSerializer(qs, many=True).data}, status=status.HTTP_200_OK)

    @extend_schema(summary="Create Purchase Return")
    def post(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        supplier = Supplier.objects.filter(id=request.data.get("supplier_id"), restaurant=restaurant).first()
        if not supplier:
            return Response({"success": False, "error": {"message": "Supplier not found."}}, status=status.HTTP_404_NOT_FOUND)

        p_return = PurchaseReturnService.create_purchase_return(
            restaurant=restaurant,
            supplier=supplier,
            items_data=request.data.get("items", []),
            reason=request.data.get("reason", "DAMAGED"),
            requested_by=request.user,
            notes=request.data.get("notes", ""),
        )
        return Response({"success": True, "data": PurchaseReturnSerializer(p_return).data}, status=status.HTTP_201_CREATED)


class PurchaseReturnApproveView(APIView):
    permission_classes = [IsAuthenticated, require_permission("procurement.return")]

    @extend_schema(summary="Approve and Dispatch Purchase Return")
    def post(self, request, return_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        p_return = PurchaseReturn.objects.filter(id=return_id, restaurant=restaurant).first()
        if not p_return:
            return Response({"success": False, "error": {"message": "Return not found."}}, status=status.HTTP_404_NOT_FOUND)

        p_return = PurchaseReturnService.approve_and_dispatch_return(p_return, request.user)
        return Response({"success": True, "data": PurchaseReturnSerializer(p_return).data}, status=status.HTTP_200_OK)


class SupplierCreditListView(APIView):
    permission_classes = [IsAuthenticated, require_permission("procurement.view")]

    @extend_schema(summary="List Supplier Credit Notes")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        qs = SupplierCredit.objects.filter(restaurant=restaurant).order_by("-issued_date")
        return Response({"success": True, "data": SupplierCreditSerializer(qs, many=True).data}, status=status.HTTP_200_OK)


class SupplierInvoiceListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), require_permission("procurement.invoice.match")()]
        return [IsAuthenticated(), require_permission("procurement.view")()]

    @extend_schema(summary="List Supplier Invoices")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        qs = SupplierInvoice.objects.filter(restaurant=restaurant).order_by("-invoice_date")
        return Response({"success": True, "data": SupplierInvoiceSerializer(qs, many=True).data}, status=status.HTTP_200_OK)

    @extend_schema(summary="Submit and Match Supplier Invoice")
    def post(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        po = PurchaseOrder.objects.filter(id=request.data.get("purchase_order_id"), restaurant=restaurant).first()
        if not po:
            return Response({"success": False, "error": {"message": "Purchase order not found."}}, status=status.HTTP_404_NOT_FOUND)

        invoice = SupplierInvoiceMatchService.match_invoice(
            restaurant=restaurant,
            purchase_order=po,
            invoice_number=request.data.get("invoice_number", ""),
            invoice_date=request.data.get("invoice_date", timezone.now().date()),
            items_data=request.data.get("items", []),
            tax_amount=Decimal(str(request.data.get("tax_amount", "0.00"))),
            reviewed_by=request.user,
            notes=request.data.get("notes", ""),
        )
        return Response({"success": True, "data": SupplierInvoiceSerializer(invoice).data}, status=status.HTTP_201_CREATED)


class ProcurementBudgetListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), require_permission("procurement.budget.manage")()]
        return [IsAuthenticated(), require_permission("procurement.view")()]

    @extend_schema(summary="List Procurement Budgets")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        qs = ProcurementBudget.objects.filter(restaurant=restaurant).order_by("-start_date")
        return Response({"success": True, "data": ProcurementBudgetSerializer(qs, many=True).data}, status=status.HTTP_200_OK)

    @extend_schema(summary="Create Procurement Budget")
    def post(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        budget = ProcurementBudget.objects.create(
            restaurant=restaurant,
            name=request.data.get("name", "Department Spend Budget"),
            location=request.data.get("location", "MAIN_STORE"),
            department=request.data.get("department", "Kitchen"),
            category=request.data.get("category", "ALL"),
            period_type=request.data.get("period_type", "MONTHLY"),
            start_date=request.data.get("start_date"),
            end_date=request.data.get("end_date"),
            allocated_amount=Decimal(str(request.data.get("allocated_amount", "0.00"))),
            currency=request.data.get("currency", "USD"),
            notes=request.data.get("notes", ""),
        )
        return Response({"success": True, "data": ProcurementBudgetSerializer(budget).data}, status=status.HTTP_201_CREATED)


class ProcurementRecommendationsView(APIView):
    permission_classes = [IsAuthenticated, require_permission("procurement.view")]

    @extend_schema(summary="Get Automated Purchase Recommendations")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        recommendations = ProcurementPlanningService.generate_purchase_recommendations(restaurant)
        return Response({"success": True, "data": recommendations}, status=status.HTTP_200_OK)


class ProcurementReportsView(APIView):
    permission_classes = [IsAuthenticated, require_permission("procurement.view")]

    @extend_schema(summary="Procurement Analytics and Executive Reports")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)

        # Spend by Supplier
        supplier_spend = (
            PurchaseOrder.objects.filter(restaurant=restaurant, status__in=[PurchaseOrder.POStatus.APPROVED, PurchaseOrder.POStatus.SENT, PurchaseOrder.POStatus.ACKNOWLEDGED, PurchaseOrder.POStatus.PARTIALLY_RECEIVED, PurchaseOrder.POStatus.RECEIVED, PurchaseOrder.POStatus.CLOSED])
            .values("supplier__name", "supplier__supplier_code")
            .annotate(total_spend=Sum("total_amount"), po_count=Count("id"))
            .order_by("-total_spend")[:10]
        )

        # Open vs Received POs
        po_status_counts = (
            PurchaseOrder.objects.filter(restaurant=restaurant)
            .values("status")
            .annotate(count=Count("id"), total_value=Sum("total_amount"))
        )

        # Overdue Deliveries
        overdue_pos = PurchaseOrder.objects.filter(
            restaurant=restaurant,
            status__in=[PurchaseOrder.POStatus.APPROVED, PurchaseOrder.POStatus.SENT, PurchaseOrder.POStatus.ACKNOWLEDGED, PurchaseOrder.POStatus.PARTIALLY_RECEIVED],
            expected_delivery_date__lt=timezone.now().date()
        ).count()

        return Response({
            "success": True,
            "data": {
                "supplier_spend": list(supplier_spend),
                "po_status_distribution": list(po_status_counts),
                "overdue_pos_count": overdue_pos,
            }
        }, status=status.HTTP_200_OK)
