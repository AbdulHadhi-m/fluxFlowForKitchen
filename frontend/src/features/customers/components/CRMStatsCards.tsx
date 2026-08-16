import React from "react";
import { CRMAnalytics } from "../types/customers.types";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Repeat, DollarSign, Award } from "lucide-react";

export const CRMStatsCards: React.FC<{ analytics?: CRMAnalytics }> = ({ analytics }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-slate-900/60 border-slate-800">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Customers</span>
            <div className="text-xl font-black text-white mt-1">{analytics?.total_customers ?? 0}</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Users className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/60 border-slate-800">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Repeat Rate</span>
            <div className="text-xl font-black text-emerald-400 mt-1">{analytics?.repeat_rate_percentage ?? 0}%</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Repeat className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/60 border-slate-800">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total CRM Spend</span>
            <div className="text-xl font-black text-indigo-300 mt-1">${analytics?.total_spend ?? "0.00"}</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <DollarSign className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/60 border-slate-800">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Avg Spend / Guest</span>
            <div className="text-xl font-black text-amber-400 mt-1">${analytics?.average_customer_spend ?? 0}</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Award className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
