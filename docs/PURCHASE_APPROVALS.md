# Purchase Approvals, Budgets & Requisitions

## 1. Internal Requisitions Workflow
- **Requisition Initiation**: Kitchen staff submits a `PurchaseRequisition` specifying ingredients, urgency priority (`LOW`, `NORMAL`, `URGENT`, `EMERGENCY`), and reason.
- **Manager Approval**: Managers review and approve requisitions (`procurement.requisition.approve`).
- **Direct PO Conversion**: One-click action converts approved requisition line items into a vendor-specific Purchase Order.

---

## 2. Procurement Budgets & Spend Limits
- Budgets can be defined per location or department for `MONTHLY`, `QUARTERLY`, or `YEARLY` intervals.
- Approving a Purchase Order locks the corresponding committed spend in `ProcurementBudget.committed_amount`.
- When budget utilization exceeds **90%**, automated notifications (`BUDGET_THRESHOLD_REACHED`) are dispatched to management.
