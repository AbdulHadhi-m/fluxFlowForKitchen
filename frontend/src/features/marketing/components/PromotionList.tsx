import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Filter, Tag } from "lucide-react";
import { Promotion } from "../types/marketing.types";
import { PromotionCard } from "./PromotionCard";

interface Props {
  promotions: Promotion[];
  isLoading?: boolean;
}

export const PromotionList: React.FC<Props> = ({ promotions, isLoading }) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filtered = promotions.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search promotions by name or description..."
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
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="PAUSED">Paused</option>
              <option value="DRAFT">Draft</option>
              <option value="EXPIRED">Expired</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <Link
            to="/marketing/promotions/new"
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Rule</span>
          </Link>
        </div>
      </div>

      {/* Grid of Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 p-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
            <Tag className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-bold text-white mb-1">No Promotions Found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            {search || statusFilter !== "ALL"
              ? "No promotional discounts match your active filters."
              : "Create your first discount rule to boost orders and reward diners."}
          </p>
          <Link
            to="/marketing/promotions/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create First Promotion</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((promo) => (
            <PromotionCard key={promo.id} promotion={promo} />
          ))}
        </div>
      )}
    </div>
  );
};
