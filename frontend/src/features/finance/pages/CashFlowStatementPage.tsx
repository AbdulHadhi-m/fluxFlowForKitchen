import React, { useState } from "react";
import { useCashFlow } from "../hooks/useFinance";
import { DollarSign, Calendar } from "lucide-react";

export const CashFlowStatementPage: React.FC = () => {
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: cf, isLoading } = useCashFlow({
    start_date: startDate,
    end_date: endDate,
  });

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm">
        Computing Cash Flow Statement...
      </div>
    );
  }

  const netOperating = parseFloat(cf?.operating_activities?.net_operating_cash_flow || "0.00");
  const inflows = parseFloat(cf?.operating_activities?.cash_inflows || "0.00");
  const outflows = parseFloat(cf?.operating_activities?.cash_outflows || "0.00");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <DollarSign className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Statement of Cash Flows</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Operating cash inflows and outflows across liquid drawers and bank accounts
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl text-xs">
          <Calendar className="w-4 h-4 text-slate-500 ml-1.5" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-transparent text-white focus:outline-none"
          />
          <span className="text-slate-500">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-transparent text-white focus:outline-none"
          />
        </div>
      </div>

      <div className="max-w-3xl mx-auto rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md p-8 space-y-6">
        <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Operating Activities</h2>
          <span className={`font-mono font-bold text-base ${netOperating >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            ${netOperating.toFixed(2)}
          </span>
        </div>

        <div className="space-y-3 text-xs pl-4 border-l-2 border-emerald-500/30">
          <div className="flex justify-between py-1 text-slate-300">
            <span>Operating Cash Inflows (Customer Receipts & Settlements)</span>
            <span className="font-mono text-emerald-400 font-bold">+${inflows.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1 text-slate-300">
            <span>Operating Cash Outflows (Supplier Payments & Operating Expenses)</span>
            <span className="font-mono text-rose-400 font-bold">-${outflows.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex justify-between p-4 rounded-xl bg-slate-950 border border-slate-800 text-sm font-bold">
          <span className="text-white">Net Cash Movement in Period</span>
          <span className={`font-mono text-lg ${netOperating >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            ${netOperating.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};
