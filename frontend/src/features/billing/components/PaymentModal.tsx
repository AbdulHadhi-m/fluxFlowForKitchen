import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { processPaymentSchema, ProcessPaymentFormValues } from "../schemas/billing.schemas";
import { Bill } from "../types/billing.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, Banknote, QrCode, Loader2, CheckCircle, X } from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill | null;
  onSubmit: (billId: string, values: ProcessPaymentFormValues) => Promise<any>;
  isLoading: boolean;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  bill,
  onSubmit,
  isLoading,
}) => {
  const [cashTendered, setCashTendered] = useState<string>("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProcessPaymentFormValues>({
    resolver: zodResolver(processPaymentSchema),
    defaultValues: {
      amount: bill ? parseFloat(bill.balance_due) : 0,
      payment_method: "CASH",
      reference: "",
    },
  });

  React.useEffect(() => {
    if (bill) {
      const bal = parseFloat(bill.balance_due);
      setValue("amount", bal);
      setCashTendered(bal.toString());
    }
  }, [bill, setValue]);

  if (!isOpen || !bill) return null;

  const paymentMethod = watch("payment_method");
  const amountToPay = watch("amount") || 0;
  const tenderedNum = parseFloat(cashTendered) || 0;
  const changeReturned = Math.max(0, tenderedNum - amountToPay);

  const handleFormSubmit = async (values: ProcessPaymentFormValues) => {
    const payload = {
      ...values,
      amount_tendered: values.payment_method === "CASH" ? tenderedNum : undefined,
    };
    await onSubmit(bill.id, payload);
    reset();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100 p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h2 className="text-lg font-bold flex items-center gap-2 text-white">
            <CreditCard className="h-5 w-5 text-amber-400" />
            Process Payment — {bill.bill_number}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Bill Summary Banner */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
          <div>
            <span className="text-slate-400">Order:</span>{" "}
            <span className="font-mono font-bold text-white">{bill.order_number}</span>
          </div>
          <div>
            <span className="text-slate-400">Balance Due:</span>{" "}
            <span className="font-mono font-black text-amber-400 text-sm">${bill.balance_due}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 pt-1">
          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300">Tender Method</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Cash", value: "CASH" as const, icon: Banknote },
                { label: "Card", value: "CARD" as const, icon: CreditCard },
                { label: "UPI / QR", value: "UPI" as const, icon: QrCode },
              ].map((m) => {
                const isSelected = paymentMethod === m.value;
                const Icon = m.icon;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setValue("payment_method", m.value)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-xs font-semibold gap-1.5 ${
                      isSelected
                        ? "bg-amber-500/10 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/10"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Amount */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <label className="text-xs text-slate-300">Amount Applied ($)</label>
              <button
                type="button"
                onClick={() => setValue("amount", parseFloat(bill.balance_due))}
                className="text-[11px] text-amber-400 hover:underline font-semibold"
              >
                Pay Full Balance
              </button>
            </div>
            <Input
              type="number"
              step="0.01"
              max={parseFloat(bill.balance_due)}
              {...register("amount")}
              className="bg-slate-950 border-slate-800 text-slate-200 text-sm font-mono"
            />
            {errors.amount && <p className="text-xs text-rose-400">{errors.amount.message}</p>}
          </div>

          {/* Cash Change Calculator */}
          {paymentMethod === "CASH" && (
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-2">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Cash Tendered by Customer ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-slate-200 font-mono text-sm"
                  placeholder="0.00"
                />
              </div>

              <div className="flex justify-between items-center pt-1 text-xs">
                <span className="text-slate-400 font-medium">Change Returned:</span>
                <span className="font-mono font-black text-emerald-400 text-sm">
                  ${changeReturned.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Reference for Non-Cash */}
          {paymentMethod !== "CASH" && (
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">Transaction Reference / Last 4 Digits</label>
              <Input
                {...register("reference")}
                className="bg-slate-950 border-slate-800 text-slate-200 text-sm"
                placeholder="e.g. TXN-892182 or Card ending 4402"
              />
            </div>
          )}

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
              disabled={isLoading || amountToPay <= 0 || (paymentMethod === "CASH" && tenderedNum < amountToPay)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-emerald-600/20"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Settle Payment (${amountToPay.toFixed(2)})
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
