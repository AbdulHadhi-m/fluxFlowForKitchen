import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { menuCategorySchema, MenuCategoryFormData } from "../schemas/menu.schemas";
import { useMenu } from "../hooks/useMenu";
import { MenuCategory } from "../types/menu.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Loader2, AlertCircle, FolderPlus, Edit } from "lucide-react";

interface CategoryModalProps {
  category: MenuCategory | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({ category, isOpen, onClose }) => {
  const { createCategory, updateCategory, isCreatingCategory, isUpdatingCategory } = useMenu();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MenuCategoryFormData>({
    resolver: zodResolver(menuCategorySchema),
    defaultValues: {
      name: category?.name || "",
      description: category?.description || "",
      display_order: category?.display_order || 0,
      is_active: category?.is_active ?? true,
    },
  });

  useEffect(() => {
    if (category) {
      reset({
        name: category.name,
        description: category.description,
        display_order: category.display_order,
        is_active: category.is_active,
      });
    } else {
      reset({
        name: "",
        description: "",
        display_order: 0,
        is_active: true,
      });
    }
  }, [category, reset]);

  const onSubmit = async (data: MenuCategoryFormData) => {
    setErrorMessage(null);
    try {
      if (category) {
        await updateCategory({ id: category.id, data });
      } else {
        await createCategory(data);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error?.message || "Failed to save menu category."
      );
    }
  };

  if (!isOpen) return null;

  const isSaving = isCreatingCategory || isUpdatingCategory;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {category ? (
              <Edit className="h-5 w-5 text-blue-400" />
            ) : (
              <FolderPlus className="h-5 w-5 text-blue-400" />
            )}
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {category ? "Edit Menu Category" : "Add Menu Category"}
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
            <label className="text-slate-600 dark:text-slate-300 font-medium">Category Name *</label>
            <Input
              placeholder="e.g. Starters, Main Courses, Desserts"
              {...register("name")}
              className="bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs"
            />
            {errors.name && <p className="text-rose-400 text-[11px]">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-600 dark:text-slate-300 font-medium">Description</label>
            <Input
              placeholder="Summary notes or dietary highlights..."
              {...register("description")}
              className="bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-slate-600 dark:text-slate-300 font-medium">Display Rank Order</label>
              <Input
                type="number"
                {...register("display_order", { valueAsNumber: true })}
                className="bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs"
              />
            </div>

            <div className="space-y-1.5 flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2 text-slate-600 dark:text-slate-300">
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
                "Save Category"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
