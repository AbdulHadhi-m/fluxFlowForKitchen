# Stock Control, Audits, Transfers & Shrinkage Logging

This guide covers operational stock management procedures in Fluxiflow: physical counts, inter-station transfers, wastage logs, and par replenishment.

---

## 1. Physical Stock Count Audits

Periodic physical inventory audits ensure books align with physical storage:

1. **Session Creation (`StockCount`)**:
   - Filter by location (`MAIN_STORE`, `KITCHEN`, `BAR`, `WALK_IN_FREEZER`) or audit entire restaurant.
   - Snapshots current book balances into `system_quantity`.
2. **Physical Counting**:
   - Staff counts shelf stock and inputs `counted_quantity`.
   - Real-time display of variance quantity and monetary variance value ($\text{Variance} \times \text{Unit Cost}$).
3. **Manager Review & Approval**:
   - Manager reviews audit session and approves.
   - System automatically posts signed `ADJUSTMENT_IN` or `ADJUSTMENT_OUT` ledger entries and updates authoritative stock balance.

---

## 2. Inter-Location Transfers

For restaurants with multiple internal storage locations:
- **Workflow**:
  1. `REQUESTED`: Kitchen or Bar requests raw materials from Main Store.
  2. `IN_TRANSIT`: Storekeeper approves and dispatches items (triggers `TRANSFER_OUT` stock movement).
  3. `RECEIVED`: Receiving station accepts goods (triggers `TRANSFER_IN` stock movement).

---

## 3. Wastage & Spoilage Log

Shrinkage tracking provides transparency on food loss:
- **Categorization**:
  - `SPOILAGE`: Expired / spoiled ingredients.
  - `PREPARATION_WASTE`: Peeling, trimming, or butchering scrap beyond standard yield.
  - `DAMAGED`: Dropped ingredients or broken packaging.
  - `SPILLAGE`: Spilled liquids / sauces.
  - `OVER_PORTIONING`: Heavy-handed portioning on the line.
  - `BURNT_OVERCOOKED`: Kitchen re-fires.
- Automatically calculates financial loss based on weighted average unit cost and creates an audit movement.

---

## 4. Par Level Replenishment Engine

Deficit calculation automatically computes suggested purchase orders:

$$\text{Suggested Reorder Qty} = \text{Par Level} - (\text{Current Stock} + \text{Pending Inbound PO Qty})$$

Items below minimum reorder thresholds trigger low-stock alerts and purchase suggestions.
