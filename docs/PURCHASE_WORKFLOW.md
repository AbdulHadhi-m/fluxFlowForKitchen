# Purchase Workflow, 3-Way Matching & Goods Intake

## 1. Purchase Order Workflow
1. **Creation**: Created manually or converted from an approved Purchase Requisition or Automated Reorder Suggestion.
2. **Submission**: PO status moves to `SUBMITTED` / `PENDING_APPROVAL`. Notifications are sent to designated approvers.
3. **Approval**: Department manager or Head Chef verifies line items and budget limits, transitioning PO to `APPROVED` and recording committed spend.
4. **Dispatch**: PO is dispatched to vendor (`SENT`), capturing dispatch timestamp and user.
5. **Vendor Acknowledgement**: Vendor confirms order reception and estimated delivery date (`ACKNOWLEDGED`).
6. **Dock Receiving**:
   - Inspect shipment against delivery note and waybill.
   - Record accepted quantities (which increase on-hand stock and update moving weighted average cost).
   - Record rejected quantities with reasons.
   - Capture batch numbers and expiry dates for FEFO stock rotation.
   - PO transitions to `PARTIALLY_RECEIVED` or `RECEIVED`.

---

## 2. 3-Way Matching Engine
The system performs automated 3-way matching:
- **Comparison Inputs**:
  - `PO Line Cost & Quantity Ordered`
  - `Dock Intake Quantity Accepted`
  - `Supplier Invoice Item Price & Quantity Invoiced`
- **Variance Rules**:
  - `Quantity Variance = |po_line.quantity_received - quantity_invoiced|`
  - `Price Variance = |po_line.unit_cost - unit_price|`
- If both variances are 0, status is `MATCHED`. Otherwise, status is flagged as `VARIANCE` requiring managerial review.
