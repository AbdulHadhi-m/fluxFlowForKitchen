# Advanced Procurement & Purchasing Architecture

## 1. Overview
The Advanced Procurement system in FluxiFlow transforms the purchasing and vendor management pipeline into an enterprise-grade restaurant supply chain platform. It bridges kitchen par levels, recipe demands, vendor catalogs, multi-stage approval workflows, quality inspection receiving, return logistics, 3-way invoice matching, and department budget controls.

---

## 2. Key Modules & Data Flows

### A. Supplier Master & Scorecards
- **Multi-Contact Vendor Directory**: Maintains vendor classifications (`PRIMARY_WHOLESALER`, `LOCAL_PRODUCE`, `SPECIALTY_IMPORTER`, `BEVERAGE_DISTRIBUTOR`, `PACKAGING_SUPPLIER`), currency, standard lead times, and payment terms (`IMMEDIATE`, `NET_7`, `NET_15`, `NET_30`, `NET_60`, `COD`, `PREPAID`).
- **Supplier-Item Relationships**: Maps internal inventory SKUs to vendor SKUs with conversion factors, minimum order quantities (MOQ), and case/pack sizes.
- **Price History Ledger**: Append-only price history tracking price evolution, effective dates, and audit reasons.
- **Performance Scorecards**: Real-time evaluation of fulfillment fill rate %, delivered vs rejected quantities, return incidents, and on-time compliance.

### B. Purchase Requisitions & Approvals
- **Kitchen Requisition Creation**: Line cooks and station chefs submit item requirements with priority tagging (`LOW`, `NORMAL`, `URGENT`, `EMERGENCY`) and prep justifications.
- **Managerial Review Board**: Head chefs / F&B managers approve or reject requests. Approved requisitions convert directly into Purchase Orders with pre-filled quantities.

### C. Purchase Order Lifecycle & Versioning
- **PO States**: `DRAFT` → `SUBMITTED` → `APPROVED` → `SENT` → `ACKNOWLEDGED` → `PARTIALLY_RECEIVED` → `RECEIVED` / `CANCELLED` / `CLOSED`.
- **PO Revisions & Snapshots**: Every amendment to an approved PO archives a version snapshot (`PurchaseOrderVersion`) for traceability.
- **Vendor Dispatch**: Notification and email dispatch with delivery SLA tracking.

### D. Quality Inspection & Dock Intake
- **Dual-Quantity Receiving**: Line-by-line capture of `quantity_received`, `quantity_accepted`, and `quantity_rejected`.
- **Defect Classification**: Categorization of rejects (`DAMAGED`, `EXPIRED`, `WRONG_SPEC`, `TEMPERATURE_ABUSE`, `CONTAMINATED`, `OTHER`).
- **Lot / Expiry Registration**: FEFO batch generation and automatic weighted average cost updates.

### E. Purchase Returns & Supplier Credits
- **Goods Return Workflow**: Return damaged or substandard stock with automatic inventory deduction and `SupplierCredit` note generation.
- **Credit Note Ledger**: Tracks pending, applied, or refunded vendor credits.

### F. 3-Way Invoice Matching
- **Three-Way Comparison**: Reconciles Purchase Order vs Goods Dock Receipt vs Supplier Invoice.
- **Variance Engine**: Detects quantity variances (`|po_line.quantity_received - quantity_invoiced|`) and unit price variances (`|po_line.unit_cost - unit_price|`), flagging discrepancies for managerial resolution.

### G. Procurement Budgets & Automated Planning
- **Budget Commitments**: Period budget caps (`MONTHLY`, `QUARTERLY`, `YEARLY`) with automated threshold alerts (90% utilization).
- **Automated Reorder Engine**: Computes inventory deficits below par, factors in inbound POs, applies vendor MOQ and pack-size roundups, and generates instant purchase orders.
