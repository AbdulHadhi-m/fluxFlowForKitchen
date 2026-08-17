import React, { useState } from "react";
import { Search, Filter, Plus, Layers, Gift, Copy, Check, Calendar } from "lucide-react";
import { Coupon } from "../types/marketing.types";

interface Props {
  coupons: Coupon[];
  isLoading?: boolean;
  onCreateSingle: () => void;
  onCreateBulk: () => void;
}

export const CouponList: React.FC<Props> = ({ coupons, isLoading, onCreateSingle, onCreateBulk }) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filtered = coupons.filter((c) => {
    const matchesSearch =
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.promotion_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search coupon codes or promotions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-2.5 py-1.5 rounded-xl">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by Status"
              className="bg-transparent text-xs text-slate-300 focus:outline-none font-medium"
            >
              <option value="ALL">All Codes</option>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>

          <button
            onClick={onCreateBulk}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700 flex items-center gap-1.5 shrink-0"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Bulk Generate</span>
          </button>

          <button
            onClick={onCreateSingle}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Single Code</span>
          </button>
        </div>
      </div>

      {/* Table / Grid */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-slate-900/40 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 p-8">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mx-auto mb-3">
            <Gift className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-bold text-white mb-1">No Coupon Codes Found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Generate unique or bulk promo vouchers to share across social, SMS, or in-restaurant menus.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={onCreateSingle}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all"
            >
              Add Single Code
            </button>
            <button
              onClick={onCreateBulk}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all border border-slate-700"
            >
              Bulk Generate
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-900/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
              <tr>
                <th className="py-3 px-4">Coupon Code</th>
                <th className="py-3 px-4">Linked Promotion</th>
                <th className="py-3 px-4">Usage Count</th>
                <th className="py-3 px-4">Customer Limit</th>
                <th className="py-3 px-4">Validity Period</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-white">
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 text-indigo-300">
                        {c.code}
                      </span>
                      <button
                        onClick={() => handleCopy(c.code)}
                        className="text-slate-500 hover:text-white p-1 rounded"
                        title="Copy code"
                      >
                        {copiedCode === c.code ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-300 font-medium">{c.promotion_name}</td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-emerald-400">{c.current_usage_count}</span>
                    <span className="text-slate-500 font-normal">
                      {c.usage_limit ? ` / ${c.usage_limit}` : " / ∞"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{c.per_customer_limit} per diner</td>
                  <td className="py-3 px-4 text-slate-400">
                    <div className="flex items-center gap-1 text-[11px]">
                      <Calendar className="h-3 w-3 text-slate-500" />
                      <span>{new Date(c.valid_from).toLocaleDateString()}</span>
                      {c.valid_until && <span>- {new Date(c.valid_until).toLocaleDateString()}</span>}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border tracking-wider uppercase ${
                        c.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
