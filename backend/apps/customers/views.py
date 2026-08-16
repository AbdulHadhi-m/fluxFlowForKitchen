import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, NotFound, ValidationError
from django.db.models import Q
from apps.rbac.services import RBACService
from apps.restaurants.services import RestaurantService
from apps.customers.models import Customer, CustomerTag, Reservation, ReservationStatus
from apps.customers.serializers import (
    CustomerSerializer,
    CustomerTagSerializer,
    ReservationSerializer,
)
from apps.customers.services import CustomerService, ReservationService

logger = logging.getLogger("fluxiflow.customers")

class CustomerBaseView(APIView):
    permission_classes = [IsAuthenticated]

    def get_restaurant(self):
        restaurant = RestaurantService.get_user_restaurant(self.request.user)
        if not restaurant:
            raise PermissionDenied("User is not associated with an active restaurant.")
        return restaurant

    def check_user_permission(self, permission_code: str):
        restaurant = self.get_restaurant()
        perms = RBACService.get_effective_permissions(user=self.request.user, tenant_id=restaurant.id)
        if permission_code not in perms:
            raise PermissionDenied(f"Missing required permission: {permission_code}")


class CustomerListCreateView(CustomerBaseView):
    def get(self, request):
        self.check_user_permission("customers.view")
        restaurant = self.get_restaurant()

        queryset = Customer.objects.filter(restaurant=restaurant, is_active=True)
        search = request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(phone__icontains=search) |
                Q(email__icontains=search)
            )

        tag = request.query_params.get("tag")
        if tag:
            queryset = queryset.filter(tags__id=tag)

        serializer = CustomerSerializer(queryset, many=True)
        return Response({"success": True, "data": serializer.data})

    def post(self, request):
        self.check_user_permission("customers.manage")
        restaurant = self.get_restaurant()

        serializer = CustomerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        customer = CustomerService.create_customer(
            restaurant=restaurant,
            first_name=serializer.validated_data["first_name"],
            last_name=serializer.validated_data.get("last_name", ""),
            phone=serializer.validated_data["phone"],
            email=serializer.validated_data.get("email", ""),
            date_of_birth=serializer.validated_data.get("date_of_birth"),
            gender=serializer.validated_data.get("gender", Customer.GenderChoices.UNSPECIFIED),
            dietary_preferences=serializer.validated_data.get("dietary_preferences", []),
            allergies=serializer.validated_data.get("allergies", []),
            internal_notes=serializer.validated_data.get("internal_notes", ""),
            tag_ids=request.data.get("tag_ids"),
            actor_user=request.user,
        )

        return Response({"success": True, "data": CustomerSerializer(customer).data}, status=status.HTTP_201_CREATED)


