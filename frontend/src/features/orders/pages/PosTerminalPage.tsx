import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useMenu } from "@/features/menu/hooks/useMenu";
import { useTables } from "@/features/tables/hooks/useTables";
import { useOrders } from "../hooks/useOrders";
import { usePosCartStore } from "../store/posCartStore";
import { PosCategoryNav } from "../components/PosCategoryNav";
import { PosMenuItemGrid } from "../components/PosMenuItemGrid";
import { PosCartPanel } from "../components/PosCartPanel";
import { PosTableSelector } from "../components/PosTableSelector";
import { OrderReceiptModal } from "../components/OrderReceiptModal";
import { Order } from "../types/order.types";
import { MenuItem } from "@/features/menu/types/menu.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Search,
  History,
  Store,
} from "lucide-react";

export const PosTerminalPage: React.FC = () => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  // Menu & Tables
  const { categories, menuItems } = useMenu({
    category_id: selectedCategoryId || undefined,
    is_active: true,
    is_available: true,
    search: search || undefined,
  });
  const { tables } = useTables();

  // Orders mutation
  const { createOrder, isCreating } = useOrders();

  // Zustand POS Cart
  const {
    items: cartItems,
    selectedTable,
    orderNotes,
    addItem,
    setSelectedTable,
    clearCart,
  } = usePosCartStore();

  const handlePlaceOrder = async () => {
    setErrorMessage(null);
    if (cartItems.length === 0) return;

    try {
      const payload = {
        table_id: selectedTable?.id || null,
        notes: orderNotes,
        status: "PLACED" as const,
        items: cartItems.map((i) => ({
          menu_item_id: i.menu_item_id,
          quantity: i.quantity,
          notes: i.notes,
        })),
      };

      const res = await createOrder(payload);
      clearCart();
      setConfirmedOrder(res.data);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error?.message ||
          "Failed to submit order. Please check item availability."
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-8 flex flex-col justify-between transition-colors duration-200">
      <div className="max-w-7xl mx-auto w-full space-y-4">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link to="/dashboard">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-blue-400" />
              <h1 className="text-base font-bold text-slate-900 dark:text-white">POS Terminal</h1>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
            <PosTableSelector
              tables={tables}
              selectedTableId={selectedTable?.id || null}
              onSelectTable={setSelectedTable}
            />

            <Link to="/orders/history">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-xs text-slate-600 dark:text-slate-300 gap-1.5 h-8"
              >
                <History className="h-3.5 w-3.5" /> Order History
              </Button>
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
          <Input
            placeholder="Search menu catalog..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-xs h-8"
          />
        </div>

        {/* 3-Column POS Layout */}
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          {/* Left: Category Navigation */}
          <PosCategoryNav
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
          />

          {/* Center: Menu Items Grid */}
          <PosMenuItemGrid
            items={menuItems}
            onSelectItem={(item: MenuItem) =>
              addItem({ id: item.id, name: item.name, price: item.price })
            }
          />

          {/* Right: Active Ticket Cart */}
          <PosCartPanel
            onPlaceOrder={handlePlaceOrder}
            isSubmitting={isCreating}
            errorMessage={errorMessage}
          />
        </div>
      </div>

      {/* Confirmation Modal */}
      <OrderReceiptModal
        order={confirmedOrder}
        isOpen={!!confirmedOrder}
        onClose={() => setConfirmedOrder(null)}
      />
    </div>
  );
};
