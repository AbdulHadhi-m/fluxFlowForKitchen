import logging
from decimal import Decimal
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, NotFound, ValidationError
from django.db.models import Q
from apps.rbac.services import RBACService
from apps.restaurants.services import RestaurantService
from apps.customers.models import Customer
from apps.loyalty.models import (
    LoyaltyProgram,
    MembershipTier,
    LoyaltyAccount,
    LoyaltyTransaction,
    Reward,
    GiftCard,
)
from apps.loyalty.serializers import (
    LoyaltyProgramSerializer,
    MembershipTierSerializer,
    LoyaltyAccountSerializer,
    LoyaltyTransactionSerializer,
    RewardSerializer,
    GiftCardSerializer,
)
from apps.loyalty.services import LoyaltyService, GiftCardService

logger = logging.getLogger("fluxiflow.loyalty")

class LoyaltyBaseView(APIView):
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


class LoyaltyProgramView(LoyaltyBaseView):
    def get(self, request):
        self.check_user_permission("loyalty.view")
        restaurant = self.get_restaurant()
        program = LoyaltyService.get_or_create_program(restaurant)
        return Response({"success": True, "data": LoyaltyProgramSerializer(program).data})

    def patch(self, request):
        self.check_user_permission("loyalty.manage")
        restaurant = self.get_restaurant()
        program = LoyaltyService.get_or_create_program(restaurant)
        serializer = LoyaltyProgramSerializer(program, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"success": True, "data": serializer.data})


class LoyaltyAccountListView(LoyaltyBaseView):
    def get(self, request):
        self.check_user_permission("loyalty.view")
        restaurant = self.get_restaurant()
        queryset = LoyaltyAccount.objects.filter(restaurant=restaurant).select_related("customer", "current_tier")

        search = request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(customer__first_name__icontains=search) |
                Q(customer__last_name__icontains=search) |
                Q(customer__phone__icontains=search)
            )

        tier_id = request.query_params.get("tier")
        if tier_id:
            queryset = queryset.filter(current_tier_id=tier_id)

        serializer = LoyaltyAccountSerializer(queryset, many=True)
        return Response({"success": True, "data": serializer.data})


class LoyaltyAccountDetailView(LoyaltyBaseView):
    def get(self, request, pk):
        self.check_user_permission("loyalty.view")
        restaurant = self.get_restaurant()
        try:
            account = LoyaltyAccount.objects.select_related("customer", "current_tier").get(restaurant=restaurant, id=pk)
        except LoyaltyAccount.DoesNotExist:
            raise NotFound("Loyalty account not found.")

        return Response({"success": True, "data": LoyaltyAccountSerializer(account).data})


class LoyaltyAccountTransactionsView(LoyaltyBaseView):
    def get(self, request, pk):
        self.check_user_permission("loyalty.view")
        restaurant = self.get_restaurant()
        try:
            account = LoyaltyAccount.objects.get(restaurant=restaurant, id=pk)
        except LoyaltyAccount.DoesNotExist:
            raise NotFound("Loyalty account not found.")

        txs = account.transactions.all()[:100]
        return Response({"success": True, "data": LoyaltyTransactionSerializer(txs, many=True).data})


class LoyaltyAccountAdjustView(LoyaltyBaseView):
    def post(self, request, pk):
        self.check_user_permission("loyalty.adjust")
        restaurant = self.get_restaurant()
        try:
            account = LoyaltyAccount.objects.get(restaurant=restaurant, id=pk)
        except LoyaltyAccount.DoesNotExist:
            raise NotFound("Loyalty account not found.")

        points_delta = request.data.get("points_delta")
        reason = request.data.get("reason", "")
        if points_delta is None:
            raise ValidationError({"points_delta": "Required."})

        tx = LoyaltyService.adjust_points(
            restaurant=restaurant,
            customer=account.customer,
            points_delta=int(points_delta),
            reason=reason,
            actor_user=request.user,
        )

        return Response({"success": True, "data": LoyaltyTransactionSerializer(tx).data})


class MembershipTierListCreateView(LoyaltyBaseView):
    def get(self, request):
        self.check_user_permission("loyalty.view")
        restaurant = self.get_restaurant()
        tiers = MembershipTier.objects.filter(restaurant=restaurant)
        return Response({"success": True, "data": MembershipTierSerializer(tiers, many=True).data})

    def post(self, request):
        self.check_user_permission("loyalty.manage")
        restaurant = self.get_restaurant()
        serializer = MembershipTierSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tier = serializer.save(restaurant=restaurant)
        return Response({"success": True, "data": MembershipTierSerializer(tier).data}, status=status.HTTP_201_CREATED)


class RewardListCreateView(LoyaltyBaseView):
    def get(self, request):
        self.check_user_permission("loyalty.view")
        restaurant = self.get_restaurant()
        rewards = Reward.objects.filter(restaurant=restaurant)
        return Response({"success": True, "data": RewardSerializer(rewards, many=True).data})

    def post(self, request):
        self.check_user_permission("loyalty.manage")
        restaurant = self.get_restaurant()
        serializer = RewardSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reward = serializer.save(restaurant=restaurant)
        return Response({"success": True, "data": RewardSerializer(reward).data}, status=status.HTTP_201_CREATED)


class GiftCardListCreateView(LoyaltyBaseView):
    def get(self, request):
        self.check_user_permission("gift_cards.view")
        restaurant = self.get_restaurant()
        queryset = GiftCard.objects.filter(restaurant=restaurant).select_related("customer")
        serializer = GiftCardSerializer(queryset, many=True)
        return Response({"success": True, "data": serializer.data})

    def post(self, request):
        self.check_user_permission("gift_cards.manage")
        restaurant = self.get_restaurant()

        initial_balance = Decimal(str(request.data.get("initial_balance", "0.00")))
        customer_id = request.data.get("customer")
        customer = None
        if customer_id:
            customer = Customer.objects.filter(restaurant=restaurant, id=customer_id).first()

        gift_card = GiftCardService.issue_gift_card(
            restaurant=restaurant,
            initial_balance=initial_balance,
            customer=customer,
            currency=request.data.get("currency", "USD"),
            actor_user=request.user,
        )

        return Response({"success": True, "data": GiftCardSerializer(gift_card).data}, status=status.HTTP_201_CREATED)


class GiftCardDetailView(LoyaltyBaseView):
    def get(self, request, pk):
        self.check_user_permission("gift_cards.view")
        restaurant = self.get_restaurant()
        try:
            card = GiftCard.objects.select_related("customer").get(restaurant=restaurant, id=pk)
        except GiftCard.DoesNotExist:
            raise NotFound("Gift card not found.")

        return Response({"success": True, "data": GiftCardSerializer(card).data})


class GiftCardRedeemView(LoyaltyBaseView):
    def post(self, request):
        self.check_user_permission("gift_cards.redeem")
        restaurant = self.get_restaurant()

        card_number = request.data.get("card_number")
        amount = Decimal(str(request.data.get("amount", "0.00")))
        if not card_number:
            raise ValidationError({"card_number": "Required."})

        tx = GiftCardService.redeem_gift_card(
            restaurant=restaurant,
            card_number=card_number,
            amount=amount,
            reference_id=request.data.get("reference_id", ""),
            actor_user=request.user,
        )

        return Response({"success": True, "message": f"Successfully redeemed ${amount}", "balance_after": str(tx.balance_after)})
