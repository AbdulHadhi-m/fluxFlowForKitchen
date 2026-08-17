# Supplier Master Management & Vendor Scorecards

## 1. Overview
The Supplier Management subsystem manages vendor profiles, communication contacts, catalog items, pricing agreements, and quality performance scorecards.

---

## 2. Supplier Master Schema
Each supplier record contains:
- **Unique Supplier Code**: Format `SUP-000001` auto-generated per restaurant.
- **Classification**:
  - `PRIMARY_WHOLESALER`: Broadline food distributors.
  - `LOCAL_PRODUCE`: Farmers and local farm markets.
  - `SPECIALTY_IMPORTER`: Artisanal cheeses, cured meats, and truffles.
  - `BEVERAGE_DISTRIBUTOR`: Wine, craft beers, coffee, and spirits.
  - `PACKAGING_SUPPLIER`: Takeout boxes, compostables, and kitchen disposables.
- **Payment Terms**: `IMMEDIATE`, `NET_7`, `NET_15`, `NET_30`, `NET_60`, `COD`, `PREPAID`.
- **Standard Lead Time**: Expected transit days from order dispatch to dock delivery.
- **Minimum Order Value (MOV)**: Order value threshold for free freight delivery.

---

## 3. Supplier Items & Price Audits
- Each catalog item link (`SupplierItem`) stores vendor SKU, purchase units, conversion factor, MOQ, and pack sizes.
- Updates to `unit_cost` create an audit record in `SupplierPriceHistory` with previous price, new price, effective date, and author.

---

## 4. Vendor Performance Scorecards
Calculated in real-time via `SupplierService.calculate_supplier_scorecard()`:
- **Fill Rate %**: `(total_accepted_quantity / total_delivered_quantity) * 100`
- **Quality Rejections**: Tally of substandard goods rejected at receiving.
- **Return Incidents**: Total return orders issued against vendor.
- **Lead Time Compliance**: SLA verification against promised lead times.
