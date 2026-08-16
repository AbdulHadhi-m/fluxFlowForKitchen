import uuid
from typing import Optional, Set
from django.db import transaction
from rest_framework.exceptions import PermissionDenied, NotFound, ValidationError
from apps.rbac.models import Permission, Role, TenantMembership

SYSTEM_PERMISSIONS = [
    # Orders
    ("orders", "view", "View active and historical dining/takeaway orders"),
    ("orders", "create", "Create new dine-in and takeaway orders"),
    ("orders", "update", "Update order items, notes, and modifiers"),
    ("orders", "cancel", "Cancel or void pending orders"),
    ("orders", "complete", "Mark operational orders as completed"),
    ("orders", "transfer", "Transfer orders between tables"),
    
    # Kitchen Display System (KDS)
    ("kitchen", "view", "View kitchen display stations and tickets"),
    ("kitchen", "bump", "Advance or complete kitchen order ticket stages"),
    ("kitchen", "recall", "Recall previously bumped kitchen tickets"),
    ("kitchen", "status.manage", "Advance kitchen ticket status (preparing, ready, completed)"),
    
    # Menu / Catalog
    ("menu", "view", "View restaurant catalog, categories, and items"),
    ("menu", "create", "Create new menu categories, items, and variations"),
    ("menu", "update", "Update menu pricing, modifiers, and availability"),
    ("menu", "delete", "Remove catalog items or categories"),
    ("menu", "availability.manage", "Quickly toggle menu item availability for live ordering"),
    
    # Tables & Facilities
    ("tables", "view", "View floor plan and table seating status"),
    ("tables", "create", "Create table sections and layouts"),
    ("tables", "update", "Update table assignments and occupancy status"),
    ("tables", "delete", "Remove table configurations"),
    ("tables", "status.manage", "Change operational table occupancy and service status"),
    
    # Billing & Payments
    ("billing", "view", "View bills, invoices, and payment receipts"),
    ("billing", "create", "Generate bills and process customer payments"),
    ("billing", "payment.create", "Record customer payment transactions"),
    ("billing", "split", "Split bills by item or customer seat"),
    ("billing", "discount", "Apply promotional discounts or managerial overrides"),
    ("billing", "refund", "Process invoice refunds or payment reversals"),
    ("billing", "void", "Void or cancel active bills"),
    
    # Inventory & Recipes
    ("inventory", "view", "View stock levels and raw material inventory"),
    ("inventory", "update", "Record inventory intake, wastage, and adjustments"),
    ("inventory", "manage", "Configure inventory suppliers and recipe deduction maps"),
    
    # Procurement & Suppliers
    ("procurement", "view", "View suppliers and purchase orders"),
    ("procurement", "create", "Create purchase order drafts"),
    ("procurement", "manage", "Manage suppliers and edit purchase orders"),
    ("procurement", "approve", "Approve submitted purchase orders"),
    ("procurement", "receive", "Receive purchase order inventory deliveries"),
    
    # Staff & Membership
    ("staff", "view", "View restaurant staff roster and assignments"),
    ("staff", "create", "Create new staff accounts and employee profiles"),
    ("staff", "invite", "Invite new staff members and assign roles"),
    ("staff", "update", "Modify staff roles and shift schedules"),
    ("staff", "disable", "Deactivate or disable staff member accounts"),
    ("staff", "remove", "Deactivate or remove staff from restaurant"),
    ("staff", "roles.manage", "Assign and modify staff primary and secondary roles"),
    
    # Notifications & Alerts
    ("notifications", "view", "View in-app alerts and notifications"),
    ("notifications", "manage", "Manage notification preferences and dismiss alerts"),
    
    # Reports & Analytics
    ("reports", "view", "View sales, operational performance, and kitchen metrics"),
    ("reports", "export", "Export analytics and tax audit files"),
    
    # Restaurant Configuration & Setup
    ("settings", "view", "View restaurant profile, business hours, and operational policies"),
    ("settings", "manage", "Manage tax rules and operational configurations"),
    ("settings", "update", "Modify restaurant configurations and printer routing"),
    ("audit", "view", "View audit trail logs and security events"),
]

