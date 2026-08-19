import React from "react";
import { GiftCard } from "../types/loyalty.types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, User } from "lucide-react";

export const GiftCardsTable: React.FC<{ giftCards: GiftCard[] }> = ({ giftCards }) => {
  if (giftCards.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-slate-500 bg-slate-100/70 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800">
        No gift cards issued yet.
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="success">Active</Badge>;
      case "DEPLETED":
        return <Badge variant="outline">Depleted</Badge>;
      case "SUSPENDED":
      case "CANCELLED":
        return <Badge variant="destructive">{status}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 overflow-hidden">
      <CardContent className="p-0">
        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-100 dark:bg-slate-950/80 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3">Card Number</th>
              <th className="px-4 py-3">Cardholder</th>
              <th className="px-4 py-3 text-right">Initial Balance</th>
              <th className="px-4 py-3 text-right">Current Balance</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Issued Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {giftCards.map((gc) => (
              <tr key={gc.id} className="hover:bg-slate-200/60 dark:hover:bg-slate-800/40 transition-colors">
                <td className="px-4 py-3 font-mono font-bold text-emerald-400 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-slate-500" />
                  {gc.card_number}
                </td>

                <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                  {gc.customer_name ? (
                    <span className="flex items-center gap-1.5">
                      <User className="h-3 w-3 text-slate-500" /> {gc.customer_name}
                    </span>
                  ) : (
                    <span className="text-slate-500 italic">Unassigned Bearer</span>
                  )}
                </td>

                <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400">
                  ${gc.initial_balance}
                </td>

                <td className="px-4 py-3 text-right font-black text-emerald-400 text-sm">
                  ${gc.current_balance} {gc.currency}
                </td>

                <td className="px-4 py-3 text-center">
                  {getStatusBadge(gc.status)}
                </td>

                <td className="px-4 py-3 text-right text-[11px] text-slate-500 dark:text-slate-400">
                  {new Date(gc.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};
