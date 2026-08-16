from django.urls import path
from apps.kitchen.views import (
    KitchenTicketListView,
    KitchenTicketStartView,
    KitchenTicketReadyView,
    KitchenTicketCompleteView,
    KitchenTicketCancelView,
)

urlpatterns = [
    path("tickets/", KitchenTicketListView.as_view(), name="kitchen_ticket_list"),
    path("tickets/<uuid:ticket_id>/start/", KitchenTicketStartView.as_view(), name="kitchen_ticket_start"),
    path("tickets/<uuid:ticket_id>/ready/", KitchenTicketReadyView.as_view(), name="kitchen_ticket_ready"),
    path("tickets/<uuid:ticket_id>/complete/", KitchenTicketCompleteView.as_view(), name="kitchen_ticket_complete"),
    path("tickets/<uuid:ticket_id>/cancel/", KitchenTicketCancelView.as_view(), name="kitchen_ticket_cancel"),
]
