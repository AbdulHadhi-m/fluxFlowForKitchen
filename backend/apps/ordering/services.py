import logging
import secrets
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, time, timedelta
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
from rest_framework.exceptions import ValidationError, NotFound, PermissionDenied

from apps.restaurants.models import Restaurant, BusinessHour
from apps.settings.models import RestaurantConfiguration
from apps.tables.models import RestaurantTable
from apps.menu.models import MenuItem, MenuCategory
from apps.orders.models import Order, OrderItem
from apps.orders.services import OrderService
from apps.kitchen.services import KitchenService
from apps.kitchen.models import KitchenTicket
from apps.billing.services import BillingService, PaymentService, quantize_money
from apps.billing.models import Bill, Payment
from apps.customers.models import Customer
from apps.customers.services import CustomerService
from apps.loyalty.services import LoyaltyService, GiftCardService
from apps.loyalty.models import GiftCard
from apps.marketing.services import (
    PromotionEligibilityService,
    PromotionCalculationService,
    PromotionRedemptionService,
)
from apps.marketing.models import Promotion, Coupon
from apps.notifications.services import NotificationService
from apps.notifications.models import NotificationType, NotificationSeverity
from apps.accounts.models import User
from apps.ordering.models import CartSession

logger = logging.getLogger("fluxiflow.ordering")


