import React from "react";
import { usePosCartStore } from "../store/posCartStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Send,
  Loader2,
  Utensils,
  StickyNote,
} from "lucide-react";

interface PosCartPanelProps {
  onPlaceOrder: () => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}

export const PosCartPanel: React.FC<PosCartPanelProps> = ({
  onPlaceOrder,
  isSubmitting,
  errorMessage,
}) => {
  const {
    items,
    selectedTable,
    orderNotes,
    updateQuantity,
    updateItemNotes,
    removeItem,
    setOrderNotes,
    clearCart,
    getSubtotal,
  } = usePosCartStore();

  const subtotal = getSubtotal();

  return (
    <div className="w-full lg:w-80 rounded-2xl bg-slate-900/80 border border-slate-800 p-4 flex flex-col justify-between backdrop-blur-md shrink-0 h-[calc(100vh-140px)]">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Current Ticket
            </h3>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Selected Table Tag */}
        <div className="pt-2 pb-1 flex items-center justify-between text-xs">
          <span className="text-slate-400">Target:</span>
          <span className="font-semibold text-blue-300">
            {selectedTable ? `Table ${selectedTable.name}` : "Takeaway / Direct"}
          </span>
        </div>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto my-3 space-y-2 pr-1 divide-y divide-slate-800/40">
        {items.length === 0 ? (
          <div className="py-20 text-center text-slate-500">
            <Utensils className="h-8 w-8 mx-auto mb-2 text-slate-700" />
            <p className="text-xs">Ticket is empty</p>
            <p className="text-[11px] text-slate-600">Select items from menu</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.menu_item_id} className="pt-2 first:pt-0 space-y-1.5">
              <div className="flex items-start justify-between gap-1 text-xs">
                <div className="font-medium text-white flex-1 leading-snug">
                  {item.name}
                </div>
                <div className="font-mono font-semibold text-slate-200">
                  ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                {/* Notes Input */}
                <input
                  type="text"
                  placeholder="Notes (e.g. extra spicy)..."
                  value={item.notes}
                  onChange={(e) => updateItemNotes(item.menu_item_id, e.target.value)}
                  className="bg-slate-950/60 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-slate-300 placeholder:text-slate-600 flex-1 focus:outline-none focus:border-blue-500"
                />

                {/* Quantity Controls */}
                <div className="flex items-center gap-1 bg-slate-950 rounded-lg border border-slate-800 p-0.5">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.menu_item_id, item.quantity - 1)}
                    className="h-5 w-5 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="font-mono text-xs text-white px-1 font-bold">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.menu_item_id, item.quantity + 1)}
                    className="h-5 w-5 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.menu_item_id)}
                  className="text-slate-600 hover:text-rose-400 p-1 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Summary & Actions */}
      <div className="space-y-3 pt-3 border-t border-slate-800">
        {errorMessage && (
          <div className="p-2 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] leading-tight">
            {errorMessage}
          </div>
        )}

        {/* General Order Notes */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <StickyNote className="h-3 w-3" /> Order Ticket Notes:
          </label>
          <Input
            placeholder="Special customer / allergy requests..."
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            className="bg-slate-950/60 border-slate-800 text-xs h-7"
          />
        </div>

        {/* Totals */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Subtotal</span>
            <span className="font-mono">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-slate-800/80">
            <span>Payable Total</span>
            <span className="font-mono text-emerald-400">${subtotal.toFixed(2)}</span>
          </div>
        </div>

        <Button
          type="button"
          disabled={items.length === 0 || isSubmitting}
          onClick={onPlaceOrder}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2.5 shadow-lg shadow-blue-600/20 gap-1.5"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Placing Order...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" /> Place Order (${subtotal.toFixed(2)})
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
