"""
Execution context passed to conditions and action handlers.
"""
import re
from typing import Any, Dict, Optional
from django.utils import timezone


def _dig(obj: Any, path: str) -> Any:
    current = obj
    for part in path.split("."):
        if isinstance(current, dict):
            current = current.get(part)
        elif isinstance(current, (list, tuple)) and part.isdigit():
            idx = int(part)
            current = current[idx] if idx < len(current) else None
        else:
            return None
    return current


class ExecutionContext:
    """
    Read-only context bound to a single workflow execution.
    Exposes event envelope, raw input, restaurant, actor, and step metadata.
    """

    _REFERENCE_PATTERN = re.compile(r"\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}")

    def __init__(self, execution, restaurant, event: Dict[str, Any], input_data: Dict[str, Any]):
        self.execution = execution
        self.restaurant = restaurant
        self.event = event or {}
        self.input_data = input_data or {}
        self.step_code = ""
        self.step_name = ""

    @property
    def workflow_code(self) -> str:
        return self.execution.workflow.code if self.execution and self.execution.workflow_id else ""

    @property
    def actor(self):
        return getattr(self.execution, "triggered_by", None) if self.execution else None

    def set_step(self, step_code: str, step_name: str = "") -> None:
        self.step_code = step_code
        self.step_name = step_name

    def resolve_references(self, value: Any) -> Any:
        """
        Recursively resolves '{{path}}' references in strings against the
        event envelope, payload and raw input. Missing references are kept
        verbatim so workflow authors can spot typos at runtime.
        """
        if isinstance(value, str):
            def repl(match: "re.Match") -> str:
                path = match.group(1)
                if path.startswith("payload."):
                    resolved = _dig(self.event.get("payload", {}), path[len("payload."):])
                elif path.startswith("event."):
                    resolved = _dig(self.event, path[len("event."):])
                elif path.startswith("input."):
                    resolved = _dig(self.input_data, path[len("input."):])
                else:
                    resolved = _dig(self.event, path)
                if resolved is None:
                    return match.group(0)
                if isinstance(resolved, (dict, list, tuple, bool)):
                    import json
                    return json.dumps(resolved, default=str)
                return str(resolved)
            return self._REFERENCE_PATTERN.sub(repl, value)
        if isinstance(value, dict):
            return {k: self.resolve_references(v) for k, v in value.items()}
        if isinstance(value, list):
            return [self.resolve_references(item) for item in value]
        return value

    def parse_datetime(self, value) -> Optional[Any]:
        """Parses ISO date/datetime or relative offsets like '1d', '2h', '30m'."""
        if not value:
            return None
        if isinstance(value, (int, float)):
            return timezone.now() + timezone.timedelta(minutes=float(value))
        raw = str(value).strip()
        if raw.endswith("d") and raw[:-1].isdigit():
            return timezone.now() + timezone.timedelta(days=int(raw[:-1]))
        if raw.endswith("h") and raw[:-1].isdigit():
            return timezone.now() + timezone.timedelta(hours=int(raw[:-1]))
        if raw.endswith("m") and raw[:-1].isdigit():
            return timezone.now() + timezone.timedelta(minutes=int(raw[:-1]))
        try:
            parsed = timezone.datetime.fromisoformat(raw.replace("Z", "+00:00"))
            if timezone.is_naive(parsed):
                parsed = timezone.make_aware(parsed)
            return parsed
        except ValueError:
            return None

    def to_condition_context(self) -> Dict[str, Any]:
        """Builds the context dict consumed by the condition engine."""
        return {
            "event": self.event,
            "input": self.input_data,
            "meta": {
                "workflow_code": self.workflow_code,
                "execution_id": str(self.execution.id) if self.execution else "",
                "step_code": self.step_code,
                "restaurant_id": str(self.restaurant.id) if self.restaurant else "",
            },
            "_restaurant": self.restaurant,
        }