from django.urls import path
from apps.staff.views import (
    StaffListView,
    StaffDetailView,
    StaffDisableView,
    StaffReactivateView,
)

urlpatterns = [
    path("", StaffListView.as_view(), name="staff_list_create"),
    path("<uuid:staff_id>/", StaffDetailView.as_view(), name="staff_detail_update"),
    path("<uuid:staff_id>/disable/", StaffDisableView.as_view(), name="staff_disable"),
    path("<uuid:staff_id>/reactivate/", StaffReactivateView.as_view(), name="staff_reactivate"),
]
