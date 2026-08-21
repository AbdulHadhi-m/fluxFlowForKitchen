import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tableSchema, TableFormData } from "../schemas/table.schemas";
import { useTables } from "../hooks/useTables";
import { RestaurantTable } from "../types/table.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Loader2, AlertCircle, Plus, Edit } from "lucide-react";

interface TableModalProps {
  table: RestaurantTable | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TableModal: React.FC<TableModalProps> = ({ table, isOpen, onClose }) => {
  const { createTable, updateTable, isCreating, isUpdating } = useTables();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TableFormData>({
    resolver: zodResolver(tableSchema),
    defaultValues: {
      name: table?.name || "",
      capacity: table?.capacity || 4,
      section: table?.section || "Main Dining",
      display_order: table?.display_order || 0,
      is_active: table?.is_active ?? true,
    },
  });

  useEffect(() => {
    if (table) {
      reset({
        name: table.name,
        capacity: table.capacity,
        section: table.section,
        display_order: table.display_order,
        is_active: table.is_active,
      });
    } else {
      reset({
        name: "",
        capacity: 4,
        section: "Main Dining",
        display_order: 0,
        is_active: true,
      });
    }
  }, [table, reset]);

  const onSubmit = async (data: TableFormData) => {
    setErrorMessage(null);
    try {
      if (table) {
        await updateTable({ id: table.id, data });
      } else {
        await createTable(data);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error?.message || "Failed to save restaurant table."
      );
    }
  };

  if (!isOpen) return null;

  const isSaving = isCreating || isUpdating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {table ? <Edit className="h-5 w-5 text-emerald-500" /> : <Plus className="h-5 w-5 text-emerald-500" />}
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {table ? `Edit Table ${table.name}` : "Add Dining Table"}
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

          <div className="space-y-1.5">
            <label className="text-slate-600 dark:text-slate-300 font-medium">Table Number / Label *</label>
            <Input
              placeholder="e.g. T01, Table 12, VIP-1"
              {...register("name")}
              className="bg-slate-100/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono"
            />
            {errors.name && <p className="text-rose-400 text-[11px]">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-slate-600 dark:text-slate-300 font-medium">Seating Capacity (Seats) *</label>
              <Input
                type="number"
                min={1}
                {...register("capacity", { valueAsNumber: true })}
                className="bg-slate-100/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono"
              />
              {errors.capacity && <p className="text-rose-400 text-[11px]">{errors.capacity.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-600 dark:text-slate-300 font-medium">Floor Section</label>
              <Input
                placeholder="e.g. Main Dining, Patio, Bar, VIP"
                {...register("section")}
                className="bg-slate-100/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-slate-600 dark:text-slate-300 font-medium">Display Rank Order</label>
              <Input
                type="number"
                {...register("display_order", { valueAsNumber: true })}
                className="bg-slate-100/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs"
              />
            </div>

            <div className="space-y-1.5 flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2 text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  {...register("is_active")}
                  className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Active on Floor</span>
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
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5 shadow-md shadow-emerald-600/20"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Saving...
                </>
              ) : (
                "Save Table"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
