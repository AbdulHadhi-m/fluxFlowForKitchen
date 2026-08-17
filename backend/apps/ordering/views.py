import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import NotFound, ValidationError, PermissionDenied
from rest_framework_simplejwt.tokens import RefreshToken

from apps.restaurants.models import Restaurant
from apps.customers.models import Customer
from apps.customers.services import CustomerService
from apps.accounts.models import User
from apps.orders.models import Order
from apps.ordering.services import (
    PublicMenuService,
    CartValidationService,
    OnlineCheckoutService,
    QRTableService,
    CustomerPortalService,
)
from apps.ordering.serializers import (
    PublicRestaurantSerializer,
    CartValidateSerializer,
    OnlineCheckoutSerializer,
    CustomerRegisterSerializer,
    CustomerLoginSerializer,
)

logger = logging.getLogger("fluxiflow.ordering")


class PublicRestaurantDetailView(APIView):
    """
    Publicly accessible restaurant profile and business hour status by slug.
    """
    permission_classes = [AllowAny]

    def get(self, request, slug):
        restaurant, config, is_open = PublicMenuService.get_public_restaurant(slug)
        serializer = PublicRestaurantSerializer(restaurant)
        data = serializer.data
        data["is_open"] = is_open
        return Response(data, status=status.HTTP_200_OK)


class PublicMenuView(APIView):
    """
    Public digital menu catalog with category grouping, active items, and search.
    """
    permission_classes = [AllowAny]

    def get(self, request, slug):
        restaurant, _, is_open = PublicMenuService.get_public_restaurant(slug)
        category_id = request.query_params.get("category_id")
        search_query = request.query_params.get("search")

        menu_data = PublicMenuService.get_public_categories_and_items(
            restaurant=restaurant,
            category_id=category_id,
            search_query=search_query,
        )

        return Response({
            "restaurant_slug": restaurant.slug,
            "restaurant_name": restaurant.name,
            "currency": restaurant.currency,
            "is_open": is_open,
            "categories": menu_data,
        }, status=status.HTTP_200_OK)


class QRTableValidateView(APIView):
    """
    Validate QR table code and return table session details.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        restaurant_slug = request.query_params.get("restaurant_slug")
        qr_token = request.query_params.get("qr_token")

        if not restaurant_slug or not qr_token:
            raise ValidationError({"qr": ["Both 'restaurant_slug' and 'qr_token' query params are required."]})

        result = QRTableService.validate_table_qr(restaurant_slug, qr_token)
        return Response(result, status=status.HTTP_200_OK)


class CartValidateView(APIView):
    """
    Authoritative server-side cart evaluation and total computation.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CartValidateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        restaurant = Restaurant.objects.filter(slug__iexact=data["restaurant_slug"], is_active=True).first()
        if not restaurant:
            raise NotFound("Restaurant not found.")

        customer = None
        if request.user and request.user.is_authenticated:
            customer = Customer.objects.filter(restaurant=restaurant, email__iexact=request.user.email).first()

        result = CartValidationService.validate_cart(
            restaurant=restaurant,
            items_data=data["items"],
            coupon_code=data.get("coupon_code"),
            customer=customer,
            order_type=data["order_type"],
            table_id=data.get("table_id"),
        )
        public_result = {k: v for k, v in result.items() if not k.startswith("_")}
        return Response(public_result, status=status.HTTP_200_OK)


