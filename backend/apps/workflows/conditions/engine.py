"""
Condition engine for workflow branching and step gating.

Conditions are declarative JSON evaluated against a context that exposes
event payloads, domain entities, and date/time signals. Condition specs
support AND/OR/NOT groups and typed operators.
"""
import logging
from datetime import datetime, time as dt_time
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, Optional

logger = logging.getLogger("fluxiflow.workflows.conditions")


class Operator:
    EQUALS = "EQUALS"
    NOT_EQUALS = "NOT_EQUALS"
    GREATER_THAN = "GREATER_THAN"
    GREATER_THAN_OR_EQUAL = "GREATER_THAN_OR_EQUAL"
    LESS_THAN = "LESS_THAN"
    LESS_THAN_OR_EQUAL = "LESS_THAN_OR_EQUAL"
    IN = "IN"
    NOT_IN = "NOT_IN"
    CONTAINS = "CONTAINS"
    NOT_CONTAINS = "NOT_CONTAINS"
    IS_EMPTY = "IS_EMPTY"
    IS_NOT_EMPTY = "IS_NOT_EMPTY"
    BETWEEN = "BETWEEN"


ALL_OPERATORS = (
    Operator.EQUALS,
    Operator.NOT_EQUALS,
    Operator.GREATER_THAN,
    Operator.GREATER_THAN_OR_EQUAL,
    Operator.LESS_THAN,
    Operator.LESS_THAN_OR_EQUAL,
    Operator.IN,
    Operator.NOT_IN,
    Operator.CONTAINS,
    Operator.NOT_CONTAINS,
    Operator.IS_EMPTY,
    Operator.IS_NOT_EMPTY,
    Operator.BETWEEN,
)


def _to_decimal(value: Any) -> Optional[Decimal]:
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None


def _compare(a: Any, b: Any) -> Optional[int]:
    """Returns -1, 0, 1 or None when not comparable."""
    if isinstance(a, (int, float, Decimal, str)) and isinstance(b, (int, float, Decimal, str)):
        try:
            da, db = Decimal(str(a)), Decimal(str(b))
            return -1 if da < db else (1 if da > db else 0)
        except (InvalidOperation, ValueError):
            pass
    return None


def evaluate_operator(operator: str, actual: Any, expected: Any) -> bool:
    """Evaluates a single operator against an actual and expected value."""
    if operator == Operator.EQUALS:
        return str(actual) == str(expected) if actual is not None else expected is None
    if operator == Operator.NOT_EQUALS:
        return str(actual) != str(expected) if actual is not None else expected is not None
    if operator == Operator.IS_EMPTY:
        return actual is None or actual == "" or actual == [] or actual == {}
    if operator == Operator.IS_NOT_EMPTY:
        return not (actual is None or actual == "" or actual == [] or actual == {})
    if actual is None:
        return False

    cmp = _compare(actual, expected)
    if operator == Operator.GREATER_THAN:
        return cmp is not None and cmp > 0
    if operator == Operator.GREATER_THAN_OR_EQUAL:
        return cmp is not None and cmp >= 0
    if operator == Operator.LESS_THAN:
        return cmp is not None and cmp < 0
    if operator == Operator.LESS_THAN_OR_EQUAL:
        return cmp is not None and cmp <= 0
    if operator == Operator.IN:
        if not isinstance(expected, (list, tuple, set)):
            return False
        return any(str(actual) == str(item) for item in expected)
    if operator == Operator.NOT_IN:
        if not isinstance(expected, (list, tuple, set)):
            return True
        return all(str(actual) != str(item) for item in expected)
    if operator == Operator.CONTAINS:
        if isinstance(actual, (dict, list, tuple, set, str)):
            return str(expected) in actual if isinstance(actual, str) else any(
                str(item) == str(expected) for item in actual
            )
        return False
    if operator == Operator.NOT_CONTAINS:
        return not evaluate_operator(Operator.CONTAINS, actual, expected)
    if operator == Operator.BETWEEN:
        if not isinstance(expected, (list, tuple)) or len(expected) != 2:
            return False
        lo, hi = expected
        low = _compare(actual, lo)
        high = _compare(actual, hi)
        return low is not None and high is not None and low >= 0 and high <= 0

    logger.warning("Unknown condition operator: %s", operator)
    return False


def resolve_field(context: Dict[str, Any], field: str) -> Any:
    """
    Resolves a dotted field path against the execution context.

    Supported sources:
      event.*        - top level event envelope fields
      payload.*      - event payload object
      input.*        - raw execution input
      meta.*         - arbitrary metadata
      order.*        - Order entity loaded by event.entity_id
      inventory_item.* - InventoryItem entity
      customer.*     - Customer entity
      invoice.*      - AccountsReceivable entity
      approval.*     - current approval related data
      now.time / now.day_of_week / now.date  - clock signals
      business_hours - restaurant operational hours check
    """
    parts = field.split(".")
    source = parts[0]
    path = parts[1:]

    if source == "business_hours":
        return _resolve_business_hours(context)

    if source == "now":
        return _resolve_now(path)

    if source in ("event", "input", "meta"):
        root = context.get(source, {})
        return _dig(root, path)

    if source == "payload":
        event = context.get("event", {})
        return _dig(event.get("payload", {}), path)

    entity_loader = _ENTITY_LOADERS.get(source)
    if entity_loader:
        return _dig(entity_loader(context), path)

    logger.warning("Unknown condition field source: %s", source)
    return None


def _dig(obj: Any, path: list) -> Any:
    current = obj
    for part in path:
        if isinstance(current, dict):
            current = current.get(part)
        elif isinstance(current, (list, tuple)) and part.isdigit():
            idx = int(part)
            current = current[idx] if idx < len(current) else None
        else:
            return None
    return current


