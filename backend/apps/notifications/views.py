from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from apps.core.pagination import FluxiflowPagination
from apps.restaurants.services import RestaurantService
from apps.notifications.models import Notification, NotificationPreference
from apps.notifications.services import NotificationService
from apps.notifications.serializers import (
    NotificationSerializer,
    NotificationPreferenceSerializer,
)

class NotificationListView(APIView, FluxiflowPagination):
    """
    List user notifications for current restaurant context with filtering.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="List User Notifications")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        queryset = Notification.objects.filter(
            restaurant=restaurant,
            recipient=request.user,
        ).order_by("-created_at")

        is_read_param = request.query_params.get("is_read")
        if is_read_param is not None:
            queryset = queryset.filter(is_read=is_read_param.lower() in ["true", "1"])

        severity = request.query_params.get("severity")
        if severity:
            queryset = queryset.filter(severity=severity.upper())

        notification_type = request.query_params.get("notification_type")
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)

        page = self.paginate_queryset(queryset, request, view=self)
        if page is not None:
            serializer = NotificationSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = NotificationSerializer(queryset, many=True)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)


class NotificationUnreadCountView(APIView):
    """
    Fast query for unread notification count badge.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Get Unread Notification Count")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        count = Notification.objects.filter(
            restaurant=restaurant,
            recipient=request.user,
            is_read=False,
        ).count()
        return Response({"success": True, "data": {"count": count}}, status=status.HTTP_200_OK)


class NotificationMarkReadView(APIView):
    """
    Mark a single notification as read.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Mark Notification as Read")
    def post(self, request, notification_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        notification = Notification.objects.filter(
            id=notification_id,
            restaurant=restaurant,
            recipient=request.user,
        ).first()

        if not notification:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Notification not found.", "status_code": status.HTTP_404_NOT_FOUND}},
                status=status.HTTP_404_NOT_FOUND,
            )

        updated_notification = NotificationService.mark_as_read(notification, request.user)
        return Response({"success": True, "data": NotificationSerializer(updated_notification).data}, status=status.HTTP_200_OK)


class NotificationMarkAllReadView(APIView):
    """
    Mark all unread notifications as read for current user.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Mark All Notifications as Read")
    def post(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        updated_count = NotificationService.mark_all_as_read(restaurant, request.user)
        return Response({"success": True, "data": {"updated_count": updated_count}}, status=status.HTTP_200_OK)


class NotificationPreferenceView(APIView):
    """
    View or update notification preferences for user.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Get User Notification Preferences")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        pref, _ = NotificationPreference.objects.get_or_create(
            restaurant=restaurant,
            user=request.user,
        )
        return Response({"success": True, "data": NotificationPreferenceSerializer(pref).data}, status=status.HTTP_200_OK)

    @extend_schema(summary="Update User Notification Preferences", request=NotificationPreferenceSerializer)
    def patch(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        pref, _ = NotificationPreference.objects.get_or_create(
            restaurant=restaurant,
            user=request.user,
        )

        for field in ["in_app_enabled", "realtime_enabled", "low_stock_alerts", "order_alerts", "procurement_alerts"]:
            if field in request.data:
                setattr(pref, field, request.data[field])

        pref.save()
        return Response({"success": True, "data": NotificationPreferenceSerializer(pref).data}, status=status.HTTP_200_OK)
