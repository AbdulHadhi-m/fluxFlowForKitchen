import logging
import math
import secrets
from decimal import Decimal
from typing import Any, Dict, List, Optional
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.customers.models import Customer
from apps.loyalty.models import (
    LoyaltyProgram,
    MembershipTier,
    LoyaltyAccount,
    LoyaltyTransaction,
    LoyaltyTransactionType,
    Reward,
    RewardType,
    GiftCard,
    GiftCardStatus,
    GiftCardTransaction,
    GiftCardTransactionType,
    AccountStatus,
    ProgramStatus,
)
from apps.audit.services import AuditLogService
from apps.audit.models import AuditAction, AuditEntityType

logger = logging.getLogger("fluxiflow.loyalty")

class LoyaltyService:
    """Core domain logic for points earning, redemption, tier calculation, and immutable ledger."""

    @classmethod
    def get_or_create_program(cls, restaurant: Restaurant) -> LoyaltyProgram:
        program, _ = LoyaltyProgram.objects.get_or_create(
            restaurant=restaurant,
            defaults={"name": f"{restaurant.name} Rewards Club", "status": ProgramStatus.ACTIVE}
        )
        return program

    @classmethod
    @transaction.atomic
    def get_or_create_account(cls, restaurant: Restaurant, customer: Customer) -> LoyaltyAccount:
        account = LoyaltyAccount.objects.filter(restaurant=restaurant, customer=customer).first()
        if not account:
            # Assign starter tier (rank 1) if exists
            starter_tier = MembershipTier.objects.filter(restaurant=restaurant, rank=1, is_active=True).first()
            account = LoyaltyAccount.objects.create(
                restaurant=restaurant,
                customer=customer,
                current_tier=starter_tier,
                points_balance=0,
                status=AccountStatus.ACTIVE,
            )
        return account

    @classmethod
    @transaction.atomic
    def earn_points(
        cls,
        restaurant: Restaurant,
        customer: Customer,
        spend_amount: Decimal,
        order_id: Optional[str] = None,
        actor_user: Optional[User] = None,
    ) -> Optional[LoyaltyTransaction]:
        program = cls.get_or_create_program(restaurant)
        if program.status != ProgramStatus.ACTIVE or not program.points_enabled:
            return None

        # Idempotency check: Don't award points twice for same order
        if order_id:
            existing = LoyaltyTransaction.objects.filter(
                restaurant=restaurant,
                loyalty_account__customer=customer,
                transaction_type=LoyaltyTransactionType.EARN,
                reference_type="ORDER",
                reference_id=str(order_id),
            ).exists()
            if existing:
                logger.warning(f"Points already earned for order {order_id} by customer {customer.id}")
                return None

        account = LoyaltyAccount.objects.select_for_update().get(
            id=cls.get_or_create_account(restaurant, customer).id
        )
        if account.status != AccountStatus.ACTIVE:
            return None

        # Ensure tier is up-to-date with customer's total spend
        cls.evaluate_and_update_tier(account)

        multiplier = account.current_tier.points_multiplier if account.current_tier else Decimal("1.00")
        earned_points = math.floor(float(spend_amount * program.earning_rate * multiplier))
        if earned_points <= 0:
            return None

        account.points_balance += earned_points
        account.lifetime_points_earned += earned_points
        account.save(update_fields=["points_balance", "lifetime_points_earned"])

        tx = LoyaltyTransaction.objects.create(
            restaurant=restaurant,
            loyalty_account=account,
            transaction_type=LoyaltyTransactionType.EARN,
            points=earned_points,
            balance_after=account.points_balance,
            reference_type="ORDER" if order_id else "MANUAL",
            reference_id=str(order_id) if order_id else "",
            description=f"Points earned on order spend of ${spend_amount}",
            actor_user=actor_user,
        )

        cls.evaluate_and_update_tier(account)
        return tx

    @classmethod
    @transaction.atomic
    def redeem_points(
        cls,
        restaurant: Restaurant,
        customer: Customer,
        points: int,
        order_id: Optional[str] = None,
        actor_user: Optional[User] = None,
    ) -> Decimal:
        if points <= 0:
            raise ValidationError("Points to redeem must be greater than zero.")

        program = cls.get_or_create_program(restaurant)
        if program.status != ProgramStatus.ACTIVE or not program.redemption_enabled:
            raise ValidationError("Loyalty redemption is currently disabled.")

        if points < program.min_points_redemption:
            raise ValidationError(f"Minimum redemption is {program.min_points_redemption} points.")

        account = LoyaltyAccount.objects.select_for_update().get(
            id=cls.get_or_create_account(restaurant, customer).id
        )
        if account.status != AccountStatus.ACTIVE:
            raise ValidationError("Loyalty account is not active.")

        if account.points_balance < points:
            raise ValidationError(f"Insufficient points. Available: {account.points_balance}, requested: {points}.")

        # Deduct points atomically
        account.points_balance -= points
        account.lifetime_points_redeemed += points
        account.save(update_fields=["points_balance", "lifetime_points_redeemed"])

        discount_value = Decimal(str(points)) * program.redemption_rate

        LoyaltyTransaction.objects.create(
            restaurant=restaurant,
            loyalty_account=account,
            transaction_type=LoyaltyTransactionType.REDEEM,
            points=-points,
            balance_after=account.points_balance,
            reference_type="ORDER" if order_id else "MANUAL",
            reference_id=str(order_id) if order_id else "",
            description=f"Redeemed {points} points for ${discount_value:.2f} discount",
            actor_user=actor_user,
        )

        return discount_value

    @classmethod
    @transaction.atomic
    def adjust_points(
        cls,
        restaurant: Restaurant,
        customer: Customer,
        points_delta: int,
        reason: str,
        actor_user: Optional[User] = None,
    ) -> LoyaltyTransaction:
        if points_delta == 0:
            raise ValidationError("Points adjustment cannot be zero.")
        if not reason.strip():
            raise ValidationError("A reason is mandatory for manual point adjustments.")

        account = LoyaltyAccount.objects.select_for_update().get(
            id=cls.get_or_create_account(restaurant, customer).id
        )

        new_balance = account.points_balance + points_delta
        if new_balance < 0:
            raise ValidationError("Cannot adjust points below zero.")

        account.points_balance = new_balance
        if points_delta > 0:
            account.lifetime_points_earned += points_delta
        account.save(update_fields=["points_balance", "lifetime_points_earned"])

        tx = LoyaltyTransaction.objects.create(
            restaurant=restaurant,
            loyalty_account=account,
            transaction_type=LoyaltyTransactionType.ADJUSTMENT,
            points=points_delta,
            balance_after=new_balance,
            reference_type="MANUAL",
            description=reason.strip(),
            actor_user=actor_user,
        )

        AuditLogService.record(
            action=AuditAction.UPDATE,
            entity_type=AuditEntityType.USER,
            entity_id=str(account.id),
            description=f"Manual loyalty adjustment: {points_delta:+d} points for {customer.full_name}. Reason: {reason}",
            restaurant=restaurant,
            actor_user=actor_user,
        )

        cls.evaluate_and_update_tier(account)
        return tx

    @classmethod
    def evaluate_and_update_tier(cls, loyalty_account: LoyaltyAccount) -> Optional[MembershipTier]:
        customer = loyalty_account.customer
        tiers = MembershipTier.objects.filter(
            restaurant=loyalty_account.restaurant,
            is_active=True
        ).order_by("-qualification_spend", "-rank")

        eligible_tier = None
        for tier in tiers:
            if customer.total_spend >= tier.qualification_spend:
                eligible_tier = tier
                break

        if eligible_tier and loyalty_account.current_tier != eligible_tier:
            old_tier_name = loyalty_account.current_tier.name if loyalty_account.current_tier else "None"
            loyalty_account.current_tier = eligible_tier
            loyalty_account.save(update_fields=["current_tier"])

            logger.info(f"Customer {customer.id} tier upgraded: {old_tier_name} -> {eligible_tier.name}")
            return eligible_tier
        return loyalty_account.current_tier


