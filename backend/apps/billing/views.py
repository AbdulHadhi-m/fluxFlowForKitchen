from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from django.db.models import Q
from apps.rbac.permissions import require_permission
from apps.restaurants.services import RestaurantService
from apps.orders.models import Order
from apps.orders.serializers import OrderSerializer
from apps.billing.models import Bill, TaxRule
from apps.billing.services import BillingService, PaymentService
from apps.billing.serializers import (
    BillSerializer,
    CreateBillSerializer,
    ProcessPaymentSerializer,
    PaymentSerializer,
    VoidBillSerializer,
    TaxRuleSerializer,
)

class BillListCreateView(APIView):
    """
    List restaurant bills or generate a new bill from an order.
    """
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), require_permission("billing.create")()]
        return [IsAuthenticated(), require_permission("billing.view")()]

    @extend_schema(summary="List Bills")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        queryset = (
            Bill.objects.filter(restaurant=restaurant)
            .select_related("order__table", "created_by")
            .prefetch_related("items", "payments__received_by")
            .order_by("-created_at")
        )

        status_param = request.query_params.get("status")
        if status_param in Bill.BillStatus.values:
            queryset = queryset.filter(status=status_param)

        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(bill_number__icontains=search) | Q(order__order_number__icontains=search)
            )

        serializer = BillSerializer(queryset, many=True)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)

    @extend_schema(summary="Generate Bill for Order", request=CreateBillSerializer)
    def post(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        serializer = CreateBillSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        order = Order.objects.filter(id=data["order_id"], restaurant=restaurant).first()
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

        bill = BillingService.create_bill_for_order(
            restaurant=restaurant,
            user=request.user,
            order=order,
            discount_type=data.get("discount_type", Bill.DiscountType.NONE),
            discount_value=data.get("discount_value", 0),
            service_charge_rate=data.get("service_charge_rate", 0),
            notes=data.get("notes", ""),
        )

        return Response(
            {"success": True, "data": BillSerializer(bill).data},
            status=status.HTTP_201_CREATED,
        )


class BillDetailView(APIView):
    """
    Retrieve single bill detail with item snapshots and settled payment receipts.
    """
    permission_classes = [IsAuthenticated, require_permission("billing.view")]

    @extend_schema(summary="Get Bill Detail")
    def get(self, request, bill_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        bill = (
            Bill.objects.filter(id=bill_id, restaurant=restaurant)
            .select_related("order__table", "created_by")
            .prefetch_related("items", "payments__received_by")
            .first()
        )
        if not bill:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "BILL_NOT_FOUND",
                        "message": "Bill not found.",
                        "status_code": status.HTTP_404_NOT_FOUND,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({"success": True, "data": BillSerializer(bill).data}, status=status.HTTP_200_OK)


class BillProcessPaymentView(APIView):
    """
    Process payment settlement against an outstanding bill balance.
    """
    permission_classes = [IsAuthenticated, require_permission("billing.payment.create")]

    @extend_schema(summary="Record Payment on Bill", request=ProcessPaymentSerializer)
    def post(self, request, bill_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        bill = Bill.objects.filter(id=bill_id, restaurant=restaurant).first()
        if not bill:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "BILL_NOT_FOUND",
                        "message": "Bill not found in your restaurant organization.",
                        "status_code": status.HTTP_404_NOT_FOUND,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ProcessPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        payment = PaymentService.process_payment(
            restaurant=restaurant,
            user=request.user,
            bill=bill,
            amount=data["amount"],
            payment_method=data.get("payment_method", "CASH"),
            amount_tendered=data.get("amount_tendered"),
            reference=data.get("reference", ""),
            idempotency_key=data.get("idempotency_key"),
        )

        bill.refresh_from_db()
        return Response(
            {
                "success": True,
                "data": {
                    "payment": PaymentSerializer(payment).data,
                    "bill": BillSerializer(bill).data,
                },
            },
            status=status.HTTP_200_OK,
        )


class BillVoidView(APIView):
    """
    Void an active bill.
    """
    permission_classes = [IsAuthenticated, require_permission("billing.void")]

    @extend_schema(summary="Void Bill", request=VoidBillSerializer)
    def post(self, request, bill_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        bill = Bill.objects.filter(id=bill_id, restaurant=restaurant).first()
        if not bill:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "BILL_NOT_FOUND",
                        "message": "Bill not found.",
                        "status_code": status.HTTP_404_NOT_FOUND,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = VoidBillSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data.get("reason", "")

        voided_bill = BillingService.void_bill(bill, user=request.user, reason=reason)
        return Response({"success": True, "data": BillSerializer(voided_bill).data}, status=status.HTTP_200_OK)


class EligibleOrdersForBillingView(APIView):
    """
    List orders eligible for bill generation (PLACED/COMPLETED orders without a finalized/paid bill).
    """
    permission_classes = [IsAuthenticated, require_permission("billing.view")]

    @extend_schema(summary="List Orders Eligible for Billing")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        # Orders that don't have an active finalized/paid bill
        active_billed_order_ids = Bill.objects.filter(
            restaurant=restaurant,
            status__in=[Bill.BillStatus.FINALIZED, Bill.BillStatus.PARTIALLY_PAID, Bill.BillStatus.PAID],
        ).values_list("order_id", flat=True)

        orders = (
            Order.objects.filter(
                restaurant=restaurant,
                status__in=[Order.OrderStatus.PLACED, Order.OrderStatus.COMPLETED],
            )
            .exclude(id__in=active_billed_order_ids)
            .select_related("table", "created_by")
            .prefetch_related("items")
            .order_by("-created_at")
        )

        serializer = OrderSerializer(orders, many=True)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)


class TaxRuleListCreateView(APIView):
    """
    List or configure restaurant tax rules.
    """
    permission_classes = [IsAuthenticated, require_permission("settings.view")]

    @extend_schema(summary="List Tax Rules")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        rules = TaxRule.objects.filter(restaurant=restaurant).order_by("-created_at")
        return Response({"success": True, "data": TaxRuleSerializer(rules, many=True).data}, status=status.HTTP_200_OK)

    @extend_schema(summary="Create Tax Rule", request=TaxRuleSerializer)
    def post(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        serializer = TaxRuleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        rule = serializer.save(restaurant=restaurant)
        return Response({"success": True, "data": TaxRuleSerializer(rule).data}, status=status.HTTP_201_CREATED)