class CustomerDetailView(CustomerBaseView):
    def get_object(self, pk):
        restaurant = self.get_restaurant()
        try:
            return Customer.objects.get(restaurant=restaurant, id=pk)
        except Customer.DoesNotExist:
            raise NotFound("Customer not found.")

    def get(self, request, pk):
        self.check_user_permission("customers.view")
        customer = self.get_object(pk)
        return Response({"success": True, "data": CustomerSerializer(customer).data})

    def patch(self, request, pk):
        self.check_user_permission("customers.manage")
        customer = self.get_object(pk)
        serializer = CustomerSerializer(customer, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        updated_customer = CustomerService.update_customer(
            customer=customer,
            payload=serializer.validated_data,
            actor_user=request.user,
        )
        return Response({"success": True, "data": CustomerSerializer(updated_customer).data})

    def delete(self, request, pk):
        self.check_user_permission("customers.manage")
        customer = self.get_object(pk)
        customer.is_active = False
        customer.save(update_fields=["is_active"])
        return Response({"success": True, "message": "Customer deactivated successfully."})


class CustomerMergeView(CustomerBaseView):
    def post(self, request, pk):
        self.check_user_permission("customers.manage")
        restaurant = self.get_restaurant()

        primary_customer = Customer.objects.filter(restaurant=restaurant, id=pk).first()
        if not primary_customer:
            raise NotFound("Primary customer not found.")

        duplicate_id = request.data.get("duplicate_customer_id")
        if not duplicate_id:
            raise ValidationError({"duplicate_customer_id": "Required."})

        duplicate_customer = Customer.objects.filter(restaurant=restaurant, id=duplicate_id).first()
        if not duplicate_customer:
            raise NotFound("Duplicate customer not found.")

        merged = CustomerService.merge_customers(
            primary_customer=primary_customer,
            duplicate_customer=duplicate_customer,
            actor_user=request.user,
        )
        return Response({"success": True, "data": CustomerSerializer(merged).data})


class CustomerAnalyticsView(CustomerBaseView):
    def get(self, request):
        self.check_user_permission("customers.view")
        restaurant = self.get_restaurant()
        analytics = CustomerService.get_crm_analytics(restaurant)
        return Response({"success": True, "data": analytics})


class CustomerTagListCreateView(CustomerBaseView):
    def get(self, request):
        self.check_user_permission("customers.view")
        restaurant = self.get_restaurant()
        tags = CustomerTag.objects.filter(restaurant=restaurant)
        return Response({"success": True, "data": CustomerTagSerializer(tags, many=True).data})

    def post(self, request):
        self.check_user_permission("customers.manage")
        restaurant = self.get_restaurant()
        serializer = CustomerTagSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        tag, _ = CustomerTag.objects.get_or_create(
            restaurant=restaurant,
            name=serializer.validated_data["name"].strip(),
            defaults={"color": serializer.validated_data.get("color", "indigo")},
        )
        return Response({"success": True, "data": CustomerTagSerializer(tag).data}, status=status.HTTP_201_CREATED)


class ReservationListCreateView(CustomerBaseView):
    def get(self, request):
        self.check_user_permission("reservations.view")
        restaurant = self.get_restaurant()

        queryset = Reservation.objects.filter(restaurant=restaurant)
        res_date = request.query_params.get("date")
        if res_date:
            queryset = queryset.filter(reservation_date=res_date)

        status_param = request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)

        serializer = ReservationSerializer(queryset, many=True)
        return Response({"success": True, "data": serializer.data})

    def post(self, request):
        self.check_user_permission("reservations.manage")
        restaurant = self.get_restaurant()

        serializer = ReservationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        customer = Customer.objects.filter(
            restaurant=restaurant,
            id=serializer.validated_data["customer"].id
        ).first()
        if not customer:
            raise NotFound("Customer not found.")

        reservation = ReservationService.create_reservation(
            restaurant=restaurant,
            customer=customer,
            reservation_date=serializer.validated_data["reservation_date"],
            reservation_time=serializer.validated_data["reservation_time"],
            party_size=serializer.validated_data.get("party_size", 2),
            table=serializer.validated_data.get("table"),
            special_requests=serializer.validated_data.get("special_requests", ""),
            actor_user=request.user,
        )

        return Response({"success": True, "data": ReservationSerializer(reservation).data}, status=status.HTTP_201_CREATED)


class ReservationDetailView(CustomerBaseView):
    def get_object(self, pk):
        restaurant = self.get_restaurant()
        try:
            return Reservation.objects.get(restaurant=restaurant, id=pk)
        except Reservation.DoesNotExist:
            raise NotFound("Reservation not found.")

    def get(self, request, pk):
        self.check_user_permission("reservations.view")
        reservation = self.get_object(pk)
        return Response({"success": True, "data": ReservationSerializer(reservation).data})

    def patch(self, request, pk):
        self.check_user_permission("reservations.manage")
        reservation = self.get_object(pk)

        new_status = request.data.get("status")
        if new_status and new_status != reservation.status:
            reservation = ReservationService.update_reservation_status(
                reservation=reservation,
                new_status=new_status,
                cancellation_reason=request.data.get("cancellation_reason", ""),
                actor_user=request.user,
            )

        return Response({"success": True, "data": ReservationSerializer(reservation).data})
