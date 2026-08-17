# Advanced Inventory Architecture & Stock Management

Fluxiflow provides a production-grade restaurant inventory control and valuation engine designed to handle ingredient tracking, multi-unit conversions, batch/lot management with FEFO, and immutable transactional ledgers.

---

## 1. Master Inventory Classification & Storage

Every raw material, packaging element, and semi-finished preparation is tracked with structured classifications and location mapping:

- **Item Classifications**:
  - `RAW_INGREDIENT`: Basic cooking ingredients (flour, proteins, dairy, produce).
  - `PACKAGING`: Takeaway containers, pizza boxes, delivery bags, napkins.
  - `CONSUMABLE`: Cleaning chemicals, sanitizers, thermal printer rolls.
  - `SEMI_FINISHED`: In-house batch preparations (pre-made sauces, dough portions, marinades).
  - `FINISHED_GOOD`: Pre-packaged retail items (bottled sodas, canned beverages).

- **Multi-Location Storage Mapping**:
  - `MAIN_STORE`: Central warehouse / dry store.
  - `WALK_IN_FREEZER`: Sub-zero meat and frozen storage.
  - `KITCHEN`: Line cook station prep tables and hot line.
  - `BAR`: Beverage dispensing station and liquor well.
  - `DRY_STORAGE`: Ambient dry pantry.

---

## 2. Dimension-Aware Unit Conversion Engine

Conversions prevent dangerous cross-dimensional errors (e.g. attempting to convert kg to ml without density ratios) while supporting flexible purchase-to-stock multipliers:

- **Weight Dimensions**: `kg`, `g`, `oz`, `lb` (standard SI gram base).
- **Volume Dimensions**: `l`, `ml` (milliliter base).
- **Count Dimensions**: `piece`, `portion`, `pack`, `bottle`, `box`.
- **Custom Purchase Multipliers**: e.g., 1 Box = 24 Pieces automatically converts vendor PO receipts into stock units.

---

## 3. Batch / Lot Tracking & FEFO Allocation

Items tracking expiry dates or vendor batch lots utilize **First-Expiry, First-Out (FEFO)**:
1. When purchases are received, an `InventoryBatch` is generated with `batch_number`, `received_date`, `expiry_date`, and `unit_cost`.
2. When customer orders or kitchen requisitions consume ingredients, the system draws stock from the earliest expiring active batch.
3. Once a lot reaches 0 quantity, its status transitions to `DEPLETED`.
4. Batches nearing expiration generate proactive warnings in the notification center.

---

## 4. Moving Weighted Average Valuation

Inventory valuation uses the moving weighted average cost formula on every inbound purchase intake:

$$\text{New Unit Cost} = \frac{(Q_{\text{existing}} \times C_{\text{current}}) + (Q_{\text{received}} \times C_{\text{invoice}})}{Q_{\text{existing}} + Q_{\text{received}}}$$

This guarantees financial accuracy regardless of raw material price volatility.
