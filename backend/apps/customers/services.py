import logging
from datetime import datetime, date, time
from decimal import Decimal
from typing import Any, Dict, List, Optional
from django.db import transaction
from django.db.models import Sum, Count, Avg, Max
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.tables.models import RestaurantTable
from apps.customers.models import (
    Customer,
    CustomerTag,
    CustomerVisit,
    Reservation,
    ReservationStatus,
)
from apps.audit.services import AuditLogService
from apps.audit.models import AuditAction, AuditEntityType
from apps.notifications.services import NotificationService

logger = logging.getLogger("fluxiflow.customers")

class CustomerService:
    """Business operations for customer profiles, visits, and merging."""

    @classmethod
    @transaction.atomic
    def create_customer(
        cls,
        restaurant: Restaurant,
        first_name: str,
        phone: str,
        last_name: str = "",
        email: str = "",
        date_of_birth: Optional[date] = None,
        gender: str = Customer.GenderChoices.UNSPECIFIED,
        dietary_preferences: Optional[List[str]] = None,
        allergies: Optional[List[str]] = None,
        internal_notes: str = "",
        tag_ids: Optional[List[str]] = None,
        actor_user: Optional[User] = None,
    ) -> Customer:
        if Customer.objects.filter(restaurant=restaurant, phone=phone.strip()).exists():
            raise ValidationError({"phone": "A customer with this phone number already exists."})

        customer = Customer.objects.create(
            restaurant=restaurant,
            first_name=first_name.strip(),
            last_name=last_name.strip(),
            phone=phone.strip(),
            email=email.strip().lower() if email else "",
            date_of_birth=date_of_birth,
            gender=gender,
            dietary_preferences=dietary_preferences or [],
            allergies=allergies or [],
            internal_notes=internal_notes.strip(),
        )

        if tag_ids:
            tags = CustomerTag.objects.filter(restaurant=restaurant, id__in=tag_ids)
            customer.tags.set(tags)

        AuditLogService.record(
            action=AuditAction.CREATE,
            entity_type=AuditEntityType.USER,
            entity_id=str(customer.id),
            description=f"Created customer profile for {customer.full_name} ({customer.phone})",
            restaurant=restaurant,
            actor_user=actor_user,
        )

        def emit_customer_created():
            from apps.workflows.events import publish_event_via_bus
            publish_event_via_bus(
                restaurant=restaurant,
                event_type="CUSTOMER_CREATED",
                entity_type="CUSTOMER",
                entity_id=str(customer.id),
                payload={
                    "customer_id": str(customer.id),
                    "first_name": customer.first_name,
                    "last_name": customer.last_name,
                    "phone_masked": (customer.phone[:3] + "***" + customer.phone[-3:]) if len(customer.phone) >= 6 else "***",
                    "email": customer.email,
                },
            )
        transaction.on_commit(emit_customer_created)

        return customer

    @classmethod
    @transaction.atomic
    def update_customer(
        cls,
        customer: Customer,
        payload: Dict[str, Any],
        actor_user: Optional[User] = None,
    ) -> Customer:
        before = {
            "first_name": customer.first_name,
            "last_name": customer.last_name,
            "phone": customer.phone,
            "email": customer.email,
        }

        tag_ids = payload.pop("tag_ids", None)
        for k, v in payload.items():
            if hasattr(customer, k):
                setattr(customer, k, v)
        customer.save()

        if tag_ids is not None:
            tags = CustomerTag.objects.filter(restaurant=customer.restaurant, id__in=tag_ids)
            customer.tags.set(tags)

        after = {
            "first_name": customer.first_name,
            "last_name": customer.last_name,
            "phone": customer.phone,
            "email": customer.email,
        }

        AuditLogService.record(
            action=AuditAction.UPDATE,
            entity_type=AuditEntityType.USER,
            entity_id=str(customer.id),
            description=f"Updated customer profile for {customer.full_name}",
            restaurant=customer.restaurant,
            actor_user=actor_user,
            before_data=before,
            after_data=after,
        )

        return customer

    @classmethod
    @transaction.atomic
    def record_visit(
        cls,
        customer: Customer,
        restaurant: Restaurant,
        spend_amount: Decimal = Decimal("0.00"),
        party_size: int = 2,
        table: Optional[RestaurantTable] = None,
        order_id: Optional[Any] = None,
        notes: str = "",
    ) -> CustomerVisit:
        visit = CustomerVisit.objects.create(
            restaurant=restaurant,
            customer=customer,
            table=table,
            order_id=order_id,
            party_size=party_size,
            spend_amount=spend_amount,
            notes=notes,
        )

        # Update customer aggregates
        customer.total_visits += 1
        customer.total_spend += spend_amount
        customer.last_visit_at = timezone.now()
        customer.save(update_fields=["total_visits", "total_spend", "last_visit_at"])

        return visit

    @classmethod
    @transaction.atomic
    def merge_customers(
        cls,
        primary_customer: Customer,
        duplicate_customer: Customer,
        actor_user: Optional[User] = None,
    ) -> Customer:
        if primary_customer.id == duplicate_customer.id:
            raise ValidationError("Cannot merge customer into itself.")

        # Transfer visits and reservations
        duplicate_customer.visits.update(customer=primary_customer)
        duplicate_customer.reservations.update(customer=primary_customer)

        # Merge tags
        primary_customer.tags.add(*duplicate_customer.tags.all())

        # Recalculate aggregates
        primary_customer.total_visits += duplicate_customer.total_visits
        primary_customer.total_spend += duplicate_customer.total_spend
        if duplicate_customer.last_visit_at and (
            not primary_customer.last_visit_at or duplicate_customer.last_visit_at > primary_customer.last_visit_at
        ):
            primary_customer.last_visit_at = duplicate_customer.last_visit_at

        primary_customer.save()

        AuditLogService.record(
            action=AuditAction.DELETE,
            entity_type=AuditEntityType.USER,
            entity_id=str(duplicate_customer.id),
            description=f"Merged customer {duplicate_customer.full_name} ({duplicate_customer.phone}) into {primary_customer.full_name}",
            restaurant=primary_customer.restaurant,
            actor_user=actor_user,
        )

        duplicate_customer.delete()
        return primary_customer

    @classmethod
    def get_crm_analytics(cls, restaurant: Restaurant) -> Dict[str, Any]:
        customers = Customer.objects.filter(restaurant=restaurant, is_active=True)
        total_customers = customers.count()
        total_spend = customers.aggregate(total=Sum("total_spend"))["total"] or Decimal("0.00")
        avg_spend = customers.aggregate(avg=Avg("total_spend"))["avg"] or Decimal("0.00")
        repeat_customers = customers.filter(total_visits__gt=1).count()

        return {
            "total_customers": total_customers,
            "repeat_customers": repeat_customers,
            "repeat_rate_percentage": round((repeat_customers / total_customers * 100), 1) if total_customers > 0 else 0,
            "total_spend": total_spend,
            "average_customer_spend": round(avg_spend, 2),
        }


