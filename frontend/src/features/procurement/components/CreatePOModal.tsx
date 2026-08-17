import React, { useState, useEffect } from "react";
import { useSuppliers, useCreatePurchaseOrder } from "../hooks/useProcurement";
import { useInventoryItems } from "@/features/inventory/hooks/useInventory";
import { Supplier, PurchaseRequisition } from "../types/procurement.types";
import { InventoryItem } from "@/features/inventory/types/inventory.types";
import { ShoppingCart, Plus, Trash2, X } from "lucide-react";

interface CreatePOModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers?: Supplier[];
  inventoryItems?: InventoryItem[];
  onSubmit?: (values: any) => Promise<any>;
  isLoading?: boolean;
  requisition?: PurchaseRequisition;
  prefillItem?: {
    supplier_id?: string | null;
    inventory_item_id: string;
    quantity: string;
    unit_cost: string;
  };
}

export const CreatePOModal: React.FC<CreatePOModalProps> = ({
  isOpen,
  onClose,
  suppliers: propSuppliers,
  inventoryItems: propInventoryItems,
  onSubmit: propOnSubmit,
  isLoading: propIsLoading,
  requisition,
  prefillItem,
}) => {
  const { data: fetchedSuppliers } = useSuppliers({ is_active: true });
  const { data: fetchedItems } = useInventoryItems();
  const createPoMutation = useCreatePurchaseOrder();

  const suppliers = propSuppliers || fetchedSuppliers || [];
  const inventoryItems = propInventoryItems || fetchedItems || [];

  const [supplierId, setSupplierId] = useState("");
  const [location, setLocation] = useState("MAIN_STORE");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [taxAmount, setTaxAmount] = useState("0.00");
  const [discountAmount, setDiscountAmount] = useState("0.00");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<
    Array<{
      inventory_item_id: string;
      quantity_ordered: string;
      unit_cost: string;
      unit: string;
    }>
  >([]);

  useEffect(() => {
    if (suppliers.length > 0 && !supplierId) {
      if (prefillItem?.supplier_id) {
        setSupplierId(prefillItem.supplier_id);
      } else {
        setSupplierId(suppliers[0].id);
      }
    }
  }, [suppliers, supplierId, prefillItem]);

  useEffect(() => {
    if (requisition) {
      setNotes(`Converted from Requisition ${requisition.requisition_number}`);
      setItems(
        requisition.items.map((line) => ({
          inventory_item_id: line.inventory_item,
          quantity_ordered: line.quantity,
          unit_cost: line.estimated_unit_cost || "0.00",
          unit: line.unit,
        }))
      );
    } else if (prefillItem) {
      setItems([
        {
          inventory_item_id: prefillItem.inventory_item_id,
          quantity_ordered: prefillItem.quantity,
          unit_cost: prefillItem.unit_cost,
          unit: "kg",
        },
      ]);
    } else if (items.length === 0 && inventoryItems.length > 0) {
      setItems([
        {
          inventory_item_id: inventoryItems[0].id,
          quantity_ordered: "10.000",
          unit_cost: inventoryItems[0].cost_per_unit || "0.00",
          unit: inventoryItems[0].unit,
        },
      ]);
    }
  }, [requisition, prefillItem, inventoryItems]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    if (inventoryItems.length > 0) {
      setItems((prev) => [
        ...prev,
        {
          inventory_item_id: inventoryItems[0].id,
          quantity_ordered: "10.000",
          unit_cost: inventoryItems[0].cost_per_unit || "0.00",
          unit: inventoryItems[0].unit,
        },
      ]);
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        if (field === "inventory_item_id") {
          const matched = inventoryItems.find((inv) => inv.id === value);
          if (matched) {
            updated.unit = matched.unit;
            updated.unit_cost = matched.cost_per_unit || "0.00";
          }
        }
        return updated;
      })
    );
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      const q = parseFloat(item.quantity_ordered) || 0;
      const c = parseFloat(item.unit_cost) || 0;
      return sum + q * c;
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const tax = parseFloat(taxAmount) || 0;
  const discount = parseFloat(discountAmount) || 0;
  const total = Math.max(0, subtotal + tax - discount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      alert("Please select a supplier.");
      return;
    }
    if (!items.length || items.some((i) => !i.inventory_item_id)) {
      alert("Please ensure all PO lines have valid items.");
      return;
    }

    const payload = {
      supplier_id: supplierId,
      requisition_id: requisition?.id,
      location,
      expected_delivery_date: expectedDeliveryDate,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      notes,
      items: items.map((i) => ({
        inventory_item_id: i.inventory_item_id,
        quantity_ordered: i.quantity_ordered,
        unit_cost: i.unit_cost,
        unit: i.unit,
      })),
    };

    try {
      if (propOnSubmit) {
        await propOnSubmit(payload);
      } else {
        await createPoMutation.mutateAsync(payload);
      }
      onClose();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to create purchase order.");
    }
  };

  const isLoading = propIsLoading || createPoMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {requisition ? `Generate PO from ${requisition.requisition_number}` : "Create Purchase Order"}
              </h2>
              <p className="text-xs text-slate-400">Direct vendor order and goods intake specification</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Vendor / Supplier
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                required
              >
                <option value="">Select Vendor...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.supplier_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Destination Store
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="MAIN_STORE">Main Store</option>
                <option value="KITCHEN">Kitchen Storage</option>
                <option value="BAR">Bar Store</option>
                <option value="COLD_ROOM">Cold Room</option>
                <option value="DRY_PANTRY">Dry Pantry</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          {/* Line items table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Line Items
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            <div className="space-y-2.5">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800"
                >
                  <div className="flex-1">
                    <select
                      value={item.inventory_item_id}
                      onChange={(e) => handleItemChange(idx, "inventory_item_id", e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-indigo-500"
                      required
                    >
                      <option value="">Select item...</option>
                      {inventoryItems.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.name} ({inv.sku}) - {inv.unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-24">
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={item.quantity_ordered}
                      onChange={(e) => handleItemChange(idx, "quantity_ordered", e.target.value)}
                      placeholder="Qty"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                      required
                    />
                  </div>

                  <span className="text-xs text-slate-400 font-mono w-10">{item.unit}</span>

                  <div className="w-24">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unit_cost}
                      onChange={(e) => handleItemChange(idx, "unit_cost", e.target.value)}
                      placeholder="Unit $"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                      required
                    />
                  </div>

                  <div className="w-20 text-right text-xs font-mono font-semibold text-emerald-400">
                    ${((parseFloat(item.quantity_ordered) || 0) * (parseFloat(item.unit_cost) || 0)).toFixed(2)}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    disabled={items.length <= 1}
                    className="p-1.5 text-slate-500 hover:text-rose-400 disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing totals */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Tax Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Discount Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="space-y-2 text-right self-end font-mono">
              <div className="text-xs text-slate-400">Subtotal: ${subtotal.toFixed(2)}</div>
              <div className="text-xs text-slate-400">Tax: +${tax.toFixed(2)}</div>
              <div className="text-xs text-slate-400">Discount: -${discount.toFixed(2)}</div>
              <div className="text-lg font-bold text-emerald-400 pt-2 border-t border-slate-800">
                Total: ${total.toFixed(2)}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Order Notes / Delivery Instructions
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Call chef Claudio on arrival for temperature check"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {isLoading ? "Creating..." : "Save Draft Purchase Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
