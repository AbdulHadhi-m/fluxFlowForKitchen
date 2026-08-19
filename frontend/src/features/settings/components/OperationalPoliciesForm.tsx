import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { OperationalConfiguration } from "../types/settings.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Save, Utensils, Receipt, ShoppingCart } from "lucide-react";

const operationalSchema = z.object({
  allow_order_cancellation: z.boolean(),
  cancellation_window_minutes: z.coerce.number().min(0),
  require_order_confirmation: z.boolean(),
  default_prep_time_minutes: z.coerce.number().min(1),
  kds_warning_threshold_minutes: z.coerce.number().min(1),
  kds_critical_threshold_minutes: z.coerce.number().min(1),
  tax_enabled: z.boolean(),
  default_tax_rate: z.string().min(1),
  tax_name: z.string().min(1),
  tax_registration_number: z.string().optional(),
  invoice_prefix: z.string().min(1).max(10),
  receipt_prefix: z.string().min(1).max(10),
  allow_negative_stock: z.boolean(),
  po_approval_required: z.boolean(),
  po_approval_threshold: z.string().min(1),
});

type OperationalFormData = z.infer<typeof operationalSchema>;

interface OperationalPoliciesFormProps {
  initialData?: OperationalConfiguration;
  onSubmit: (data: Partial<OperationalConfiguration>) => Promise<any>;
  isLoading?: boolean;
}

export const OperationalPoliciesForm: React.FC<OperationalPoliciesFormProps> = ({
  initialData,
  onSubmit,
  isLoading,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<OperationalFormData>({
    resolver: zodResolver(operationalSchema),
    defaultValues: {
      allow_order_cancellation: initialData?.allow_order_cancellation ?? true,
      cancellation_window_minutes: initialData?.cancellation_window_minutes ?? 10,
      require_order_confirmation: initialData?.require_order_confirmation ?? false,
      default_prep_time_minutes: initialData?.default_prep_time_minutes ?? 15,
      kds_warning_threshold_minutes: initialData?.kds_warning_threshold_minutes ?? 15,
      kds_critical_threshold_minutes: initialData?.kds_critical_threshold_minutes ?? 30,
      tax_enabled: initialData?.tax_enabled ?? true,
      default_tax_rate: initialData?.default_tax_rate ?? "5.00",
      tax_name: initialData?.tax_name ?? "GST / VAT",
      tax_registration_number: initialData?.tax_registration_number ?? "",
      invoice_prefix: initialData?.invoice_prefix ?? "INV",
      receipt_prefix: initialData?.receipt_prefix ?? "RCP",
      allow_negative_stock: initialData?.allow_negative_stock ?? false,
      po_approval_required: initialData?.po_approval_required ?? true,
      po_approval_threshold: initialData?.po_approval_threshold ?? "10000.00",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Billing & Tax Configuration */}
      <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="h-4 w-4 text-emerald-400" />
            Billing & Tax Configuration
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
            Define tax rates, official tax identifiers, and receipt numbering prefixes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Tax Name</label>
              <Input
                {...register("tax_name")}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200"
              />
              {errors.tax_name && <span className="text-[10px] text-rose-400">{errors.tax_name.message}</span>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Default Tax Rate (%)</label>
              <Input
                {...register("default_tax_rate")}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200"
              />
              {errors.default_tax_rate && (
                <span className="text-[10px] text-rose-400">{errors.default_tax_rate.message}</span>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Invoice Prefix</label>
              <Input
                {...register("invoice_prefix")}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Receipt Prefix</label>
              <Input
                {...register("receipt_prefix")}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kitchen & KDS Parameters */}
      <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Utensils className="h-4 w-4 text-amber-400" />
            Kitchen Display System (KDS) Parameters
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
            Configure order preparation time goals and alert delay thresholds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Target Prep Time (Mins)</label>
              <Input
                type="number"
                {...register("default_prep_time_minutes")}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Warning Threshold (Mins)</label>
              <Input
                type="number"
                {...register("kds_warning_threshold_minutes")}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Critical Threshold (Mins)</label>
              <Input
                type="number"
                {...register("kds_critical_threshold_minutes")}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Procurement & PO Approval Rules */}
      <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-purple-400" />
            Procurement & Purchase Orders
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
            Set spend thresholds that strictly mandate manager approval before goods intake.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Mandatory Approval Threshold</label>
              <Input
                {...register("po_approval_threshold")}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={isLoading || !isDirty}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-indigo-600/20"
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save Operational Policies
        </Button>
      </div>
    </form>
  );
};