class ReservationService:
    """Business operations for table reservations and conflict resolution."""

    @classmethod
    def generate_reservation_number(cls, restaurant: Restaurant, res_date: date) -> str:
        date_str = res_date.strftime("%Y%m%d")
        count = Reservation.objects.filter(restaurant=restaurant, reservation_date=res_date).count() + 1
        return f"RES-{date_str}-{count:03d}"

    @classmethod
    @transaction.atomic
    def create_reservation(
        cls,
        restaurant: Restaurant,
        customer: Customer,
        reservation_date: date,
        reservation_time: time,
        party_size: int = 2,
        table: Optional[RestaurantTable] = None,
        special_requests: str = "",
        actor_user: Optional[User] = None,
    ) -> Reservation:
        # Table conflict check if table is assigned
        if table:
            if table.capacity < party_size:
                raise ValidationError({
                    "table": f"Selected table capacity ({table.capacity}) is insufficient for party size ({party_size})."
                })

            existing_conflict = Reservation.objects.filter(
                restaurant=restaurant,
                table=table,
                reservation_date=reservation_date,
                reservation_time=reservation_time,
                status__in=[ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
            ).exists()
            if existing_conflict:
                raise ValidationError({"table": "This table already has a confirmed reservation at the selected time."})

        res_number = cls.generate_reservation_number(restaurant, reservation_date)

        reservation = Reservation.objects.create(
            reservation_number=res_number,
            restaurant=restaurant,
            customer=customer,
            table=table,
            reservation_date=reservation_date,
            reservation_time=reservation_time,
            party_size=party_size,
            status=ReservationStatus.CONFIRMED,
            special_requests=special_requests.strip(),
        )

        AuditLogService.record(
            action=AuditAction.CREATE,
            entity_type=AuditEntityType.ORDER,
            entity_id=str(reservation.id),
            description=f"Created reservation {res_number} for {customer.full_name} ({party_size} guests)",
            restaurant=restaurant,
            actor_user=actor_user,
        )

        def emit_reservation_created():
            from apps.workflows.events import publish_event_via_bus
            publish_event_via_bus(
                restaurant=restaurant,
                event_type="RESERVATION_CREATED",
                entity_type="RESERVATION",
                entity_id=str(reservation.id),
                payload={
                    "reservation_id": str(reservation.id),
                    "reservation_number": res_number,
                    "customer_id": str(customer.id),
                    "party_size": party_size,
                    "reservation_date": reservation_date.isoformat(),
                    "reservation_time": reservation_time.isoformat(),
                    "table_id": str(table.id) if table else "",
                },
            )
        transaction.on_commit(emit_reservation_created)

        return reservation

    @classmethod
    @transaction.atomic
    def update_reservation_status(
        cls,
        reservation: Reservation,
        new_status: str,
        cancellation_reason: str = "",
        actor_user: Optional[User] = None,
    ) -> Reservation:
        old_status = reservation.status
        reservation.status = new_status
        if cancellation_reason:
            reservation.cancellation_reason = cancellation_reason
        reservation.save()

        # If checked in: automatically log customer visit
        if new_status == ReservationStatus.CHECKED_IN:
            CustomerService.record_visit(
                customer=reservation.customer,
                restaurant=reservation.restaurant,
                party_size=reservation.party_size,
                table=reservation.table,
                notes=f"Reservation {reservation.reservation_number}",
            )

        def emit_reservation_cancelled():
            if new_status != ReservationStatus.CANCELLED:
                return
            from apps.workflows.events import publish_event_via_bus
            publish_event_via_bus(
                restaurant=reservation.restaurant,
                event_type="RESERVATION_CANCELLED",
                entity_type="RESERVATION",
                entity_id=str(reservation.id),
                payload={
                    "reservation_id": str(reservation.id),
                    "reservation_number": reservation.reservation_number,
                    "customer_id": str(reservation.customer_id),
                    "cancellation_reason": cancellation_reason,
                },
            )
        transaction.on_commit(emit_reservation_cancelled)

        AuditLogService.record(
            action=AuditAction.STATUS_CHANGED,
            entity_type=AuditEntityType.ORDER,
            entity_id=str(reservation.id),
            description=f"Reservation {reservation.reservation_number} status updated to {new_status}",
            restaurant=reservation.restaurant,
            actor_user=actor_user,
            before_data={"status": old_status},
            after_data={"status": new_status},
        )

        return reservation
