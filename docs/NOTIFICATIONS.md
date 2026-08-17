# Fluxiflow for Kitchen — Notifications, Alerts & Real-Time Updates

---

## 1. Architecture & Domain Design
The **Notifications Domain** (`apps.notifications` and `frontend/src/features/notifications`) provides a centralized, non-authoritative event communication subsystem: in-app notification persistence, WebSocket real-time delivery via Django Channels & Redis, user-scoped notification preferences, state deduplication, and an interactive notification center.

```
       ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
       │ apps.inventory   │   │ apps.procurement │   │   apps.orders    │
       └────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘
                │                      │                      │
                └──────────────────────┼──────────────────────┘
                                       │
                                       ▼
                     ┌───────────────────────────────────┐
                     │        NotificationService        │
                     │  • Recipient resolution via RBAC  │
                     │  • State deduplication key        │
                     │  • PostgreSQL persistence         │
                     │  • transaction.on_commit()        │
                     └─────────────────┬─────────────────┘
                                       │
                                       ▼
                     ┌───────────────────────────────────┐
                     │    Django Channels & Redis        │
                     │  • Group: user_{user_id}          │
                     │  • WS Route: /ws/notifications/   │
                     └─────────────────┬─────────────────┘
                                       │
                                       ▼
                     ┌───────────────────────────────────┐
                     │   Frontend Notification Center    │
                     │  • Bell unread count badge        │
                     │  • Dropdown interactive panel     │
                     │  • Dedicated management page      │
                     └───────────────────────────────────┘
```

---

## 2. Invariants & Business Rules
1. **Notifications are NOT Source of Truth**:
   - Inventory stock levels, PO status, order states, and bills reside in their respective domain models.
   - Notifications purely communicate state transitions and operational alerts.
2. **Transaction Safety**:
   - WebSocket broadcasts are scheduled via `transaction.on_commit()` ensuring events never trigger for rolled-back database transactions.
3. **State Deduplication**:
   - `deduplication_key` ensures state transitions (e.g. `low_stock:item_123`) do not trigger repeated duplicate unread notifications.
4. **Tenant Isolation & Security**:
   - Notifications and preferences strictly scoped to `restaurant=restaurant` and `recipient=request.user`.
   - WebSockets require authenticated JWT tokens and only bind the user's specific group `user_{user_id}`.

---

## 3. Models (`backend/apps/notifications/models.py`)

### `Notification`
- `restaurant`: FK to `Restaurant`.
- `recipient`: FK to `User`.
- `notification_type`: `INVENTORY_LOW_STOCK`, `INVENTORY_OUT_OF_STOCK`, `PURCHASE_ORDER_PENDING`, `PURCHASE_ORDER_APPROVED`, `PURCHASE_ORDER_PARTIALLY_RECEIVED`, `PURCHASE_ORDER_RECEIVED`, `ORDER_NEW`, `ORDER_CANCELLED`, `KDS_READY`, `PAYMENT_COMPLETED`, `SYSTEM_ALERT`.
- `severity`: `INFO`, `SUCCESS`, `WARNING`, `CRITICAL`.
- `title`, `message`, `is_read`, `read_at`, `action_url`, `entity_type`, `entity_id`, `deduplication_key`.
- Indexes on `(restaurant, recipient, is_read, created_at)` and `(restaurant, deduplication_key)`.

### `NotificationPreference`
- `restaurant`: FK to `Restaurant`.
- `user`: FK to `User`.
- `in_app_enabled`, `realtime_enabled`, `low_stock_alerts`, `order_alerts`, `procurement_alerts`.
- `UniqueConstraint(fields=["restaurant", "user"])`.

---

## 4. API Endpoints (`/api/v1/notifications/`)

| Method | Endpoint | Description | Permission |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/notifications/` | Paginated user notifications with filters | Authenticated |
| `GET` | `/api/v1/notifications/unread-count/` | Fast unread badge count | Authenticated |
| `POST` | `/api/v1/notifications/{id}/read/` | Mark single notification as read | Authenticated (Owner) |
| `POST` | `/api/v1/notifications/read-all/` | Mark all unread notifications as read | Authenticated |
| `GET` | `/api/v1/notifications/preferences/` | Get user notification preferences | Authenticated |
| `PATCH`| `/api/v1/notifications/preferences/` | Update user notification preferences | Authenticated |

---

## 5. Frontend Feature Architecture (`src/features/notifications/`)
```
frontend/src/features/notifications/
├── api/
│   └── notifications.api.ts          # Typed Axios client
├── components/
│   ├── NotificationBell.tsx          # Real-time bell & dropdown panel
│   ├── NotificationItem.tsx          # Notification entry with route action
│   └── NotificationSeverityBadge.tsx # Severity badge indicators
├── hooks/
│   ├── useNotifications.ts           # TanStack Query query and mutations
│   └── useNotificationsSocket.ts     # Resilient WebSocket hook with backoff
├── pages/
│   └── NotificationCenterPage.tsx    # Full notification management center
├── test/
│   ├── NotificationBell.test.tsx
│   └── NotificationSeverityBadge.test.tsx
└── types/
    └── notifications.types.ts        # TypeScript interfaces
```

---

## 6. Automation Integration

The workflow engine uses the notification service as a first-class action target:

- `SEND_NOTIFICATION` action: notifies a specific user or all staff holding a permission (`NotificationService.create_notification` with deduplication keys / `notify_users_with_permission` with `deduplication_key_prefix`).
- Workflow activity also generates notifications for `WORKFLOW_*` notification types (approval required, execution failures, task assignments).
- See [AUTOMATION.md](AUTOMATION.md) and [WORKFLOW_ACTIONS.md](WORKFLOW_ACTIONS.md).
