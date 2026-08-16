import { create } from "zustand";
import { PosCartItem } from "../types/order.types";

interface PosCartState {
  selectedTable: { id: string; name: string } | null;
  orderNotes: string;
  items: PosCartItem[];
  addItem: (item: { id: string; name: string; price: string }) => void;
  updateQuantity: (menu_item_id: string, quantity: number) => void;
  updateItemNotes: (menu_item_id: string, notes: string) => void;
  removeItem: (menu_item_id: string) => void;
  setSelectedTable: (table: { id: string; name: string } | null) => void;
  setOrderNotes: (notes: string) => void;
  clearCart: () => void;
  getSubtotal: () => number;
}

export const usePosCartStore = create<PosCartState>((set, get) => ({
  selectedTable: null,
  orderNotes: "",
  items: [],

  addItem: (menuItem) => {
    set((state) => {
      const existingIdx = state.items.findIndex(
        (i) => i.menu_item_id === menuItem.id
      );

      if (existingIdx > -1) {
        const updated = [...state.items];
        updated[existingIdx].quantity += 1;
        return { items: updated };
      }

      return {
        items: [
          ...state.items,
          {
            menu_item_id: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            quantity: 1,
            notes: "",
          },
        ],
      };
    });
  },

  updateQuantity: (menu_item_id, quantity) => {
    set((state) => {
      if (quantity <= 0) {
        return {
          items: state.items.filter((i) => i.menu_item_id !== menu_item_id),
        };
      }
      return {
        items: state.items.map((i) =>
          i.menu_item_id === menu_item_id ? { ...i, quantity } : i
        ),
      };
    });
  },

  updateItemNotes: (menu_item_id, notes) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.menu_item_id === menu_item_id ? { ...i, notes } : i
      ),
    }));
  },

  removeItem: (menu_item_id) => {
    set((state) => ({
      items: state.items.filter((i) => i.menu_item_id !== menu_item_id),
    }));
  },

  setSelectedTable: (table) => set({ selectedTable: table }),
  setOrderNotes: (orderNotes) => set({ orderNotes }),
  clearCart: () => set({ items: [], orderNotes: "", selectedTable: null }),

  getSubtotal: () => {
    return get().items.reduce((acc, item) => {
      return acc + parseFloat(item.price || "0") * item.quantity;
    }, 0);
  },
}));
