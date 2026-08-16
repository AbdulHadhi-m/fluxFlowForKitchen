from django.urls import path
from apps.tables.views import (
    TableListCreateView,
    TableDetailUpdateView,
    TableStatusView,
)

urlpatterns = [
    path("", TableListCreateView.as_view(), name="table_list_create"),
    path("<uuid:table_id>/", TableDetailUpdateView.as_view(), name="table_detail_update"),
    path("<uuid:table_id>/status/", TableStatusView.as_view(), name="table_status_update"),
]
