# Fluxiflow for Kitchen — Kitchen Display System (KDS)

---

## 1. Architecture Overview
The **Kitchen Display System (KDS)** connects the floor point-of-sale to the kitchen line in real-time. It translates customer `Order` placements into touch-friendly bump bar tickets for culinary staff without duplicating core order domain logic.

```
┌──────────────┐         POST /api/v1/orders/         ┌────────────────────────┐
│ POS Terminal ├─────────────────────────────────────►│ OrderService.create()  │
└──────────────┘                                      └───────────┬────────────┘
                                                                  │
                                                Spawns KitchenTicket (status: NEW)
                                                                  │
                                                                  ▼
┌──────────────────┐    WebSocket (/ws/kitchen/)      ┌────────────────────────┐
│  KDS Screen      │◄─────────────────────────────────┤  Redis Channel Layer   │
│ (Kitchen Monitor)│    restaurant_{id}_kitchen       │    Django Channels     │
└──────────────────┘                                  └────────────────────────┘
```

---

## 2. Core Models (`backend/apps/kitchen/models.py`)

### `KitchenTicket`
- **Primary Identifier**: UUIDv4 (`id`)
- **Tenant Scope**: ForeignKey to `Restaurant` (`related_name="kitchen_tickets"`).
- **Source Order**: OneToOneField to `Order` (`related_name="kitchen_ticket"`).
- **Operational Status**: `status` (`NEW`, `PREPARING`, `READY`, `COMPLETED`, `CANCELLED`).
- **Priority**: `priority` (0=Normal, 1=High, 2=Rush/VIP).
- **Bump Bar Timestamps**:
  - `started_at`: DateTime when kitchen begins preparation.
  - `ready_at`: DateTime when food is plated on the pass.
  - `completed_at`: DateTime when waiter collects the order for customer table service.

---

## 3. Bump Bar Lifecycle State Machine

```
         ┌─────┐
         │ NEW ├─────────────────────────┐
         └──┬──┘                         │
            │ [START PREP]               │
            ▼                            │
      ┌───────────┐                      │
      │ PREPARING ├────────────────┐     │
      └─────┬─────┘                │     │
            │ [MARK READY]         │     │
            ▼                      ▼     ▼
         ┌───────┐             ┌───────────┐
         │ READY │             │ CANCELLED │
         └──┬────┘             └───────────┘
            │ [SERVE & CLEAR]
            ▼
      ┌───────────┐
      │ COMPLETED │
      └───────────┘
```

- **Transitions**:
  - `NEW` ➔ `PREPARING`: Records `started_at = now()`.
  - `PREPARING` ➔ `READY`: Records `ready_at = now()`.
  - `READY` ➔ `COMPLETED`: Records `completed_at = now()`, marks parent `order.status = "COMPLETED"`, and frees dining table if no other active orders remain.
  - `NEW` / `PREPARING` ➔ `CANCELLED`: Synchronizes parent `order.status = "CANCELLED"`.

---

## 4. Real-time WebSocket Architecture
- **Endpoint**: `ws://<host>/ws/kitchen/?token=<jwt_access_token>`
- **Tenant Group Isolation**: WebSocket connections automatically join `restaurant_{restaurant_id}_kitchen`. A user from Restaurant A cannot receive real-time events from Restaurant B.
- **Published Domain Events**:
  - `KITCHEN_ORDER_CREATED`: New order placed on POS.
  - `KITCHEN_STATUS_CHANGED`: Ticket advanced (`NEW` ➔ `PREPARING` ➔ `READY` ➔ `COMPLETED`).
  - `KITCHEN_ORDER_CANCELLED`: Ticket voided on POS / KDS.

---

## 5. Resilience & REST Recovery
- **Reconnection**: The frontend hook (`useKitchenWebSocket`) implements exponential backoff reconnection (1s, 2s, 4s, max 10s) upon disconnect.
- **REST Recovery**: On successful WebSocket reconnection or manual refresh, TanStack Query immediately refetches the authoritative active ticket queue (`GET /api/v1/kitchen/tickets/`), guaranteeing zero missed tickets.

---

## 6. API Endpoints (`/api/v1/kitchen/`)

| Method | Endpoint | Description | Permission Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/kitchen/tickets/` | List active kitchen queue (NEW, PREPARING, READY) | `kitchen.view` |
| `POST` | `/api/v1/kitchen/tickets/{id}/start/` | Advance ticket to PREPARING | `kitchen.status.manage` |
| `POST` | `/api/v1/kitchen/tickets/{id}/ready/` | Mark ticket READY on pass | `kitchen.status.manage` |
| `POST` | `/api/v1/kitchen/tickets/{id}/complete/`| Serve and complete ticket | `kitchen.status.manage` |
| `POST` | `/api/v1/kitchen/tickets/{id}/cancel/` | Void / cancel kitchen ticket | `kitchen.status.manage` |

---

## 7. Frontend Architecture (`src/features/kitchen/`)
```
frontend/src/features/kitchen/
├── api/
│   └── kitchen.api.ts            # Typed Axios API methods
├── components/
│   ├── KitchenHeader.tsx         # Live connection indicator and filter tabs
│   ├── KitchenOrderCard.tsx      # High-contrast touch card with elapsed age and bump actions
│   └── KitchenTicketGrid.tsx     # Multi-column responsive kitchen monitor layout
├── hooks/
│   ├── useKitchenTickets.ts      # TanStack Query query and bump mutations
│   └── useKitchenWebSocket.ts    # Auto-reconnecting WebSocket hook
├── pages/
│   └── KitchenDisplayPage.tsx    # Fullscreen dark-mode operational KDS screen
├── test/
│   ├── KitchenOrderCard.test.tsx
│   └── KitchenTicketGrid.test.tsx
└── types/
    └── kitchen.types.ts          # TypeScript domain interfaces
```
