from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from apps.rbac.permissions import require_permission
from apps.restaurants.services import RestaurantService
from apps.kitchen.models import KitchenTicket
from apps.kitchen.services import KitchenService
from apps.kitchen.serializers import KitchenTicketSerializer

class KitchenTicketListView(APIView):
    """
    List active kitchen preparation tickets for current restaurant queue.
    """
    permission_classes = [IsAuthenticated, require_permission("kitchen.view")]

    @extend_schema(summary="List Active Kitchen Tickets")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        queryset = (
            KitchenTicket.objects.filter(restaurant=restaurant)
            .select_related("order__table", "order__created_by")
            .prefetch_related("order__items")
            .order_by("created_at")
        )

        status_param = request.query_params.get("status")
        if status_param in KitchenTicket.KitchenStatus.values:
            queryset = queryset.filter(status=status_param)
        elif not status_param:
            # Default active queue: NEW, PREPARING, READY
            queryset = queryset.filter(
                status__in=[
                    KitchenTicket.KitchenStatus.NEW,
                    KitchenTicket.KitchenStatus.PREPARING,
                    KitchenTicket.KitchenStatus.READY,
                ]
            )

        serializer = KitchenTicketSerializer(queryset, many=True)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)

class KitchenTicketStartView(APIView):
    """Advance ticket to PREPARING."""
    permission_classes = [IsAuthenticated, require_permission("kitchen.status.manage")]

    @extend_schema(summary="Start Kitchen Preparation")
    def post(self, request, ticket_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        ticket = KitchenTicket.objects.filter(id=ticket_id, restaurant=restaurant).first()
        if not ticket:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "TICKET_NOT_FOUND",
                        "message": "Kitchen ticket not found in your restaurant organization.",
                        "status_code": status.HTTP_404_NOT_FOUND,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        updated_ticket = KitchenService.start_preparing(ticket)
        return Response({"success": True, "data": KitchenTicketSerializer(updated_ticket).data}, status=status.HTTP_200_OK)

class KitchenTicketReadyView(APIView):
    """Advance ticket to READY on pass."""
    permission_classes = [IsAuthenticated, require_permission("kitchen.status.manage")]

    @extend_schema(summary="Mark Kitchen Ticket as Ready")
    def post(self, request, ticket_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        ticket = KitchenTicket.objects.filter(id=ticket_id, restaurant=restaurant).first()
        if not ticket:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "TICKET_NOT_FOUND",
                        "message": "Kitchen ticket not found.",
                        "status_code": status.HTTP_404_NOT_FOUND,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        updated_ticket = KitchenService.mark_ready(ticket)
        return Response({"success": True, "data": KitchenTicketSerializer(updated_ticket).data}, status=status.HTTP_200_OK)

class KitchenTicketCompleteView(APIView):
    """Complete ticket and sync order completion."""
    permission_classes = [IsAuthenticated, require_permission("kitchen.status.manage")]

    @extend_schema(summary="Complete Kitchen Ticket")
    def post(self, request, ticket_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        ticket = KitchenTicket.objects.filter(id=ticket_id, restaurant=restaurant).first()
        if not ticket:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "TICKET_NOT_FOUND",
                        "message": "Kitchen ticket not found.",
                        "status_code": status.HTTP_404_NOT_FOUND,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        updated_ticket = KitchenService.complete_ticket(ticket)
        return Response({"success": True, "data": KitchenTicketSerializer(updated_ticket).data}, status=status.HTTP_200_OK)

class KitchenTicketCancelView(APIView):
    """Cancel kitchen ticket and sync order cancellation."""
    permission_classes = [IsAuthenticated, require_permission("kitchen.status.manage")]

    @extend_schema(summary="Cancel Kitchen Ticket")
    def post(self, request, ticket_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        ticket = KitchenTicket.objects.filter(id=ticket_id, restaurant=restaurant).first()
        if not ticket:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "TICKET_NOT_FOUND",
                        "message": "Kitchen ticket not found.",
                        "status_code": status.HTTP_404_NOT_FOUND,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        updated_ticket = KitchenService.cancel_ticket(ticket)
        return Response({"success": True, "data": KitchenTicketSerializer(updated_ticket).data}, status=status.HTTP_200_OK)