class OnlineCheckoutView(APIView):
    """
    Authoritative order placement and checkout endpoint.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OnlineCheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        restaurant = Restaurant.objects.filter(slug__iexact=data["restaurant_slug"], is_active=True).first()
        if not restaurant:
            raise NotFound("Restaurant not found.")

        customer = None
        if request.user and request.user.is_authenticated:
            customer = Customer.objects.filter(restaurant=restaurant, email__iexact=request.user.email).first()

        table_id = data.get("table_id")
        if data.get("qr_token"):
            qr_res = QRTableService.validate_table_qr(restaurant.slug, data["qr_token"])
            table_id = qr_res["table_id"]

        result = OnlineCheckoutService.place_order(
            restaurant=restaurant,
            cart_data={"items": data["items"]},
            customer=customer,
            guest_info=data.get("guest_info"),
            order_type=data["order_type"],
            table_id=table_id,
            coupon_code=data.get("coupon_code"),
            payment_method=data.get("payment_method", "PAY_AT_COUNTER"),
            special_instructions=data.get("special_instructions", ""),
            pickup_time_str=data.get("pickup_time"),
            idempotency_key=data.get("idempotency_key"),
        )
        return Response(result, status=status.HTTP_201_CREATED)


class PublicOrderTrackingView(APIView):
    """
    Public order tracking endpoint secured by UUID tracking token.
    """
    permission_classes = [AllowAny]

    def get(self, request, tracking_token):
        result = CustomerPortalService.get_order_tracking(tracking_token)
        return Response(result, status=status.HTTP_200_OK)


class CustomerRegisterView(APIView):
    """
    Customer portal registration endpoint.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CustomerRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        restaurant = Restaurant.objects.filter(slug__iexact=data["restaurant_slug"], is_active=True).first()
        if not restaurant:
            raise NotFound("Restaurant not found.")

        # Check existing user
        if User.objects.filter(email__iexact=data["email"]).exists():
            raise ValidationError({"email": ["An account with this email already exists."]})

        # Create auth user
        user = User.objects.create_user(
            email=data["email"],
            password=data["password"],
            first_name=data["first_name"],
            last_name=data.get("last_name", ""),
        )

        # Create or link Customer CRM profile
        customer = Customer.objects.filter(restaurant=restaurant, email__iexact=data["email"]).first()
        if not customer:
            customer = Customer.objects.create(
                restaurant=restaurant,
                first_name=data["first_name"],
                last_name=data.get("last_name", ""),
                email=data["email"],
                phone=data["phone"],
            )

        refresh = RefreshToken.for_user(user)

        return Response({
            "success": True,
            "access_token": str(refresh.access_token),
            "refresh_token": str(refresh),
            "customer": {
                "id": str(customer.id),
                "name": customer.full_name,
                "email": customer.email,
                "phone": customer.phone,
            }
        }, status=status.HTTP_201_CREATED)


class CustomerLoginView(APIView):
    """
    Customer portal login endpoint.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CustomerLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        restaurant = Restaurant.objects.filter(slug__iexact=data["restaurant_slug"], is_active=True).first()
        if not restaurant:
            raise NotFound("Restaurant not found.")

        user = User.objects.filter(email__iexact=data["email"]).first()
        if not user or not user.check_password(data["password"]):
            raise ValidationError({"non_field_errors": ["Invalid email or password."]})

        customer = Customer.objects.filter(restaurant=restaurant, email__iexact=data["email"]).first()
        refresh = RefreshToken.for_user(user)

        return Response({
            "success": True,
            "access_token": str(refresh.access_token),
            "refresh_token": str(refresh),
            "customer": {
                "id": str(customer.id) if customer else None,
                "name": f"{user.first_name} {user.last_name}".strip(),
                "email": user.email,
                "phone": customer.phone if customer else "",
            }
        }, status=status.HTTP_200_OK)


class CustomerOrdersView(APIView):
    """
    Authenticated customer past orders history.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        restaurant_slug = request.query_params.get("restaurant_slug")
        if not restaurant_slug:
            raise ValidationError({"restaurant_slug": ["'restaurant_slug' query param required."]})

        restaurant = Restaurant.objects.filter(slug__iexact=restaurant_slug, is_active=True).first()
        if not restaurant:
            raise NotFound("Restaurant not found.")

        orders = Order.objects.filter(
            Q(customer__email__iexact=request.user.email) | Q(created_by=request.user),
            restaurant=restaurant
        ).prefetch_related("items").order_by("-created_at")

        results = [
            {
                "order_id": str(o.id),
                "order_number": o.order_number,
                "tracking_token": str(o.tracking_token),
                "order_type": o.order_type,
                "status": o.status,
                "subtotal": str(o.subtotal),
                "total": str(o.total),
                "items_count": o.items.count(),
                "created_at": o.created_at.isoformat(),
            }
            for o in orders[:50]
        ]
        return Response(results, status=status.HTTP_200_OK)
