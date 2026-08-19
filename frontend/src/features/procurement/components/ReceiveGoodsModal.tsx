import React, { useState } from "react";
import { PurchaseOrder } from "../types/procurement.types";
import { useReceiveGoods } from "../hooks/useProcurement";
import { X, PackageCheck, AlertCircle } from "lucide-react";

interface ReceiveGoodsModalProps {
  purchaseOrder: PurchaseOrder;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiveGoodsModal: React.FC<ReceiveGoodsModalProps> = ({
  purchaseOrder,
  isOpen,
  onClose,
}) => {
  const receiveMutation = useReceiveGoods();
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [receivedLines, setReceivedLines] = useState(
    purchaseOrder.items.map((item) => ({
      purchase_order_item_id: item.id,
      item_name: item.item_name_snapshot,
      unit: item.unit,
      remaining_quantity: parseFloat(item.remaining_quantity || "0"),
      unit_cost_actual: item.unit_cost,
      quantity_received: item.remaining_quantity,
      quantity_accepted: item.remaining_quantity,
      quantity_rejected: "0.000",
      rejection_reason: "NONE",
      batch_number: "",
      expiry_date: "",
    }))
  );

  if (!isOpen) return null;

  const handleLineChange = (index: number, field: string, value: string) => {
    setReceivedLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        const updated = { ...line, [field]: value };
        if (field === "quantity_received") {
          const rec = parseFloat(value) || 0;
          const rej = parseFloat(line.quantity_rejected) || 0;
          updated.quantity_accepted = Math.max(0, rec - rej).toFixed(3);
        } else if (field === "quantity_rejected") {
          const rec = parseFloat(line.quantity_received) || 0;
          const rej = parseFloat(value) || 0;
          updated.quantity_accepted = Math.max(0, rec - rej).toFixed(3);
        }
        return updated;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const itemsPayload = receivedLines.map((line) => ({
        purchase_order_item_id: line.purchase_order_item_id,
        quantity_received: line.quantity_received,
        quantity_accepted: line.quantity_accepted,
        quantity_rejected: line.quantity_rejected,
        rejection_reason: line.rejection_reason,
        batch_number: line.batch_number,
        expiry_date: line.expiry_date || undefined,
        unit_cost_actual: line.unit_cost_actual,
      }));

      await receiveMutation.mutateAsync({
        poId: purchaseOrder.id,
        data: {
          invoice_number: invoiceNumber,
          delivery_note_number: deliveryNoteNumber,
          notes,
          items: itemsPayload,
        },
      });
      onClose();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to receive goods.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Receive Goods Intake — {purchaseOrder.po_number}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Supplier: {purchaseOrder.supplier_name} | Location: {purchaseOrder.location}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Vendor Delivery Note / Waybill #
              </label>
              <input
                type="text"
                value={deliveryNoteNumber}
                onChange={(e) => setDeliveryNoteNumber(e.target.value)}
                placeholder="e.g. DN-998201"
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Supplier Invoice Number (Optional)
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-2026-0812"
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Line Items Receiving Table */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-3">
              Inspection & Quantity Breakdown
            </label>

            <div className="space-y-3">
              {receivedLines.map((line, idx) => (
                <div
                  key={line.purchase_order_item_id}
                  className="p-4 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white text-sm">{line.item_name}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-2 font-mono">
                        (Remaining: {line.remaining_quantity} {line.unit})
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Delivered Qty</label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max={line.remaining_quantity}
                        value={line.quantity_received}
                        onChange={(e) => handleLineChange(idx, "quantity_received", e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-emerald-400 mb-1">Accepted Qty</label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={line.quantity_accepted}
                        onChange={(e) => handleLineChange(idx, "quantity_accepted", e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-emerald-500/40 rounded-lg px-2.5 py-1.5 text-xs text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-emerald-500 font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-rose-400 mb-1">Rejected Qty</label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={line.quantity_rejected}
                        onChange={(e) => handleLineChange(idx, "quantity_rejected", e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-rose-500/40 rounded-lg px-2.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 focus:outline-none focus:border-rose-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Batch / Lot #</label>
                      <input
                        type="text"
                        value={line.batch_number}
                        onChange={(e) => handleLineChange(idx, "batch_number", e.target.value)}
                        placeholder="LOT-..."
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Expiry Date</label>
                      <input
                        type="date"
                        value={line.expiry_date}
                        onChange={(e) => handleLineChange(idx, "expiry_date", e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  {parseFloat(line.quantity_rejected) > 0 && (
                    <div className="flex items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <div className="flex-1">
                        <select
                          value={line.rejection_reason}
                          onChange={(e) => handleLineChange(idx, "rejection_reason", e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-rose-500/40 rounded-lg px-2.5 py-1 text-xs text-rose-600 dark:text-rose-300 focus:outline-none"
                        >
                          <option value="DAMAGED">Damaged / Broken Packaging</option>
                          <option value="EXPIRED">Expired / Near Expiry</option>
                          <option value="WRONG_SPEC">Wrong Specifications / Grade</option>
                          <option value="TEMPERATURE_ABUSE">Cold Chain Temperature Abuse</option>
                          <option value="CONTAMINATED">Foreign Object / Contaminated</option>
                          <option value="OTHER">Other Discrepancy</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Receiving Notes / Condition on Dock
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Delivered on pallet in refrigerated transport at 3°C"
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={receiveMutation.isPending}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
            >
              {receiveMutation.isPending ? "Recording Goods..." : "Confirm Intake & Update Stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
