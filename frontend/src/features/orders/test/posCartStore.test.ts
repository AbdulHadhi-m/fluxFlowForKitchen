import { describe, it, expect, beforeEach } from "vitest";
import { usePosCartStore } from "../store/posCartStore";

describe("usePosCartStore Zustand store", () => {
  beforeEach(() => {
    usePosCartStore.getState().clearCart();
  });

  it("adds items and merges duplicates", () => {
    const store = usePosCartStore.getState();

    store.addItem({ id: "item-1", name: "Pizza Margherita", price: "12.50" });
    expect(usePosCartStore.getState().items.length).toBe(1);
    expect(usePosCartStore.getState().items[0].quantity).toBe(1);

    // Adding same item again increments quantity
    usePosCartStore.getState().addItem({ id: "item-1", name: "Pizza Margherita", price: "12.50" });
    expect(usePosCartStore.getState().items.length).toBe(1);
    expect(usePosCartStore.getState().items[0].quantity).toBe(2);

    // Subtotal = 12.50 * 2 = 25.00
    expect(usePosCartStore.getState().getSubtotal()).toBe(25);
  });

  it("updates quantity and removes item when quantity is zero", () => {
    const store = usePosCartStore.getState();
    store.addItem({ id: "item-1", name: "Pizza Margherita", price: "10.00" });

    usePosCartStore.getState().updateQuantity("item-1", 5);
    expect(usePosCartStore.getState().items[0].quantity).toBe(5);
    expect(usePosCartStore.getState().getSubtotal()).toBe(50);

    usePosCartStore.getState().updateQuantity("item-1", 0);
    expect(usePosCartStore.getState().items.length).toBe(0);
  });
});
