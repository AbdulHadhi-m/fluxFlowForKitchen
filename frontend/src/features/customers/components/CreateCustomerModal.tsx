import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CreateCustomerPayload } from "../types/customers.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, UserPlus, X } from "lucide-react";

const customerSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().optional(),
  phone: z.string().min(6, "Valid phone number is required"),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  internal_notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCustomerPayload) => Promise<any>;
  isLoading?: boolean;
}

export const CreateCustomerModal: React.FC<CreateCustomerModalProps> = ({
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
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      phone: "",
      email: "",
      internal_notes: "",
    },
  });

  if (!isOpen) return null;

  const handleFormSubmit = async (data: CustomerFormData) => {
    await onSubmit({
      first_name: data.first_name,
      last_name: data.last_name || "",
      phone: data.phone,
      email: data.email || "",
      internal_notes: data.internal_notes || "",
    });
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-slate-900 dark:text-slate-100 animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <UserPlus className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Add Customer Profile</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">First Name *</label>
              <Input
                {...register("first_name")}
                placeholder="John"
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200"
              />
              {errors.first_name && <span className="text-[10px] text-rose-400">{errors.first_name.message}</span>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Last Name</label>
              <Input
                {...register("last_name")}
                placeholder="Doe"
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Phone Number *</label>
            <Input
              {...register("phone")}
              placeholder="+1 (555) 000-0000"
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200"
            />
            {errors.phone && <span className="text-[10px] text-rose-400">{errors.phone.message}</span>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Email Address</label>
            <Input
              {...register("email")}
              placeholder="customer@example.com"
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200"
            />
            {errors.email && <span className="text-[10px] text-rose-400">{errors.email.message}</span>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Internal Notes / Preferences</label>
            <Input
              {...register("internal_notes")}
              placeholder="e.g. VIP guest, prefers booth seating"
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-emerald-600/20"
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Create Customer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
