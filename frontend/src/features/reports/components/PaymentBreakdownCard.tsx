import React from "react";
import { PaymentBreakdownItem } from "../types/reports.types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CreditCard, Banknote, QrCode, Building, CircleDollarSign } from "lucide-react";

interface PaymentBreakdownCardProps {
  payments: PaymentBreakdownItem[];
}

export const PaymentBreakdownCard: React.FC<PaymentBreakdownCardProps> = ({ payments }) => {
  const total = payments.reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "CASH":
        return <Banknote className="h-4 w-4 text-emerald-400" />;
      case "CARD":
        return <CreditCard className="h-4 w-4 text-blue-400" />;
      case "UPI":
        return <QrCode className="h-4 w-4 text-purple-400" />;
      case "BANK_TRANSFER":
        return <Building className="h-4 w-4 text-amber-400" />;
      default:
        return <CircleDollarSign className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-purple-400" /> Payment Tenders
          </span>
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">Total: ${total.toFixed(2)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-2">
        {payments.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No payment settlements in this period.
          </div>
        ) : (
          payments.map((p, idx) => {
            const amount = parseFloat(p.total_amount) || 0;
            const pct = total > 0 ? (amount / total) * 100 : 0;

            return (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    {getMethodIcon(p.payment_method)}
                    <span className="font-bold text-slate-700 dark:text-slate-200">{p.payment_method}</span>
                    <span className="text-slate-500 text-[10px]">({p.count} txns)</span>
                  </div>
                  <div className="font-mono text-right">
                    <span className="text-slate-900 dark:text-white font-bold">${p.total_amount}</span>
                    <span className="text-slate-500 text-[10px] ml-1.5">({pct.toFixed(1)}%)</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${pct}%` }}
                    className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full"
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
