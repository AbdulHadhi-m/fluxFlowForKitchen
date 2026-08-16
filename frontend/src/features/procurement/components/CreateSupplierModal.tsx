import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createSupplierSchema,
  CreateSupplierFormValues,
} from "../schemas/procurement.schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Loader2, X } from "lucide-react";

interface CreateSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: CreateSupplierFormValues) => Promise<any>;
  isLoading: boolean;
}

export const CreateSupplierModal: React.FC<CreateSupplierModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateSupplierFormValues>({
    resolver: zodResolver(createSupplierSchema),
    defaultValues: {
      name: "",
      contact_person: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    },
  });

  if (!isOpen) return null;

  const handleFormSubmit = async (values: CreateSupplierFormValues) => {
    await onSubmit(values);
    reset();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100 p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h2 className="text-lg font-bold flex items-center gap-2 text-white">
            <Building2 className="h-5 w-5 text-indigo-400" />
            Add Supplier / Vendor
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-3.5 pt-1">
          <div className="space-y-1">
            <label className="text-xs text-slate-300">Supplier / Vendor Name</label>
            <Input
              {...register("name")}
              className="bg-slate-950 border-slate-800 text-slate-200 text-sm"
              placeholder="e.g. Euro Foods Wholesale LLC"
            />
            {errors.name && <p className="text-xs text-rose-400">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-300">Contact Person</label>
              <Input
                {...register("contact_person")}
                className="bg-slate-950 border-slate-800 text-slate-200 text-sm"
                placeholder="e.g. Claudio Rossi"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300">Phone Number</label>
              <Input
                {...register("phone")}
                className="bg-slate-950 border-slate-800 text-slate-200 text-sm font-mono"
                placeholder="+1 555-0199"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-300">Email Address</label>
            <Input
              type="email"
              {...register("email")}
              className="bg-slate-950 border-slate-800 text-slate-200 text-sm"
              placeholder="orders@eurofoods.com"
            />
            {errors.email && <p className="text-xs text-rose-400">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-300">Address / Delivery Notes</label>
            <Input
              {...register("address")}
              className="bg-slate-950 border-slate-800 text-slate-200 text-sm"
              placeholder="e.g. Warehouse 4B, Industrial Park"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-indigo-600/20"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
              Save Supplier
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
