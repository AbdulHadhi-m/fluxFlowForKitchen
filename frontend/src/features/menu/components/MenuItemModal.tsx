import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { menuItemSchema, MenuItemFormData } from "../schemas/menu.schemas";
import { useMenu } from "../hooks/useMenu";
import { MenuCategory, MenuItem } from "../types/menu.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Loader2, AlertCircle, UtensilsCrossed, Edit } from "lucide-react";

interface MenuItemModalProps {
  item: MenuItem | null;
  categories: MenuCategory[];
  defaultCategoryId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const MenuItemModal: React.FC<MenuItemModalProps> = ({
  item,
  categories,
  defaultCategoryId,
  isOpen,
  onClose,
}) => {
  const { createMenuItem, updateMenuItem, isCreatingItem, isUpdatingItem } = useMenu();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      category_id: item?.category_id || defaultCategoryId || categories[0]?.id || "",
      name: item?.name || "",
      description: item?.description || "",
      price: item?.price || "10.00",
      is_available: item?.is_available ?? true,
      is_active: item?.is_active ?? true,
      display_order: item?.display_order || 0,
    },
  });

  useEffect(() => {
    if (item) {
      reset({
        category_id: item.category_id,
        name: item.name,
        description: item.description,
        price: item.price,
        is_available: item.is_available,
        is_active: item.is_active,
        display_order: item.display_order,
      });
    } else {
      reset({
        category_id: defaultCategoryId || categories[0]?.id || "",
        name: "",
        description: "",
        price: "10.00",
        is_available: true,
        is_active: true,
        display_order: 0,
      });
    }
  }, [item, defaultCategoryId, categories, reset]);

  const onSubmit = async (data: MenuItemFormData) => {
    setErrorMessage(null);
    try {
      if (item) {
        await updateMenuItem({ id: item.id, data });
      } else {
        await createMenuItem(data);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error?.message || "Failed to save menu item."
      );
    }
  };

  if (!isOpen) return null;

  const isSaving = isCreatingItem || isUpdatingItem;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {item ? (
              <Edit className="h-5 w-5 text-blue-400" />
            ) : (
              <UtensilsCrossed className="h-5 w-5 text-blue-400" />
            )}
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {item ? "Edit Menu Item" : "Add Menu Item"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-slate-600 dark:text-slate-300 font-medium">Menu Category *</label>
              <select
                {...register("category_id")}
                className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.category_id && (
                <p className="text-rose-400 text-[11px]">{errors.category_id.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-600 dark:text-slate-300 font-medium">Selling Price (₹) *</label>
              <Input
                placeholder="14.50"
                {...register("price")}
                className="bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono"
              />
              {errors.price && <p className="text-rose-400 text-[11px]">{errors.price.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-600 dark:text-slate-300 font-medium">Item Name *</label>
            <Input
              placeholder="e.g. Margherita Pizza, Truffle Risotto"
              {...register("name")}
              className="bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs"
            />
            {errors.name && <p className="text-rose-400 text-[11px]">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-600 dark:text-slate-300 font-medium">Description & Ingredients</label>
            <Input
              placeholder="Fresh tomato sauce, buffalo mozzarella, organic basil..."
              {...register("description")}
              className="bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-slate-600 dark:text-slate-300 font-medium">Display Rank Order</label>
              <Input
                type="number"
                {...register("display_order", { valueAsNumber: true })}
                className="bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs"
              />
            </div>

            <div className="space-y-2 flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  {...register("is_available")}
                  className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-emerald-600 focus:ring-0"
                />
                <span>Available for Orders</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  {...register("is_active")}
                  className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-blue-600 focus:ring-0"
                />
                <span>Active in Catalog</span>
              </label>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5 shadow-md shadow-blue-600/20"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Saving...
                </>
              ) : (
                "Save Menu Item"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
