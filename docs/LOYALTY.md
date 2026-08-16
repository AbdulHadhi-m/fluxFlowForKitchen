# Fluxiflow for Kitchen — Loyalty Program, Memberships, Rewards & Gift Cards

---

## 1. Architecture Overview
The **Loyalty and Gift Card System** (`apps.loyalty` and `frontend/src/features/loyalty/`) implements an immutable double-entry style audit ledger for point balances and gift cards:

```
                          ┌────────────────────────┐
                          │     Loyalty Program    │
                          │ • Earning / Redempt    │
                          │ • Expiration / Tiers   │
                          └───────────┬────────────┘
                                      │
            ┌─────────────────────────┼────────────────────────┐
            ▼                         ▼                        ▼
  ┌───────────────────┐     ┌───────────────────┐    ┌───────────────────┐
  │  Membership Tiers │     │   Loyalty Account │    │    Reward Perks   │
  │  • Multipliers    │     │ • Customer Link   │    │  • Fixed Discount │
  │  • VIP Discounts  │     │ • Balance & Tier  │    │  • Free Item      │
  └───────────────────┘     └─────────┬─────────┘    └───────────────────┘
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │   LoyaltyTransaction      │
                        │   (Immutable Ledger)      │
                        │ • EARN, REDEEM, ADJUST    │
                        │ • EXPIRE, REVERSAL        │
                        └───────────────────────────┘
```

---

## 2. Point Ledger & Invariants
- **Immutable Ledger**: Points balances cannot be modified without writing a corresponding `LoyaltyTransaction` entry.
- **Transactional Atomicity**: Point earning, redemption, and adjustments use row locking (`select_for_update`) to prevent race conditions and negative balances.
- **Idempotent Order Earning**: Points earning verifies `(restaurant, customer, reference_type="ORDER", reference_id=order_id)` ensuring retry requests never award duplicate points.
- **Dynamic Tier Upgrades**: Customers automatically upgrade to higher tiers when lifetime spend crosses qualification thresholds, unlocking points multipliers.

---

## 3. Gift Card Architecture & Security
- **Secure Card Numbers**: Cryptographically random card numbers (`GC-####-####-####`).
- **Gift Card Ledger**: Every top-up, redemption, adjustment, or refund writes a `GiftCardTransaction`.
- **Payment Separation**: Gift card redemptions are treated as payment instruments (reducing amount due), whereas loyalty points are modeled as discount/reward mechanisms.

---

## 4. API Endpoints (`/api/v1/`)

| Method | Endpoint | Description | Permission |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/loyalty/program/` | Get tenant loyalty program rules | `loyalty.view` |
| `PATCH` | `/api/v1/loyalty/program/` | Update loyalty program rules & rates | `loyalty.manage` |
| `GET` | `/api/v1/loyalty/accounts/` | Search & list customer loyalty accounts | `loyalty.view` |
| `GET` | `/api/v1/loyalty/accounts/{id}/` | Get loyalty account details | `loyalty.view` |
| `GET` | `/api/v1/loyalty/accounts/{id}/transactions/` | Immutable points transaction ledger | `loyalty.view` |
| `POST` | `/api/v1/loyalty/accounts/{id}/adjust/` | Manually adjust points with mandatory reason | `loyalty.adjust` |
| `GET` | `/api/v1/loyalty/tiers/` | List membership tiers | `loyalty.view` |
| `POST` | `/api/v1/loyalty/tiers/` | Create membership tier | `loyalty.manage` |
| `GET` | `/api/v1/loyalty/rewards/` | List redeemable rewards | `loyalty.view` |
| `POST` | `/api/v1/loyalty/rewards/` | Create new reward catalog item | `loyalty.manage` |
| `GET` | `/api/v1/gift-cards/` | List issued gift cards | `gift_cards.view` |
| `POST` | `/api/v1/gift-cards/` | Issue new gift card | `gift_cards.manage` |
| `GET` | `/api/v1/gift-cards/{id}/` | Get gift card balance & details | `gift_cards.view` |
| `POST` | `/api/v1/gift-cards/redeem/` | Redeem gift card balance on payment | `gift_cards.redeem` |

---

## 5. Frontend Structure (`src/features/loyalty/`)
```
frontend/src/features/loyalty/
├── api/
│   └── loyalty.api.ts             # Typed Axios client
├── components/
│   ├── LoyaltyAccountsTable.tsx   # Accounts table with point adjustment actions
│   ├── MembershipTiersTable.tsx   # Tiers table with rank, spend, and multipliers
│   ├── RewardsCatalogGrid.tsx     # Card grid of rewards catalog
│   ├── GiftCardsTable.tsx         # Gift card inventory & balance table
│   ├── IssueGiftCardModal.tsx     # RHF + Zod modal to issue cards
│   └── AdjustPointsModal.tsx      # RHF + Zod modal for points adjustments
├── hooks/
│   ├── useLoyalty.ts              # Loyalty Query and mutation hooks
│   └── useGiftCards.ts            # Gift Cards Query and mutation hooks
├── pages/
│   ├── LoyaltyDashboardPage.tsx   # Main loyalty, tiers, and rewards hub
│   └── GiftCardsPage.tsx          # Gift cards management
├── test/
│   ├── LoyaltyAccountsTable.test.tsx
│   └── GiftCardsTable.test.tsx
└── types/
    └── loyalty.types.ts           # TypeScript interfaces
```
