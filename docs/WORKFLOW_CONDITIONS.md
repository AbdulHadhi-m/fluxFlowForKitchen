# Workflow Conditions

Conditions are declarative JSON evaluated against an execution context. They gate workflows (preconditions) and drive branching (CONDITION / BRANCH steps).

## Syntax

### Single condition
```json
{"field": "payload.total_amount", "operator": "GREATER_THAN", "value": 500}
```

### Group (AND / OR / NOT)
```json
{
  "operator": "AND",
  "conditions": [
    {"field": "payload.total_amount", "operator": "GREATER_THAN", "value": 500},
    {"field": "business_hours", "operator": "EQUALS", "value": true}
  ]
}
```
- `AND` — all children must match (empty group = true).
- `OR` — any child matches (empty group = false).
- `NOT` — negates its single child.

### Special cases
- A group node is detected as a single condition when it has a `field` (or a known operator).
- Invalid/missing fields evaluate to `false` and are logged.

## Operators
| Operator | Meaning |
| --- | --- |
| `EQUALS` / `NOT_EQUALS` | String-coerced equality |
| `GREATER_THAN` / `GREATER_THAN_OR_EQUAL` | Numeric/date comparison |
| `LESS_THAN` / `LESS_THAN_OR_EQUAL` | Numeric/date comparison |
| `IN` / `NOT_IN` | Membership in a list |
| `CONTAINS` / `NOT_CONTAINS` | Substring / list containment |
| `IS_EMPTY` / `IS_NOT_EMPTY` | Null/empty-string/empty-collection check |
| `BETWEEN` | Inclusive range `[lo, hi]` |

## Field Sources
`resolve_field(context, "source.path...")` supports:

| Source | Resolves to |
| --- | --- |
| `event.*` | Event envelope fields (event_type, entity_id, occurred_at…) |
| `payload.*` | Event payload object |
| `input.*` | Raw execution input (manual runs) |
| `meta.*` | Arbitrary metadata |
| `order.*` | Order entity loaded by `event.entity_id` |
| `inventory_item.*` | Inventory item entity |
| `customer.*` | Customer entity |
| `invoice.*` | AccountsReceivable entity (e.g. `invoice.balance_due`) |
| `bill.*` | Billing bill entity |
| `purchase_order.*` | Purchase order entity |
| `now.time` / `now.hour` / `now.minute` | Local clock signals |
| `now.day_of_week` | 0 (Mon) – 6 (Sun) |
| `now.date` | ISO date string |
| `business_hours` | Boolean: restaurant currently open (from settings config) |

Nested paths and list indices are supported (`payload.items.0.item_id`).

## Validation
`validate_condition_spec` walks the tree and reports human-readable errors (missing field, unknown operator, malformed group). Validation runs on publish and via the Validate API action.

## Examples
```json
{"field": "payload.discount_amount", "operator": "GREATER_THAN", "value": 200}
{"field": "order.status", "operator": "IN", "value": ["COMPLETED", "CANCELLED"]}
{"field": "inventory_item.quantity_on_hand", "operator": "LESS_THAN_OR_EQUAL", "value": "{{payload.par_level}}"}
{"field": "business_hours", "operator": "EQUALS", "value": true}
```