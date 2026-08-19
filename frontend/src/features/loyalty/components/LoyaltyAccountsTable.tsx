import React from "react";
import { LoyaltyAccount } from "../types/loyalty.types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Award, PlusCircle } from "lucide-react";

interface LoyaltyAccountsTableProps {
  accounts: LoyaltyAccount[];
  onAdjustPoints: (account: LoyaltyAccount) => void;
}

export const LoyaltyAccountsTable: React.FC<LoyaltyAccountsTableProps> = ({
  accounts,
  onAdjustPoints,
}) => {
  if (accounts.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-slate-500 bg-slate-100/70 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800">
        No loyalty accounts found.
      </div>
    );
  }

  return (
    <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-950/80 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3 text-right">Points Balance</th>
                <th className="px-4 py-3 text-right">Lifetime Earned</th>
                <th className="px-4 py-3 text-right">Lifetime Redeemed</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {accounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-slate-200/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                        <User className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div>{acc.customer_name}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{acc.customer_phone}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20">
                      <Award className="h-3 w-3" /> {acc.tier_name}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right font-black text-indigo-600 dark:text-indigo-300 text-sm">
                    {acc.points_balance} pts
                  </td>

                  <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400">
                    +{acc.lifetime_points_earned}
                  </td>

                  <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400">
                    -{acc.lifetime_points_redeemed}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <Badge variant={acc.status === "ACTIVE" ? "success" : "destructive"}>
                      {acc.status}
                    </Badge>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAdjustPoints(acc)}
                      className="h-7 px-2 text-[10px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 gap-1"
                    >
                      <PlusCircle className="h-3 w-3 text-indigo-400" /> Adjust Points
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
