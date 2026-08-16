from django.urls import path
from apps.notifications.views import (
    NotificationListView,
    NotificationUnreadCountView,
    NotificationMarkReadView,
    NotificationMarkAllReadView,
    NotificationPreferenceView,
)

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification_list"),
    path("unread-count/", NotificationUnreadCountView.as_view(), name="notification_unread_count"),
    path("<uuid:notification_id>/read/", NotificationMarkReadView.as_view(), name="notification_mark_read"),
    path("read-all/", NotificationMarkAllReadView.as_view(), name="notification_mark_all_read"),
    path("preferences/", NotificationPreferenceView.as_view(), name="notification_preferences"),
]
