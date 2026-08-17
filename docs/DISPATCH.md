# Courier Dispatch Operations & Real-Time Coordination

## 1. Courier Workload & Capacity Management
- When a driver is assigned an order:
  - `active_deliveries_count` increments by 1.
  - If driver was `AVAILABLE`, status switches to `BUSY`.
- When order transitions to `DELIVERED`, `FAILED`, or is `UNASSIGNED`:
  - `active_deliveries_count` decrements by 1 (clamped at 0).
  - If `active_deliveries_count == 0`, availability resets to `AVAILABLE`.

## 2. Customer Delivery Security (Verification PIN)
Every delivery generates a secure 4-digit verification PIN (`delivery_pin`).
- The PIN is surfaced to the customer in the order tracking view.
- Handover validation ensures that high-value orders cannot be falsely marked delivered without confirming the customer PIN code.

## 3. Real-Time Broadcasts
All state transitions emit WebSocket events to the restaurant's operational channel (`restaurant_{id}`):
- `DELIVERY_CREATED`
- `DRIVER_ASSIGNED`
- `DRIVER_UNASSIGNED`
- `DELIVERY_PICKED_UP`
- `DELIVERY_DISPATCHED`
- `DELIVERY_COMPLETED`
- `DELIVERY_FAILED`
- `DELIVERY_CANCELLED`
