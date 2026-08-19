import React, { useState } from "react";
import { useSubmitSupplierInvoice, usePurchaseOrders } from "../hooks/useProcurement";
import { X, FileCheck, AlertTriangle, CheckCircle2 } from "lucide-react";

interface InvoiceMatchingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceMatchingModal: React.FC<InvoiceMatchingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { data: purchaseOrders } = usePurchaseOrders({ status: "RECEIVED" });
  const submitInvoiceMutation = useSubmitSupplierInvoice();

  const [selectedPoId, setSelectedPoId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [taxAmount] = useState("0.00");
  const [notes, setNotes] = useState("");

  const selectedPo = purchaseOrders?.find((p) => p.id === selectedPoId);

  const [items, setItems] = useState<
    Array<{
      inventory_item_id: string;
      item_name: string;
      unit: string;
      quantity_ordered: string;
      quantity_received: string;
      unit_cost_po: string;
      quantity_invoiced: string;
      unit_price: string;
      tax_amount: string;
    }>
  >([]);

  React.useEffect(() => {
    if (selectedPo) {
      setItems(
        selectedPo.items.map((item) => ({
          inventory_item_id: item.inventory_item,
          item_name: item.item_name_snapshot,
          unit: item.unit,
          quantity_ordered: item.quantity_ordered,
          quantity_received: item.quantity_received,
          unit_cost_po: item.unit_cost,
          quantity_invoiced: item.quantity_received,
          unit_price: item.unit_cost,
          tax_amount: "0.00",
        }))
      );
    } else {
      setItems([]);
    }
  }, [selectedPo]);

  if (!isOpen) return null;

  const handleItemChange = (idx: number, field: string, val: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
  };

  const calculateVariances = () => {
    let qtyVar = 0;
    let priceVar = 0;
    items.forEach((item) => {
      const qRec = parseFloat(item.quantity_received) || 0;
      const qInv = parseFloat(item.quantity_invoiced) || 0;
      const pPo = parseFloat(item.unit_cost_po) || 0;
      const pInv = parseFloat(item.unit_price) || 0;

      qtyVar += Math.abs(qRec - qInv);
      priceVar += Math.abs(pPo - pInv);
    });
    return { qtyVar, priceVar, isMatched: qtyVar === 0 && priceVar === 0 };
  };

  const { qtyVar, priceVar, isMatched } = calculateVariances();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoId || !invoiceNumber) {
      alert("Please select a PO and enter an invoice number.");
      return;
    }

    try {
      await submitInvoiceMutation.mutateAsync({
        purchase_order_id: selectedPoId,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        tax_amount: taxAmount,
        notes,
        items: items.map((i) => ({
          inventory_item_id: i.inventory_item_id,
          quantity_invoiced: i.quantity_invoiced,
          unit_price: i.unit_price,
          tax_amount: i.tax_amount,
        })),
      });
      onClose();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to submit invoice match.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">3-Way Invoice Matching</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Reconcile Vendor Invoice against PO and Goods Intake</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Purchase Order
              </label>
              <select
                value={selectedPoId}
                onChange={(e) => setSelectedPoId(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                required
              >
                <option value="">Select PO to match...</option>
                {purchaseOrders?.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.po_number} — {po.supplier_name} (${po.total_amount})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Invoice Number
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-90219"
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Invoice Date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
                required
              />
            </div>
          </div>

          {/* Variance Status Banner */}
          {selectedPo && (
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                isMatched
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-400"
              }`}
            >
              <div className="flex items-center gap-3">
                {isMatched ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                <div>
                  <span className="font-semibold text-sm">
                    {isMatched ? "3-Way Match Verified (Zero Variance)" : "Variance Detected"}
                  </span>
                  <p className="text-xs opacity-80 mt-0.5">
                    {isMatched
                      ? "Quantities received and unit costs correspond 100% with vendor billing."
                      : `Qty Variance: ${qtyVar.toFixed(3)} | Price Variance: $${priceVar.toFixed(2)}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Item Matching Table */}
          {items.length > 0 && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Line Items Reconciliation
              </label>

              <div className="space-y-2.5">
                {items.map((item, idx) => (
                  <div
                    key={item.inventory_item_id}
                    className="p-3.5 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-900 dark:text-white text-sm">{item.item_name}</span>
                      <span className="font-mono">
                        PO Qty: {item.quantity_ordered} | Received: {item.quantity_received} | PO Cost: ${item.unit_cost_po}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Invoiced Qty</label>
                        <input
                          type="number"
                          step="0.001"
                          value={item.quantity_invoiced}
                          onChange={(e) => handleItemChange(idx, "quantity_invoiced", e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:border-cyan-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Invoiced Unit Price (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(idx, "unit_price", e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:border-cyan-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Line Total</label>
                        <div className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-cyan-400 font-mono">
                          ${((parseFloat(item.quantity_invoiced) || 0) * (parseFloat(item.unit_price) || 0)).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Reviewer Notes / Variance Explanation
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Price increase approved per seasonal contract amendment"
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitInvoiceMutation.isPending}
              className="px-5 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-lg shadow-cyan-600/30 transition-all disabled:opacity-50"
            >
              {submitInvoiceMutation.isPending ? "Matching..." : "Submit 3-Way Match"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
