import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem } from '../types/ordering.types';

interface CartState {
  restaurantSlug: string | null;
  tableId: string | null;
  tableName: string | null;
  qrToken: string | null;
  orderType: 'DINE_IN' | 'TAKEAWAY';
  items: CartItem[];
  couponCode: string;
  specialInstructions: string;

  // Actions
  setRestaurantSlug: (slug: string) => void;
  setTableContext: (tableId: string | null, tableName: string | null, qrToken?: string | null) => void;
  setOrderType: (type: 'DINE_IN' | 'TAKEAWAY') => void;
  addItem: (item: { menu_item_id: string; name: string; price: string; quantity?: number; notes?: string }) => void;
  removeItem: (menu_item_id: string) => void;
  updateQuantity: (menu_item_id: string, quantity: number) => void;
  updateNotes: (menu_item_id: string, notes: string) => void;
  setCouponCode: (code: string) => void;
  setSpecialInstructions: (instructions: string) => void;
  clearCart: () => void;

  // Selectors
  getSubtotal: () => number;
  getTotalItemsCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      restaurantSlug: null,
      tableId: null,
      tableName: null,
      qrToken: null,
      orderType: 'DINE_IN',
      items: [],
      couponCode: '',
      specialInstructions: '',

      setRestaurantSlug: (slug) => {
        const currentSlug = get().restaurantSlug;
        if (currentSlug && currentSlug !== slug) {
          // If switching restaurants, clear cart
          set({
            restaurantSlug: slug,
            items: [],
            couponCode: '',
            specialInstructions: '',
            tableId: null,
            tableName: null,
            qrToken: null,
          });
        } else {
          set({ restaurantSlug: slug });
        }
      },

      setTableContext: (tableId, tableName, qrToken = null) => {
        set({
          tableId,
          tableName,
          qrToken,
          orderType: tableId ? 'DINE_IN' : get().orderType,
        });
      },

      setOrderType: (type) => set({ orderType: type }),

      addItem: (item) => {
        const items = get().items;
        const existingIdx = items.findIndex((i) => i.menu_item_id === item.menu_item_id);
        const addQty = item.quantity || 1;

        if (existingIdx > -1) {
          const updated = [...items];
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: updated[existingIdx].quantity + addQty,
            notes: item.notes || updated[existingIdx].notes,
          };
          set({ items: updated });
        } else {
          set({
            items: [
              ...items,
              {
                menu_item_id: item.menu_item_id,
                name: item.name,
                price: item.price,
                quantity: addQty,
                notes: item.notes || '',
              },
            ],
          });
        }
      },

      removeItem: (menu_item_id) => {
        set({ items: get().items.filter((i) => i.menu_item_id !== menu_item_id) });
      },

      updateQuantity: (menu_item_id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(menu_item_id);
        } else {
          set({
            items: get().items.map((i) =>
              i.menu_item_id === menu_item_id ? { ...i, quantity } : i
            ),
          });
        }
      },

      updateNotes: (menu_item_id, notes) => {
        set({
          items: get().items.map((i) =>
            i.menu_item_id === menu_item_id ? { ...i, notes } : i
          ),
        });
      },

      setCouponCode: (code) => set({ couponCode: code }),

      setSpecialInstructions: (instructions) => set({ specialInstructions: instructions }),

      clearCart: () =>
        set({
          items: [],
          couponCode: '',
          specialInstructions: '',
        }),

      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + parseFloat(item.price || '0') * item.quantity, 0);
      },

      getTotalItemsCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'fluxiflow-customer-cart',
    }
  )
);
