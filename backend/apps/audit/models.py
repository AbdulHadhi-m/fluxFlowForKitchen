import uuid
from django.db import models
from django.core.exceptions import ValidationError
from apps.core.models import UUIDModel
from apps.restaurants.models import Restaurant
from apps.accounts.models import User

class AuditAction(models.TextChoices):
    CREATE = "CREATE", "Create"
    UPDATE = "UPDATE", "Update"
    DELETE = "DELETE", "Delete"
    LOGIN = "LOGIN", "Login"
    LOGOUT = "LOGOUT", "Logout"
    LOGIN_FAILED = "LOGIN_FAILED", "Login Failed"
    PASSWORD_CHANGED = "PASSWORD_CHANGED", "Password Changed"
    ROLE_CHANGED = "ROLE_CHANGED", "Role Changed"
    PERMISSION_CHANGED = "PERMISSION_CHANGED", "Permission Changed"
    STATUS_CHANGED = "STATUS_CHANGED", "Status Changed"
    APPROVED = "APPROVED", "Approved"
    CANCELLED = "CANCELLED", "Cancelled"
    PAYMENT_COMPLETED = "PAYMENT_COMPLETED", "Payment Completed"
    PAYMENT_FAILED = "PAYMENT_FAILED", "Payment Failed"
    STOCK_ADJUSTED = "STOCK_ADJUSTED", "Stock Adjusted"
    STOCK_RECEIVED = "STOCK_RECEIVED", "Stock Received"
    STOCK_WASTED = "STOCK_WASTED", "Stock Wasted"
    EXPORT = "EXPORT", "Report / Data Export"

class AuditEntityType(models.TextChoices):
    USER = "USER", "User Account"
    STAFF = "STAFF", "Staff Profile"
    RESTAURANT = "RESTAURANT", "Restaurant Tenant"
    ROLE = "ROLE", "Role & Permissions"
    MENU_ITEM = "MENU_ITEM", "Menu Item"
    MENU_CATEGORY = "MENU_CATEGORY", "Menu Category"
    TABLE = "TABLE", "Table Layout"
    ORDER = "ORDER", "Customer Order"
    BILL = "BILL", "Invoice & Bill"
    PAYMENT = "PAYMENT", "Payment Settlement"
    INVENTORY_ITEM = "INVENTORY_ITEM", "Inventory Item"
    STOCK_MOVEMENT = "STOCK_MOVEMENT", "Stock Movement"
    SUPPLIER = "SUPPLIER", "Vendor Supplier"
    PURCHASE_ORDER = "PURCHASE_ORDER", "Purchase Order"
    NOTIFICATION = "NOTIFICATION", "Notification"
    REPORT = "REPORT", "Report"
    PROMOTION = "PROMOTION", "Promotion"
    COUPON = "COUPON", "Coupon Code"
    CAMPAIGN = "CAMPAIGN", "Marketing Campaign"
    MARKETING_CONSENT = "MARKETING_CONSENT", "Marketing Consent"
    CUSTOMER_SEGMENT = "CUSTOMER_SEGMENT", "Customer Segment"
    DELIVERY = "DELIVERY", "Delivery Order"
    DELIVERY_ZONE = "DELIVERY_ZONE", "Delivery Zone"
    DELIVERY_DRIVER = "DELIVERY_DRIVER", "Delivery Driver"

class AuditActorType(models.TextChoices):
    USER = "USER", "Human User"
    SYSTEM = "SYSTEM", "Automated Background Process"

class AuditLog(UUIDModel):
    """
    Append-only, immutable security and operational audit trail.
    """
    restaurant = models.ForeignKey(
        Restaurant,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="audit_logs",
        help_text="Tenant context (null for platform/pre-auth events)"
    )
    actor_user = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
        help_text="User initiating the action"
    )
    actor_email = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Email snapshot of actor"
    )
    actor_role = models.CharField(
        max_length=64,
        blank=True,
        default="",
        help_text="Active role at time of action"
    )
    actor_type = models.CharField(
        max_length=20,
        choices=AuditActorType.choices,
        default=AuditActorType.USER
    )
    action = models.CharField(
        max_length=50,
        choices=AuditAction.choices,
        db_index=True
    )
    entity_type = models.CharField(
        max_length=50,
        choices=AuditEntityType.choices,
        db_index=True
    )
    entity_id = models.CharField(
        max_length=64,
        blank=True,
        default="",
        db_index=True
    )
    description = models.TextField(
        blank=True,
        default="",
        help_text="Human-readable summary of the action"
    )
    before_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Previous state snapshot"
    )
    after_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Updated state snapshot"
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Auxiliary contextual parameters"
    )
    ip_address = models.CharField(
        max_length=45,
        blank=True,
        default=""
    )
    user_agent = models.CharField(
        max_length=255,
        blank=True,
        default=""
    )
    correlation_id = models.CharField(
        max_length=64,
        blank=True,
        default="",
        db_index=True
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True
    )

    class Meta:
        verbose_name = "Audit Log"
        verbose_name_plural = "Audit Logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["restaurant", "created_at"]),
            models.Index(fields=["restaurant", "entity_type", "entity_id"]),
            models.Index(fields=["restaurant", "actor_user", "created_at"]),
            models.Index(fields=["restaurant", "action"]),
        ]

    def save(self, *args, **kwargs):
        # Enforce append-only immutability at model level
        if not self._state.adding and AuditLog.objects.filter(id=self.id).exists():
            raise ValidationError("Audit logs are append-only and cannot be updated.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Audit logs are immutable and cannot be deleted.")

    def __str__(self):
        actor = self.actor_email or self.actor_type
        return f"[{self.created_at.strftime('%Y-%m-%d %H:%M')}] {actor} performed {self.action} on {self.entity_type} ({self.entity_id})"
