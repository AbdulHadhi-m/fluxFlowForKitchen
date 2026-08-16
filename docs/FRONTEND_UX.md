# Fluxiflow for Kitchen — Application Shell, Navigation & Global UX Experience

---

## 1. Architecture & Global Shell Design
The **Global Application Experience** (`frontend/src/components/layout/` and `frontend/src/components/ui/`) provides a cohesive, unified shell:

```
┌────────────────────────────────────────────────────────────────────────┐
│ TOPBAR: [Menu Toggle] [Logo] [Ctrl+K Search] [Bell] [RoleSwitcher] [⎋]  │
├───────────────┬────────────────────────────────────────────────────────┤
│ SIDEBAR       │ WORKSPACE AREA                                         │
│               │ ┌────────────────────────────────────────────────────┐ │
│ MAIN          │ │ BREADCRUMBS: Home / Orders / POS                   │ │
│ • Dashboard   │ ├────────────────────────────────────────────────────┤ │
│               │ │ PAGE HEADER: Title, Description, Primary Action    │ │
│ OPERATIONS    │ ├────────────────────────────────────────────────────┤ │
│ • POS         │ │                                                    │ │
│ • Orders      │ │                  PAGE VIEWPORT                     │ │
│ • KDS         │ │                                                    │ │
│ • Tables      │ │                                                    │ │
│               │ │                                                    │ │
│ FINANCE       │ └────────────────────────────────────────────────────┘ │
│ • Billing     │                                                        │
│ • Reports     │                                                        │
│               │                                                        │
│ ADMIN         │                                                        │
│ • Staff       │                                                        │
│ • Settings    │                                                        │
│ [<< Collapse] │                                                        │
└───────────────┴────────────────────────────────────────────────────────┘
```

---

## 2. Core Shell Components
1. **`AppShell` (`components/layout/AppShell.tsx`)**:
   - Collapsible desktop navigation (`w-60` expanded, `w-16` compact mode).
   - Dynamic permission-aware grouping (`MAIN`, `OPERATIONS`, `CATALOG`, `INVENTORY`, `FINANCE`, `ADMINISTRATION`).
   - Responsive mobile navigation drawer with animated overlay.
   - Sticky topbar hosting brand badge, search trigger, real-time unread notification bell, and dynamic RBAC `RoleSwitcher`.
2. **`Breadcrumbs` (`components/layout/Breadcrumbs.tsx`)**:
   - Router-aware clickable breadcrumb hierarchy (`Dashboard / Inventory / Stock Movements`).
3. **`CommandMenu` (`components/layout/CommandMenu.tsx`)**:
   - Global fast navigation palette triggered via `Ctrl+K` or `Cmd+K`.
   - Live query filtering across all permission-accessible operational sections.
4. **`ErrorBoundary` (`components/layout/ErrorBoundary.tsx`)**:
   - Isolated UI failure containment preventing full-screen crashes with friendly retry actions.
5. **Standardized UI Tokens (`components/ui/`)**:
   - `EmptyState`: Consistent empty visual illustrations and call-to-actions.
   - `LoadingState`: Standardized spinner and loading messaging.
   - `ConfirmationModal`: Accessible modal with danger/warning styles for destructive actions.

---

## 3. Keyboard Shortcuts

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| `Ctrl + K` / `Cmd + K` | Open Global Command & Navigation Palette | Application-wide |
| `Escape` | Close Command Menu, Modals, or Drawers | Application-wide |

---

## 4. Frontend Component Structure (`src/components/`)
```
frontend/src/
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx         # Responsive application shell & sidebar
│   │   ├── Breadcrumbs.tsx      # Router-aware navigation trail
│   │   ├── CommandMenu.tsx      # Ctrl+K global command search
│   │   ├── ErrorBoundary.tsx    # React error boundary fallback
│   │   ├── PageHeader.tsx       # Standard page title & actions header
│   │   └── test/
│   │       └── Breadcrumbs.test.tsx
│   └── ui/
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── confirmation-modal.tsx
│       ├── empty-state.tsx
│       ├── input.tsx
│       ├── loading-state.tsx
│       └── test/
│           ├── ConfirmationModal.test.tsx
│           └── EmptyState.test.tsx
└── stores/
    └── uiStore.ts               # Zustand store for sidebar/drawer/palette state
```
