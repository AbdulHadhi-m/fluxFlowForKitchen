# Cash Drawer Management & Shift Reconciliation

## Cash Drawer Lifecycle
1. **Opening Session**:
   - Cashier inputs station name and starting float (e.g. $200.00).
   - System initializes `CashSession` in `OPEN` state.
2. **Shift Transactions**:
   - **Sales**: POS cash settlements increment `cash_sales` and `expected_cash`.
   - **Petty Cash Disbursements**: Petty cash payouts decrement `expected_cash` and generate expense records.
   - **Cash Drops**: Mid-shift safe drops reduce drawer exposure.
3. **Closing Shift**:
   - Cashier counts actual drawer cash.
   - System calculates variance: $\text{Variance} = \text{Counted} - \text{Expected}$.
   - If $|\text{Variance}| > \text{Threshold}$, status becomes `RECONCILIATION_REQUIRED` and notifies manager.
   - On approval, variance is posted to GL account `#6700 Cash Drawer Over / Short`.
