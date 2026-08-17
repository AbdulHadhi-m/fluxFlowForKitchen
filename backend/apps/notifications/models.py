from django.db import models
from apps.core.models import UUIDModel, TimeStampedModel
from apps.restaurants.models import Restaurant
from apps.accounts.models import User

class NotificationSeverity(models.TextChoices):
    INFO = "INFO", "Info"
    SUCCESS = "SUCCESS", "Success"
    WARNING = "WARNING", "Warning"
    CRITICAL = "CRITICAL", "Critical"

class NotificationType(models.TextChoices):
    INVENTORY_LOW_STOCK = "INVENTORY_LOW_STOCK", "Low Stock Alert"
    INVENTORY_OUT_OF_STOCK = "INVENTORY_OUT_OF_STOCK", "Out of Stock Alert"
    PURCHASE_ORDER_PENDING = "PURCHASE_ORDER_PENDING", "PO Pending Approval"
    PURCHASE_ORDER_APPROVED = "PURCHASE_ORDER_APPROVED", "PO Approved"
    PURCHASE_ORDER_PARTIALLY_RECEIVED = "PURCHASE_ORDER_PARTIALLY_RECEIVED", "PO Partially Received"
    PURCHASE_ORDER_RECEIVED = "PURCHASE_ORDER_RECEIVED", "PO Fully Received"
    ORDER_NEW = "ORDER_NEW", "New Order Placed"
    ORDER_CANCELLED = "ORDER_CANCELLED", "Order Cancelled"
    KDS_READY = "KDS_READY", "Kitchen Ticket Ready"
    PAYMENT_COMPLETED = "PAYMENT_COMPLETED", "Payment Settled"
    DELIVERY_ASSIGNED = "DELIVERY_ASSIGNED", "Delivery Assigned"
    DELIVERY_DISPATCHED = "DELIVERY_DISPATCHED", "Out for Delivery"
    DELIVERY_COMPLETED = "DELIVERY_COMPLETED", "Delivery Completed"
    DELIVERY_FAILED = "DELIVERY_FAILED", "Delivery Failed"
    DELIVERY_DELAYED = "DELIVERY_DELAYED", "Delivery Delayed"
    INVENTORY_EXPIRY_WARNING = "INVENTORY_EXPIRY_WARNING", "Expiry Warning"
    INVENTORY_EXPIRED = "INVENTORY_EXPIRED", "Expired Stock Alert"
    STOCK_COUNT_SUBMITTED = "STOCK_COUNT_SUBMITTED", "Stock Count Submitted"
    STOCK_TRANSFER_REQUESTED = "STOCK_TRANSFER_REQUESTED", "Stock Transfer Requested"
    PURCHASE_REQUISITION_SUBMITTED = "PURCHASE_REQUISITION_SUBMITTED", "Requisition Submitted"
    PURCHASE_REQUISITION_APPROVED = "PURCHASE_REQUISITION_APPROVED", "Requisition Approved"
    PURCHASE_ORDER_SENT = "PURCHASE_ORDER_SENT", "PO Sent to Vendor"
    PURCHASE_ORDER_OVERDUE = "PURCHASE_ORDER_OVERDUE", "PO Shipment Overdue"
    PURCHASE_RETURN_CREATED = "PURCHASE_RETURN_CREATED", "Purchase Return Initiated"
    BUDGET_THRESHOLD_REACHED = "BUDGET_THRESHOLD_REACHED", "Procurement Budget Warning"
    INVOICE_VARIANCE_DETECTED = "INVOICE_VARIANCE_DETECTED", "Invoice Match Discrepancy"
    CASH_DRAWER_VARIANCE = "CASH_DRAWER_VARIANCE", "Cash Drawer Variance Alert"
    EXPENSE_PENDING_APPROVAL = "EXPENSE_PENDING_APPROVAL", "Expense Claim Pending Approval"
    EXPENSE_APPROVED = "EXPENSE_APPROVED", "Expense Claim Approved"
    PERIOD_CLOSE_REQUIRED = "PERIOD_CLOSE_REQUIRED", "Financial Period Close Due"
    INVOICE_OVERDUE = "INVOICE_OVERDUE", "Receivable / Payable Overdue"
    UNBALANCED_JOURNAL_ALERT = "UNBALANCED_JOURNAL_ALERT", "Accounting Integrity Discrepancy"
    SHIFT_ASSIGNED = "SHIFT_ASSIGNED", "Shift Assigned"
    SHIFT_CHANGED = "SHIFT_CHANGED", "Shift Schedule Changed"
    SHIFT_CANCELLED = "SHIFT_CANCELLED", "Shift Cancelled"
    SHIFT_SWAP_REQUESTED = "SHIFT_SWAP_REQUESTED", "Shift Swap Requested"
    LEAVE_REQUESTED = "LEAVE_REQUESTED", "Leave Requested"
    LEAVE_APPROVED = "LEAVE_APPROVED", "Leave Request Approved"
    LEAVE_REJECTED = "LEAVE_REJECTED", "Leave Request Rejected"
    ATTENDANCE_CORRECTION_REQUESTED = "ATTENDANCE_CORRECTION_REQUESTED", "Attendance Correction Requested"
    OVERTIME_PENDING_APPROVAL = "OVERTIME_PENDING_APPROVAL", "Overtime Pending Approval"
    PAYROLL_APPROVED = "PAYROLL_APPROVED", "Payroll Approved"
    PAYROLL_PROCESSED = "PAYROLL_PROCESSED", "Payroll Processed"
    PAYSLIP_AVAILABLE = "PAYSLIP_AVAILABLE", "New Payslip Available"
    STAFFING_GAP_ALERT = "STAFFING_GAP_ALERT", "Staffing Gap Alert"
    WORKFLOW_EXECUTION_FAILED = "WORKFLOW_EXECUTION_FAILED", "Workflow Execution Failed"
    WORKFLOW_ACTION_FAILED = "WORKFLOW_ACTION_FAILED", "Workflow Action Failed"
    WORKFLOW_APPROVAL_REQUESTED = "WORKFLOW_APPROVAL_REQUESTED", "Workflow Approval Requested"
    WORKFLOW_APPROVAL_ESCALATED = "WORKFLOW_APPROVAL_ESCALATED", "Workflow Approval Escalated"
    WORKFLOW_COMPLETED = "WORKFLOW_COMPLETED", "Workflow Completed"
    SYSTEM_ALERT = "SYSTEM_ALERT", "System Alert"

