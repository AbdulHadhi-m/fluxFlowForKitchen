# Delivery Management & Order Fulfillment Architecture

## 1. Overview
The Delivery Management subsystem operates as an order fulfillment overlay on top of the POS and Online Ordering engines. It coordinates courier fleet assignments, addresses, geographical delivery zones, lifecycle events, customer verification PINs, and real-time state broadcasts.

## 2. Core Entities

| Model | Purpose |
|---|---|
| `CustomerAddress` | Saved customer addresses with GPS coordinates, landmarks, and default flags. |
| `DeliveryZone` | Geographic polygon/postal matching zone with dynamic fees, min/max spend, and ETA windows. |
| `DeliveryDriver` | Staff courier profile with vehicle type, live shift availability (`AVAILABLE`, `BUSY`, `OFFLINE`), and workload count. |
| `Delivery` | Fulfillment instance linking an `Order` to customer address snapshot, assigned courier, zone, status, and verification PIN. |
| `DeliveryEvent` | Immutable chronological audit trail of all dispatch actions, transitions, actor logs, and metadata. |

## 3. Delivery Lifecycle State Machine

```
   [PENDING] (Order Placed)
       │
   [PREPARING] (Kitchen In Progress)
       │
   [READY_FOR_DISPATCH] ─── (Assign Driver) ───> [ASSIGNED]
                                                     │
                                             (Mark Picked Up)
                                                     │
                                                     ▼
                                                [PICKED_UP]
                                                     │
                                             (Start Delivery)
                                                     │
                                                     ▼
                                             [OUT_FOR_DELIVERY]
                                                     │
                                            (Complete Delivery)
                                                     │
                                                     ▼
                                                [DELIVERED]
```
*Failure/Cancellation exits*: Deliveries can transition to `FAILED` or `CANCELLED` at any operational point before completion with mandatory reason logging and automatic courier release.

## 4. API Endpoints

- `GET /api/v1/delivery/`: List deliveries with zone, driver, status filters.
- `GET /api/v1/delivery/{id}/`: Delivery detail with address snapshot and full event history.
- `GET /api/v1/delivery/metrics/`: Live KPI counters for dispatch dashboard.
- `POST /api/v1/delivery/{id}/assign/`: Assign delivery to courier.
- `POST /api/v1/delivery/{id}/unassign/`: Unassign courier.
- `POST /api/v1/delivery/{id}/pickup/`: Driver marks order picked up.
- `POST /api/v1/delivery/{id}/start/`: Courier departs for customer address.
- `POST /api/v1/delivery/{id}/complete/`: Order delivered to customer (supports optional verification PIN).
- `POST /api/v1/delivery/{id}/fail/`: Mark delivery as failed with reason.
- `POST /api/v1/delivery/{id}/cancel/`: Cancel delivery and sync parent order.
- `POST /api/v1/delivery/estimate/`: Public endpoint to calculate zone coverage and delivery fees for checkout.