def _resolve_now(path: list) -> Any:
    from django.utils import timezone as dj_tz
    now = dj_tz.localtime()
    key = path[0] if path else ""
    if key == "time":
        return now.strftime("%H:%M")
    if key == "day_of_week":
        return now.weekday()
    if key == "date":
        return now.date().isoformat()
    if key == "hour":
        return now.hour
    if key == "minute":
        return now.minute
    return None


def _resolve_business_hours(context: Dict[str, Any]) -> bool:
    """Checks whether the restaurant is currently open (best effort)."""
    from django.utils import timezone as dj_tz

    restaurant = context.get("_restaurant")
    if restaurant is None:
        return True

    try:
        from apps.settings.services import SettingsSelector
        config = SettingsSelector.get_restaurant_configuration(restaurant)
        business_hours = config.business_hours if hasattr(config, "business_hours") else []
    except Exception:
        business_hours = []

    if not business_hours:
        return True

    now = dj_tz.localtime()
    weekday = now.strftime("%A").upper()
    current_time = now.time()

    for entry in business_hours:
        day = str(entry.get("day", "")).upper()
        if day != weekday and day != "ALL":
            continue
        try:
            open_time = dt_time.fromisoformat(str(entry.get("open", ""))[:5])
            close_time = dt_time.fromisoformat(str(entry.get("close", ""))[:5])
        except ValueError:
            continue
        if open_time <= current_time <= close_time:
            return True
    return False


def _resolve_entity(context: Dict[str, Any], model, entity_type: str) -> Optional[Any]:
    event = context.get("event", {})
    if event.get("entity_type") != entity_type:
        return None
    entity_id = event.get("entity_id")
    if not entity_id:
        return None
    try:
        return model.objects.filter(id=entity_id).first()
    except Exception:
        return None


def _load_order(context: Dict[str, Any]) -> Optional[Any]:
    from apps.orders.models import Order
    return _resolve_entity(context, Order, "ORDER")


def _load_inventory_item(context: Dict[str, Any]) -> Optional[Any]:
    from apps.inventory.models import InventoryItem
    return _resolve_entity(context, InventoryItem, "INVENTORY_ITEM")


def _load_customer(context: Dict[str, Any]) -> Optional[Any]:
    from apps.customers.models import Customer
    return _resolve_entity(context, Customer, "CUSTOMER")


def _load_invoice(context: Dict[str, Any]) -> Optional[Any]:
    from apps.finance.models import AccountsReceivable
    return _resolve_entity(context, AccountsReceivable, "ACCOUNTS_RECEIVABLE")


def _load_bill(context: Dict[str, Any]) -> Optional[Any]:
    from apps.billing.models import Bill
    return _resolve_entity(context, Bill, "BILL")


def _load_purchase_order(context: Dict[str, Any]) -> Optional[Any]:
    from apps.procurement.models import PurchaseOrder
    return _resolve_entity(context, PurchaseOrder, "PURCHASE_ORDER")


_ENTITY_LOADERS = {
    "order": _load_order,
    "inventory_item": _load_inventory_item,
    "customer": _load_customer,
    "invoice": _load_invoice,
    "bill": _load_bill,
    "purchase_order": _load_purchase_order,
}


def evaluate_condition(condition: Dict[str, Any], context: Dict[str, Any]) -> bool:
    """
    Evaluates a single condition spec.

    Examples:
      {"field": "payload.amount", "operator": "GT", "value": 500}
      {"field": "business_hours", "operator": "EQUALS", "value": true}
      {"field": "order.status", "operator": "IN", "value": ["COMPLETED", "CANCELLED"]}
    """
    if not isinstance(condition, dict):
        return False

    operator = condition.get("operator")
    field = condition.get("field")

    if not operator or not field:
        logger.warning("Malformed condition: %s", condition)
        return False

    actual = resolve_field(context, field)
    expected = condition.get("value")
    return evaluate_operator(operator, actual, expected)


def evaluate_condition_group(group: Dict[str, Any], context: Dict[str, Any]) -> bool:
    """
    Evaluates a recursive condition group.

    Group spec:
      {"operator": "AND"|"OR"|"NOT", "conditions": [single | group, ...]}
    A single condition (dict with field+operator) is accepted directly.
    An empty group evaluates to True (vacuous truth for AND).
    """
    if not isinstance(group, dict):
        return False

    # Single condition shortcut
    if "field" in group and "operator" in group:
        return evaluate_condition(group, context)

    group_operator = str(group.get("operator", "AND")).upper()
    children = group.get("conditions") or []

    if group_operator == "NOT":
        # NOT applies to the single nested child
        if not children:
            return True
        return not evaluate_condition_group(children[0], context)

    if group_operator == "OR":
        if not children:
            return False
        return any(evaluate_condition_group(child, context) for child in children)

    # AND (default)
    return all(evaluate_condition_group(child, context) for child in children)


def validate_condition_spec(spec: Any) -> list:
    """Validates a condition spec and returns a list of human readable errors."""
    errors = []

    def walk(node: Any, path: str):
        if not isinstance(node, dict):
            errors.append(f"{path}: expected an object")
            return
        if node.get("field") is not None or node.get("operator") in ALL_OPERATORS:
            # Single condition node
            if not node.get("field"):
                errors.append(f"{path}: missing field")
            op = node.get("operator")
            if op not in ALL_OPERATORS:
                errors.append(f"{path}: unknown operator '{op}'")
            return
        op = str(node.get("operator", "AND")).upper()
        if op not in ("AND", "OR", "NOT"):
            errors.append(f"{path}: unknown group operator '{op}'")
        for i, child in enumerate(node.get("conditions") or []):
            walk(child, f"{path}.conditions[{i}]")

    walk(spec, "conditions")
    return errors