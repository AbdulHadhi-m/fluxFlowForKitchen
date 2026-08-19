import React from "react";
import { Order } from "../types/order.types";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

interface OrderReceiptModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const OrderReceiptModal: React.FC<OrderReceiptModalProps> = ({ order, isOpen, onClose }) => {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100">
        <div className="p-6 text-center border-b border-slate-200 dark:border-slate-800 space-y-2">
          <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
            <CheckCircle className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Order Confirmed!</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            {order.order_number} &bull; Table {order.table_name || "Takeaway"}
          </p>
          <div className="pt-1">
            <OrderStatusBadge status={order.status} />
          </div>
        </div>

        <div className="p-6 space-y-4 max-h-80 overflow-y-auto">
          <div className="space-y-2 divide-y divide-slate-200 dark:divide-slate-800/60 text-xs">
            {order.items.map((item) => (
              <div key={item.id} className="pt-2 first:pt-0 flex justify-between gap-2">
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">
                    {item.item_name_snapshot}{" "}
                    <span className="text-slate-500 dark:text-slate-400">x{item.quantity}</span>
                  </div>
                  {item.notes && (
                    <div className="text-[11px] text-amber-400/80 italic">
                      Note: {item.notes}
                    </div>
                  )}
                </div>
                <div className="font-mono text-slate-600 dark:text-slate-300">
                  ${parseFloat(item.line_total).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Subtotal</span>
              <span className="font-mono">₹{parseFloat(order.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white">
              <span>Total Amount</span>
              <span className="font-mono text-emerald-400">
                ${parseFloat(order.total).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-100/80 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <Button
            size="sm"
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
          >
            Done / Next Order
          </Button>
        </div>
      </div>
    </div>
  );
};