# Role to Permission code mappings
SYSTEM_ROLE_DEFINITIONS = {
    "SAAS_OWNER": {
        "name": "SaaS Platform Owner",
        "description": "Unrestricted platform-wide super administrator",
        "permissions": "*",  # All permissions
    },
    "RESTAURANT_ADMIN": {
        "name": "Restaurant Administrator",
        "description": "Full administrative control over restaurant operations, staff, catalog, and billing",
        "permissions": "*",  # All permissions within tenant
    },
    "MANAGER": {
        "name": "Store Manager",
        "description": "Operational manager overseeing floor, kitchen, inventory, and staff shifts",
        "permissions": [
            "orders.view", "orders.create", "orders.update", "orders.cancel", "orders.transfer",
            "kitchen.view", "kitchen.bump", "kitchen.recall",
            "menu.view", "menu.create", "menu.update",
            "tables.view", "tables.update",
            "billing.view", "billing.create", "billing.split", "billing.discount", "billing.refund",
            "inventory.view", "inventory.update",
            "procurement.view", "procurement.create", "procurement.manage", "procurement.approve", "procurement.receive",
            "staff.view", "staff.update",
            "notifications.view", "notifications.manage",
            "reports.view", "reports.export",
            "settings.view", "settings.update",
            "audit.view",
        ],
    },
    "CASHIER": {
        "name": "Cashier / POS Operator",
        "description": "Checkout and payment processing staff",
        "permissions": [
            "orders.view", "orders.create", "orders.update",
            "tables.view",
            "billing.view", "billing.create", "billing.split", "billing.discount",
            "menu.view",
            "notifications.view",
        ],
    },
    "WAITER": {
        "name": "Waitstaff / Server",
        "description": "Dining room floor service staff managing table orders",
        "permissions": [
            "orders.view", "orders.create", "orders.update", "orders.transfer",
            "tables.view", "tables.update",
            "menu.view",
            "kitchen.view",
            "notifications.view",
        ],
    },
    "KITCHEN_STAFF": {
        "name": "Kitchen Staff / Chef",
        "description": "Kitchen production team preparing food and managing KDS tickets",
        "permissions": [
            "kitchen.view", "kitchen.bump", "kitchen.recall",
            "orders.view",
            "menu.view",
            "inventory.view",
            "notifications.view",
        ],
    },
}

class RBACService:
    """
    Central Service for Role-Based Access Control and Dynamic Active-Role Management.
    """

    @classmethod
    def get_user_membership(cls, user, tenant_id: Optional[str] = None) -> Optional[TenantMembership]:
        """Fetch tenant membership for user."""
        if not user or not user.is_authenticated:
            return None

        query = TenantMembership.objects.filter(user=user, is_active=True).select_related("active_role")
        if tenant_id:
            return query.filter(tenant_id=tenant_id).first()
        return query.first()

    @classmethod
    def get_effective_permissions(cls, user, tenant_id: Optional[str] = None) -> Set[str]:
        """
        Calculates the active permissions for the user in the given tenant context.
        """
        if not user or not user.is_authenticated:
            return set()

        if user.is_superuser:
            # Superusers retain all system permissions
            return set(Permission.objects.values_list("code", flat=True))

        membership = cls.get_user_membership(user, tenant_id)
        if not membership:
            return set()

        return membership.get_effective_permissions()

    @classmethod
    def switch_active_role(cls, user, role_identifier: str, tenant_id: Optional[str] = None):
        """
        Switch active role for the user within a tenant membership.
        `role_identifier` can be a Role UUID or Role code.
        """
        membership = cls.get_user_membership(user, tenant_id)
        if not membership:
            raise PermissionDenied("You do not have active membership in this restaurant organization.")

        # Find target role among assigned roles
        try:
            role_uuid = uuid.UUID(str(role_identifier))
            target_role = membership.assigned_roles.filter(id=role_uuid, is_active=True).first()
        except (ValueError, TypeError):
            target_role = membership.assigned_roles.filter(code=str(role_identifier).upper(), is_active=True).first()

        if not target_role:
            raise PermissionDenied("You are not assigned to this role in this restaurant.")

        with transaction.atomic():
            membership.active_role = target_role
            membership.save(update_fields=["active_role"])

        permissions = membership.get_effective_permissions()
        return membership, target_role, permissions

    @classmethod
    def seed_system_roles_and_permissions(cls):
        """
        Idempotent seeding of all granular permissions and system roles.
        """
        # 1. Seed Permissions
        created_perms = 0
        all_perms_map = {}
        for resource, action, desc in SYSTEM_PERMISSIONS:
            code = f"{resource}.{action}"
            perm, created = Permission.objects.update_or_create(
                code=code,
                defaults={
                    "resource": resource,
                    "action": action,
                    "description": desc,
                },
            )
            all_perms_map[code] = perm
            if created:
                created_perms += 1

        # 2. Seed System Roles
        created_roles = 0
        for code, data in SYSTEM_ROLE_DEFINITIONS.items():
            role, created = Role.objects.update_or_create(
                code=code,
                tenant_id=None,
                defaults={
                    "name": data["name"],
                    "description": data["description"],
                    "is_system": True,
                    "is_active": True,
                },
            )
            if created:
                created_roles += 1

            # Assign permissions
            if data["permissions"] == "*":
                role.permissions.set(all_perms_map.values())
            else:
                target_perms = [all_perms_map[p] for p in data["permissions"] if p in all_perms_map]
                role.permissions.set(target_perms)

        return len(all_perms_map), len(SYSTEM_ROLE_DEFINITIONS)