class Notification(UUIDModel, TimeStampedModel):
    """
    Centralized persisted in-app alert and operational notice.
    """
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="notifications",
        help_text="Tenant context"
    )
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications",
        help_text="Staff recipient user"
    )
    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM_ALERT,
        db_index=True
    )
    severity = models.CharField(
        max_length=20,
        choices=NotificationSeverity.choices,
        default=NotificationSeverity.INFO,
        db_index=True
    )
    title = models.CharField(
        max_length=200,
        help_text="Notification heading"
    )
    message = models.TextField(
        help_text="Notification detailed body"
    )
    is_read = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Read acknowledgment status"
    )
    read_at = models.DateTimeField(
        null=True,
        blank=True
    )
    action_url = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Client route path (e.g. /inventory/items/123)"
    )
    entity_type = models.CharField(
        max_length=50,
        blank=True,
        default="",
        help_text="Originating model name (e.g. inventory_item, purchase_order)"
    )
    entity_id = models.CharField(
        max_length=64,
        blank=True,
        default="",
        help_text="Originating entity UUID/ID"
    )
    deduplication_key = models.CharField(
        max_length=128,
        blank=True,
        default="",
        db_index=True,
        help_text="State deduplication hash"
    )

    class Meta:
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["restaurant", "recipient", "is_read", "created_at"]),
            models.Index(fields=["restaurant", "deduplication_key"]),
        ]

    def __str__(self):
        return f"[{self.severity}] {self.title} -> {self.recipient.email}"

class NotificationPreference(UUIDModel, TimeStampedModel):
    """
    User notification preferences within a restaurant tenant.
    """
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="notification_preferences"
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notification_preferences"
    )
    in_app_enabled = models.BooleanField(default=True)
    realtime_enabled = models.BooleanField(default=True)
    low_stock_alerts = models.BooleanField(default=True)
    order_alerts = models.BooleanField(default=True)
    procurement_alerts = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Notification Preference"
        verbose_name_plural = "Notification Preferences"
        constraints = [
            models.UniqueConstraint(fields=["restaurant", "user"], name="unique_user_notification_preference"),
        ]

    def __str__(self):
        return f"Preferences: {self.user.email} @ {self.restaurant.name}"