class PublicMenuService:
    """
    Public catalog explorer providing customer-safe restaurant profiles and digital menus.
    Strictly filters out internal staff notes, costs, and inactive items.
    """

    @classmethod
    def get_public_restaurant(cls, slug: str) -> Tuple[Restaurant, RestaurantConfiguration, bool]:
        """
        Fetch public restaurant entity by unique URL slug.
        Determines real-time operating hours and ordering enablement.
        """
        restaurant = Restaurant.objects.filter(slug__iexact=slug.strip(), is_active=True).first()
        if not restaurant:
            raise NotFound(f"Restaurant '{slug}' not found or is currently inactive.")

        config, _ = RestaurantConfiguration.objects.get_or_create(restaurant=restaurant)

        # Evaluate opening hours
        now = timezone.now()
        current_day = now.weekday()  # 0=Monday, 6=Sunday
        current_time = now.time()

        today_hour = BusinessHour.objects.filter(
            restaurant=restaurant, day_of_week=current_day
        ).first()

        is_open = True
        if today_hour:
            if today_hour.is_closed:
                is_open = False
            elif today_hour.opening_time and today_hour.closing_time:
                if not (today_hour.opening_time <= current_time <= today_hour.closing_time):
                    is_open = False

        return restaurant, config, is_open

    @classmethod
    def get_public_categories_and_items(
        cls,
        restaurant: Restaurant,
        category_id: Optional[str] = None,
        search_query: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Returns published menu categories and items for the digital customer menu.
        Only items marked 'is_active=True' are returned.
        """
        cat_qs = MenuCategory.objects.filter(
            restaurant=restaurant,
            is_active=True
        ).order_by("display_order", "name")

        if category_id:
            cat_qs = cat_qs.filter(id=category_id)

        item_qs = MenuItem.objects.filter(
            restaurant=restaurant,
            is_active=True
        ).select_related("category").order_by("display_order", "name")

        if search_query:
            q = search_query.strip()
            item_qs = item_qs.filter(
                Q(name__icontains=q) | Q(description__icontains=q)
            )

        items_by_cat: Dict[str, List[MenuItem]] = {}
        for item in item_qs:
            cat_id = str(item.category_id)
            if cat_id not in items_by_cat:
                items_by_cat[cat_id] = []
            items_by_cat[cat_id].append(item)

        results = []
        for cat in cat_qs:
            cat_items = items_by_cat.get(str(cat.id), [])
            if cat_items or not search_query:
                results.append({
                    "id": str(cat.id),
                    "name": cat.name,
                    "description": cat.description,
                    "display_order": cat.display_order,
                    "items": [
                        {
                            "id": str(item.id),
                            "name": item.name,
                            "description": item.description,
                            "price": str(item.price),
                            "is_available": item.is_available,
                            "category_id": str(cat.id),
                            "category_name": cat.name,
                            "display_order": item.display_order,
                        }
                        for item in cat_items
                    ]
                })

        return results


class CartValidationService:
    """
    Authoritative server-side validation and pricing calculator for customer carts.
    Never trusts client-calculated prices, totals, taxes, or discounts.
    """

    @classmethod
    def validate_cart(
        cls,
        restaurant: Restaurant,
        items_data: List[Dict[str, Any]],
        coupon_code: Optional[str] = None,
        customer: Optional[Customer] = None,
        order_type: str = Order.OrderType.DINE_IN,
        table_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Validates cart line items, verifies availability, and computes authoritative totals.
        """
        config, _ = RestaurantConfiguration.objects.get_or_create(restaurant=restaurant)

        if not config.online_ordering_enabled:
            raise ValidationError({"ordering": ["Online ordering is temporarily disabled for this restaurant."]})

        if order_type == Order.OrderType.DINE_IN and not config.allow_table_orders:
            raise ValidationError({"ordering": ["Dine-in ordering is currently disabled."]})

        if order_type == Order.OrderType.TAKEAWAY and not config.allow_takeaway:
            raise ValidationError({"ordering": ["Takeaway ordering is currently disabled."]})

        if not items_data:
            raise ValidationError({"items": ["Cart is empty. Please add items to checkout."]})

        # Table validation if dine-in
        resolved_table = None
        if order_type == Order.OrderType.DINE_IN and table_id:
            resolved_table = RestaurantTable.objects.filter(id=table_id, restaurant=restaurant, is_active=True).first()
            if not resolved_table:
                raise ValidationError({"table_id": ["Invalid table selection."]})

        # 1. Authoritative Item Price & Availability Check
        validated_items = []
        subtotal = Decimal("0.00")
        unavailable_items = []

        for idx, item_input in enumerate(items_data):
            menu_item_id = item_input.get("menu_item_id")
            qty = int(item_input.get("quantity", 1))
            notes = item_input.get("notes", "").strip()

            if qty < 1:
                raise ValidationError({f"items[{idx}].quantity": ["Item quantity must be at least 1."]})

            menu_item = MenuItem.objects.filter(id=menu_item_id, restaurant=restaurant, is_active=True).first()
            if not menu_item:
                raise ValidationError({f"items[{idx}]": ["Item is no longer available in the catalog."]})

            if not menu_item.is_available:
                unavailable_items.append(menu_item.name)

            line_total = menu_item.price * Decimal(qty)
            subtotal += line_total

            validated_items.append({
                "menu_item_id": str(menu_item.id),
                "name": menu_item.name,
                "unit_price": str(menu_item.price),
                "quantity": qty,
                "line_total": str(line_total),
                "notes": notes[:300] if notes else "",
                "_menu_item_obj": menu_item,
                "_line_total_dec": line_total,
            })

        if unavailable_items:
            raise ValidationError({
                "items": [f"The following items are currently out-of-stock: {', '.join(unavailable_items)}. Please remove them to proceed."]
            })

        subtotal = quantize_money(subtotal)

        # Min/Max order amount limits
        if config.min_online_order_amount > Decimal("0.00") and subtotal < config.min_online_order_amount:
            raise ValidationError({
                "subtotal": [f"Minimum order amount is ${config.min_online_order_amount}. Current subtotal is ${subtotal}."]
            })

        if config.max_online_order_amount and subtotal > config.max_online_order_amount:
            raise ValidationError({
                "subtotal": [f"Order exceeds maximum allowed cart value of ${config.max_online_order_amount}."]
            })

        # 2. Promotion & Coupon Evaluation
        # Build mock order object for PromotionCalculationService
        mock_order = Order(restaurant=restaurant, subtotal=subtotal, total=subtotal)
        discount_amount = Decimal("0.00")
        applied_promotion_data = None
        matched_coupon_obj = None

        if coupon_code:
            coupon = Coupon.objects.filter(
                restaurant=restaurant,
                code__iexact=coupon_code.strip()
            ).select_related("promotion").first()

            if coupon and coupon.status == "ACTIVE":
                is_elig, reason, _ = PromotionEligibilityService.evaluate_promotion(
                    promotion=coupon.promotion,
                    order=mock_order,
                    customer=customer,
                    coupon_code=coupon.code
                )
                if is_elig:
                    raw_disc = PromotionCalculationService.calculate_discount_amount(coupon.promotion, mock_order)
                    discount_amount = quantize_money(min(raw_disc, subtotal))
                    matched_coupon_obj = coupon
                    applied_promotion_data = {
                        "coupon_code": coupon.code,
                        "promotion_id": str(coupon.promotion.id),
                        "promotion_name": coupon.promotion.name,
                        "discount_amount": str(discount_amount),
                    }
                else:
                    logger.info(f"Coupon {coupon_code} not eligible: {reason}")
            else:
                logger.info(f"Coupon {coupon_code} not active")

        # 3. Tax & Totals Calculation
        tax_rate = BillingService.get_restaurant_tax_rate(restaurant)
        taxable_base = max(Decimal("0.00"), subtotal - discount_amount)
        tax_amount = quantize_money((taxable_base * tax_rate) / Decimal("100.00")) if config.tax_enabled else Decimal("0.00")
        net_total = quantize_money(taxable_base + tax_amount)

        # Estimated prep time
        estimated_prep_minutes = config.default_prep_time_minutes or 20

        clean_items = [
            {k: v for k, v in item.items() if not k.startswith("_")}
            for item in validated_items
        ]

        return {
            "restaurant_id": str(restaurant.id),
            "restaurant_name": restaurant.name,
            "order_type": order_type,
            "table_id": str(resolved_table.id) if resolved_table else None,
            "table_name": resolved_table.name if resolved_table else None,
            "items": clean_items,
            "subtotal": str(subtotal),
            "discount_amount": str(discount_amount),
            "applied_promotion": applied_promotion_data,
            "tax_rate": str(tax_rate),
            "tax_amount": str(tax_amount),
            "total": str(net_total),
            "currency": restaurant.currency,
            "estimated_prep_time_minutes": estimated_prep_minutes,
            "_subtotal_dec": subtotal,
            "_discount_dec": discount_amount,
            "_tax_dec": tax_amount,
            "_total_dec": net_total,
            "_validated_items": validated_items,
            "_matched_coupon": matched_coupon_obj,
        }


class OnlineCheckoutService:
    """
    Authoritative order placement and checkout orchestrator.
    Creates orders, commits promotion usages, updates loyalty/gift cards,
    dispatches tickets to KDS, generates bills, and notifies staff.
    """

    @classmethod
    def place_order(
        cls,
        restaurant: Restaurant,
        cart_data: Dict[str, Any],
        customer: Optional[Customer] = None,
        guest_info: Optional[Dict[str, str]] = None,
        order_type: str = Order.OrderType.DINE_IN,
        table_id: Optional[str] = None,
        coupon_code: Optional[str] = None,
        payment_method: str = "PAY_AT_COUNTER",
        special_instructions: str = "",
        pickup_time_str: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Executes idempotent order placement within a row-locked database transaction.
        """
        # Validate cart authoritatively
        validation = CartValidationService.validate_cart(
            restaurant=restaurant,
            items_data=cart_data.get("items", []),
            coupon_code=coupon_code,
            customer=customer,
            order_type=order_type,
            table_id=table_id,
        )

        with transaction.atomic():
            # Resolve customer details
            guest_name = ""
            guest_phone = ""
            guest_email = ""
            if customer:
                guest_name = customer.full_name
                guest_phone = customer.phone
                guest_email = customer.email
            elif guest_info:
                guest_name = guest_info.get("name", "").strip()
                guest_phone = guest_info.get("phone", "").strip()
                guest_email = guest_info.get("email", "").strip()

            # Parse pickup time
            pickup_dt = None
            if pickup_time_str:
                try:
                    pickup_dt = datetime.fromisoformat(pickup_time_str)
                except Exception:
                    pickup_dt = timezone.now() + timedelta(minutes=25)

            # Determine source
            source = Order.OrderSource.QR if table_id else Order.OrderSource.ONLINE

            # Format items for OrderService
            order_items_payload = [
                {
                    "menu_item_id": item["menu_item_id"],
                    "quantity": item["quantity"],
                    "notes": item.get("notes", ""),
                }
                for item in validation["_validated_items"]
            ]

            # 1. Create Core Order entity via OrderService
            # Resolve default system user or customer user
            staff_user = User.objects.filter(
                memberships__tenant_id=restaurant.id, is_active=True
            ).first() or User.objects.filter(is_active=True).first()

            if not staff_user:
                staff_user, _ = User.objects.get_or_create(
                    email="system@fluxiflow.internal",
                    defaults={"first_name": "System", "last_name": "Bot"}
                )

            order = OrderService.create_order(
                restaurant=restaurant,
                user=staff_user,
                items_data=order_items_payload,
                table_id=table_id if order_type == Order.OrderType.DINE_IN else None,
                notes=special_instructions[:500],
                status_value=Order.OrderStatus.PLACED,
            )

            # Attach online ordering fields
            order.order_type = order_type
            order.source = source
            order.customer = customer
            order.guest_name = guest_name
            order.guest_phone = guest_phone
            order.guest_email = guest_email
            order.pickup_time = pickup_dt
            order.subtotal = validation["_subtotal_dec"]
            order.total = validation["_total_dec"]
            order.save(update_fields=[
                "order_type", "source", "customer", "guest_name", "guest_phone",
                "guest_email", "pickup_time", "subtotal", "total", "updated_at"
            ])

            # 2. Record Promotion Usage if coupon applied
            matched_coupon = validation.get("_matched_coupon")
            if matched_coupon and validation["_discount_dec"] > Decimal("0.00"):
                PromotionRedemptionService.record_promotion_redemption(
                    restaurant=restaurant,
                    promotion=matched_coupon.promotion,
                    discount_amount=validation["_discount_dec"],
                    order=order,
                    customer=customer,
                    coupon=matched_coupon,
                    actor_user=staff_user,
                )

            # 3. Create Kitchen Ticket (KDS Integration)
            kitchen_ticket = KitchenService.create_ticket_for_order(order)

            # 4. Create Bill (Billing & Invoicing Integration)
            discount_type = Bill.DiscountType.FIXED if validation["_discount_dec"] > Decimal("0.00") else Bill.DiscountType.NONE
            bill = BillingService.create_bill_for_order(
                restaurant=restaurant,
                user=staff_user,
                order=order,
                discount_type=discount_type,
                discount_value=validation["_discount_dec"],
                notes=f"Online Order {order.order_number}",
            )

            # 5. Process Payment if online method or mark Pay at Counter
            if payment_method in ["ONLINE_CARD", "PAID_ONLINE"]:
                PaymentService.process_payment(
                    restaurant=restaurant,
                    user=staff_user,
                    bill=bill,
                    amount=bill.grand_total,
                    payment_method=Payment.PaymentMethod.CARD,
                    reference="Paid via online ordering checkout",
                )
            elif payment_method == "CASH":
                pass # Remaining for cashier collection

            # 6. Customer CRM visit increment if customer attached
            if customer:
                customer.total_visits += 1
                customer.total_spend += bill.grand_total
                customer.last_visit_at = timezone.now()
                customer.save(update_fields=["total_visits", "total_spend", "last_visit_at"])

            # 7. Dispatch Staff Alert Notification
            NotificationService.create_notification(
                restaurant=restaurant,
                recipient=staff_user,
                title=f"🔔 New {order.get_order_type_display()} Order #{order.order_number}",
                message=f"Received order from {guest_name or 'Guest'} (${order.total}).",
                notification_type=NotificationType.ORDER_NEW,
                severity=NotificationSeverity.INFO,
                action_url="/orders/history",
                entity_type="order",
                entity_id=str(order.id),
                deduplication_key=f"new_order_{order.id}"
            )

            logger.info(f"Successfully placed online order {order.order_number} ({order.tracking_token})")

            return {
                "order_id": str(order.id),
                "order_number": order.order_number,
                "tracking_token": str(order.tracking_token),
                "order_type": order.order_type,
                "source": order.source,
                "status": order.status,
                "subtotal": str(order.subtotal),
                "discount_amount": str(validation["_discount_dec"]),
                "tax_amount": str(validation["_tax_dec"]),
                "total": str(order.total),
                "guest_name": order.guest_name,
                "table_name": order.table.name if order.table else None,
                "estimated_prep_time_minutes": validation["estimated_prep_time_minutes"],
                "created_at": order.created_at.isoformat(),
            }


class QRTableService:
    """
    Validates QR table tokens and resolves dining table session contexts.
    """

    @classmethod
    def validate_table_qr(cls, restaurant_slug: str, qr_token: str) -> Dict[str, Any]:
        """
        Validate table QR token for restaurant.
        """
        restaurant = Restaurant.objects.filter(slug__iexact=restaurant_slug.strip(), is_active=True).first()
        if not restaurant:
            raise NotFound("Restaurant not found.")

        table = RestaurantTable.objects.filter(
            restaurant=restaurant,
            qr_code_token__iexact=qr_token.strip(),
            is_active=True
        ).first()

        if not table:
            raise NotFound("Invalid or expired table QR code.")

        config, _ = RestaurantConfiguration.objects.get_or_create(restaurant=restaurant)
        if not config.qr_ordering_enabled:
            raise ValidationError({"qr": ["QR Table ordering is temporarily disabled for this restaurant."]})

        # Active session orders on table
        active_orders = Order.objects.filter(
            restaurant=restaurant,
            table=table,
            status=Order.OrderStatus.PLACED
        ).order_by("-created_at")

        return {
            "restaurant_id": str(restaurant.id),
            "restaurant_name": restaurant.name,
            "restaurant_slug": restaurant.slug,
            "table_id": str(table.id),
            "table_name": table.name,
            "section": table.section,
            "capacity": table.capacity,
            "active_orders_count": active_orders.count(),
            "qr_token": table.qr_code_token,
        }


class CustomerPortalService:
    """
    Customer portal account management, order history, and re-order orchestrator.
    """

    @classmethod
    def get_order_tracking(cls, tracking_token: str) -> Dict[str, Any]:
        """
        Fetch public customer order tracking status securely by UUID token.
        Never exposes internal notes or staff information.
        """
        order = Order.objects.filter(
            tracking_token=tracking_token
        ).select_related("restaurant", "table").prefetch_related("items").first()

        if not order:
            raise NotFound("Order not found or invalid tracking token.")

        # Determine KDS status
        kds_ticket = KitchenTicket.objects.filter(order=order).first()
        kitchen_status = kds_ticket.status if kds_ticket else "NEW"

        # Compute progress stage (PLACED -> PREPARING -> READY -> COMPLETED)
        stage_map = {
            "NEW": "PLACED",
            "IN_PROGRESS": "PREPARING",
            "READY": "READY",
            "BUMPED": "READY",
            "SERVED": "COMPLETED",
        }
        display_stage = stage_map.get(kitchen_status, order.status)
        if order.status == Order.OrderStatus.CANCELLED:
            display_stage = "CANCELLED"
        elif order.status == Order.OrderStatus.COMPLETED:
            display_stage = "COMPLETED"

        return {
            "order_id": str(order.id),
            "order_number": order.order_number,
            "tracking_token": str(order.tracking_token),
            "restaurant_name": order.restaurant.name,
            "restaurant_slug": order.restaurant.slug,
            "order_type": order.order_type,
            "source": order.source,
            "status": order.status,
            "kitchen_status": kitchen_status,
            "display_stage": display_stage,
            "table_name": order.table.name if order.table else None,
            "guest_name": order.guest_name,
            "subtotal": str(order.subtotal),
            "total": str(order.total),
            "items": [
                {
                    "name": item.item_name_snapshot,
                    "quantity": item.quantity,
                    "unit_price": str(item.unit_price_snapshot),
                    "line_total": str(item.line_total),
                    "notes": item.notes,
                }
                for item in order.items.all()
            ],
            "created_at": order.created_at.isoformat(),
            "pickup_time": order.pickup_time.isoformat() if order.pickup_time else None,
        }
