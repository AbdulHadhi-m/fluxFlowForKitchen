import React from "react";
import { Customer } from "../types/customers.types";
import { Card, CardContent } from "@/components/ui/card";
import { User, Phone, Mail } from "lucide-react";

interface CustomerListTableProps {
  customers: Customer[];
  onSelectCustomer?: (customer: Customer) => void;
}

export const CustomerListTable: React.FC<CustomerListTableProps> = ({
  customers,
  onSelectCustomer,
}) => {
  if (customers.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
        No matching customer profiles found.
      </div>
    );
  }

  return (
    <Card className="bg-slate-900/60 border-slate-800 overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Tags & Preferences</th>
                <th className="px-4 py-3 text-center">Visits</th>
                <th className="px-4 py-3 text-right">Total Spend</th>
                <th className="px-4 py-3 text-right">Last Visit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {customers.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => onSelectCustomer?.(c)}
                  className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 font-semibold text-white">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                        <User className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div>{c.full_name}</div>
                        {c.dietary_preferences.length > 0 && (
                          <div className="text-[10px] text-emerald-400 font-normal">
                            {c.dietary_preferences.join(", ")}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Phone className="h-3 w-3 text-slate-500" />
                        <span>{c.phone}</span>
                      </div>
                      {c.email && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <Mail className="h-3 w-3 text-slate-600" />
                          <span>{c.email}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <span
                          key={t.id}
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                        >
                          {t.name}
                        </span>
                      ))}
                      {c.allergies.map((a) => (
                        <span
                          key={a}
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20"
                        >
                          Allergy: {a}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center font-bold text-white">
                    {c.total_visits}
                  </td>

                  <td className="px-4 py-3 text-right font-black text-indigo-300">
                    ${c.total_spend}
                  </td>

                  <td className="px-4 py-3 text-right text-[11px] text-slate-400">
                    {c.last_visit_at
                      ? new Date(c.last_visit_at).toLocaleDateString()
                      : "Never"}
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