class GiftCardService:
    """Core domain logic for gift cards, security tokens, and balance operations."""

    @classmethod
    @transaction.atomic
    def issue_gift_card(
        cls,
        restaurant: Restaurant,
        initial_balance: Decimal,
        customer: Optional[Customer] = None,
        currency: str = "USD",
        actor_user: Optional[User] = None,
    ) -> GiftCard:
        if initial_balance <= Decimal("0.00"):
            raise ValidationError("Initial balance must be greater than zero.")

        card_number = GiftCard.generate_card_number()
        secret_code = secrets.token_hex(16)

        gift_card = GiftCard.objects.create(
            restaurant=restaurant,
            card_number=card_number,
            secret_code=secret_code,
            customer=customer,
            initial_balance=initial_balance,
            current_balance=initial_balance,
            currency=currency,
            status=GiftCardStatus.ACTIVE,
        )

        GiftCardTransaction.objects.create(
            gift_card=gift_card,
            transaction_type=GiftCardTransactionType.ISSUE,
            amount=initial_balance,
            balance_after=initial_balance,
            description=f"Initial issuance of ${initial_balance}",
            actor_user=actor_user,
        )

        AuditLogService.record(
            action=AuditAction.CREATE,
            entity_type=AuditEntityType.PAYMENT,
            entity_id=str(gift_card.id),
            description=f"Issued gift card {card_number} with initial balance of ${initial_balance}",
            restaurant=restaurant,
            actor_user=actor_user,
        )

        return gift_card

    @classmethod
    @transaction.atomic
    def redeem_gift_card(
        cls,
        restaurant: Restaurant,
        card_number: str,
        amount: Decimal,
        reference_id: str = "",
        actor_user: Optional[User] = None,
    ) -> GiftCardTransaction:
        if amount <= Decimal("0.00"):
            raise ValidationError("Redemption amount must be greater than zero.")

        gift_card = GiftCard.objects.select_for_update().filter(
            restaurant=restaurant,
            card_number=card_number.strip()
        ).first()

        if not gift_card:
            raise ValidationError({"card_number": "Gift card not found."})

        if gift_card.status != GiftCardStatus.ACTIVE:
            raise ValidationError({"status": f"Gift card is {gift_card.status} and cannot be redeemed."})

        if gift_card.current_balance < amount:
            raise ValidationError({
                "amount": f"Insufficient balance. Available: ${gift_card.current_balance}, requested: ${amount}."
            })

        gift_card.current_balance -= amount
        if gift_card.current_balance == Decimal("0.00"):
            gift_card.status = GiftCardStatus.DEPLETED
        gift_card.save(update_fields=["current_balance", "status"])

        tx = GiftCardTransaction.objects.create(
            gift_card=gift_card,
            transaction_type=GiftCardTransactionType.REDEEM,
            amount=-amount,
            balance_after=gift_card.current_balance,
            reference_type="BILL" if reference_id else "MANUAL",
            reference_id=reference_id,
            description=f"Redeemed ${amount} on order checkout",
            actor_user=actor_user,
        )

        return tx
