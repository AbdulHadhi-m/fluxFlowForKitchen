# Advanced Restaurant Finance & Accounting Architecture

## Overview
Fluxiflow for Kitchen includes a production-grade double-entry financial management engine designed specifically for food service operations. The system provides real-time transaction postings from POS sales, inventory movements, procurement purchases, and cash drawer management into an authoritative General Ledger.

---

## Key Modules

### 1. Chart of Accounts (COA)
Hierarchical classification adhering to GAAP accounting standards:
- **1000 - Assets**: Cash on hand, bank accounts, clearing accounts, receivables, inventory.
- **2000 - Liabilities**: Supplier payables, sales tax & VAT payable.
- **3000 - Equity**: Capital investments, retained earnings.
- **4000 - Revenue**: Gross food/beverage sales, delivery fees, customer discounts.
- **5000 - Cost of Goods Sold (COGS)**: Food ingredients, beverage stock, kitchen wastage.
- **6000 - Operating Expenses**: Payroll, rent, utilities, maintenance, marketing, supplies, merchant fees.

### 2. General Ledger & Double-Entry Journal Engine
- Strict mathematical integrity enforcement: $\sum \text{Debits} = \sum \text{Credits}$
- Immutable posted entries with reversing void mechanisms.
- Cost center tracking across Kitchen, FOH, Bar, Delivery, Admin, and Marketing.
- Period lock controls preventing postings in closed fiscal cycles.

### 3. POS Sales Settlement & Automated Accounting
- Automated asynchronous/synchronous journal generation upon bill settlement.
- Splits net food sales, tax liabilities, tender clearing accounts, and discounts.

### 4. Cash Drawer Sessions & Shift Management
- Opening cash float management.
- Real-time tally of cash sales and petty cash payouts.
- Blind shift closing count and automated threshold variance detection.
- Manager variance review and approval workflow.

### 5. Financial Statements & Reporting
- **Profit & Loss (P&L)**: Real-time calculation of Net Revenue, COGS, Gross Profit, Operating Expenses, and Net Margin.
- **Balance Sheet**: Verification of $\text{Assets} = \text{Liabilities} + \text{Equity}$.
- **Statement of Cash Flows**: Operating, investing, and financing cash movements.
- **Trial Balance**: Equilibrium validation across all active debit and credit accounts.
- **General Ledger**: Chronological running balances.

---

## 6. Automation Integration

- `PAYMENT_COMPLETED` / `PAYMENT_FAILED` / `BILL_VOIDED` events drive payment workflows (e.g. `PAYMENT_FAILED_ALERT`, `LARGE_REFUND_APPROVAL`).
- `INVOICE_OVERDUE` is published by the scheduled `detect_overdue_invoices` task for OPEN/PARTIALLY_PAID/OVERDUE receivables (via `balance_due`); conditions may reference `invoice.balance_due`.
- See [AUTOMATION.md](AUTOMATION.md) and [BUSINESS_RULES.md](BUSINESS_RULES.md).
