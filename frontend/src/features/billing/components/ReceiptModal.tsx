import React from "react";
import { Bill } from "../types/billing.types";
import { BillStatusBadge } from "./BillStatusBadge";
import { Button } from "@/components/ui/button";
import { Receipt, Printer, X } from "lucide-react";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, bill }) => {
  if (!isOpen || !bill) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tax Invoice / Receipt</h2>
          </div>
          <div className="flex items-center gap-2">
            <BillStatusBadge status={bill.status} />
            <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Ticket Receipt */}
        <div id="printable-receipt" className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 font-mono text-xs space-y-4">
          {/* Header */}
          <div className="text-center border-b border-dashed border-slate-200 dark:border-slate-800 pb-3">
            <h2 className="text-base font-black text-slate-900 dark:text-white">FLUXIFLOW RESTAURANT</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Official Tax Receipt</p>
            <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2">
              <span>Bill: <b className="text-slate-900 dark:text-white">{bill.bill_number}</b></span>
              <span>Order: <b className="text-slate-900 dark:text-white">{bill.order_number}</b></span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
              <span>Table: {bill.table_name || "Takeaway"}</span>
              <span>Cashier: {bill.cashier_name}</span>
            </div>
          </div>

          {/* Item Lines */}
          <div className="space-y-2 border-b border-dashed border-slate-200 dark:border-slate-800 pb-3">
            {bill.items.map((item) => (
              <div key={item.id} className="flex justify-between items-start">
                <div className="flex-1 pr-2">
                  <div className="text-slate-700 dark:text-slate-200 font-bold">{item.name}</div>
                  <div className="text-[10px] text-slate-500">
                    {item.quantity} x ${item.unit_price}
                  </div>
                </div>
                <div className="text-slate-900 dark:text-white font-bold">${item.line_total}</div>
              </div>
            ))}
          </div>

          {/* Monetary Summary */}
          <div className="space-y-1.5 border-b border-dashed border-slate-200 dark:border-slate-800 pb-3 text-slate-600 dark:text-slate-300">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="text-slate-900 dark:text-white font-bold">${bill.subtotal}</span>
            </div>
            {parseFloat(bill.discount_amount) > 0 && (
              <div className="flex justify-between text-rose-400">
                <span>Discount ({bill.discount_type}):</span>
                <span>-${bill.discount_amount}</span>
              </div>
            )}
            {parseFloat(bill.service_charge_amount) > 0 && (
              <div className="flex justify-between">
                <span>Service Charge ({bill.service_charge_rate}%):</span>
                <span>+${bill.service_charge_amount}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Tax ({bill.tax_rate_snapshot}%):</span>
              <span>+${bill.tax_amount}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white pt-1.5 border-t border-slate-200 dark:border-slate-800">
              <span>Grand Total:</span>
              <span className="text-emerald-400">${bill.grand_total}</span>
            </div>
          </div>

          {/* Payments Ledger */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Settled Tenders</div>
            {bill.payments.length === 0 ? (
              <div className="text-slate-500 italic">No payments recorded yet</div>
            ) : (
              bill.payments.map((p) => (
                <div key={p.id} className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300">
                  <span>{p.payment_method} ({new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                  <span className="text-emerald-400 font-bold">${p.amount}</span>
                </div>
              ))
            )}
            <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <span>Balance Remaining:</span>
              <span className={`font-bold ${parseFloat(bill.balance_due) > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                ${bill.balance_due}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs gap-1.5"
          >
            <Printer className="h-4 w-4" /> Print Receipt
          </Button>
        </div>
      </div>
    </div>
  );
};
