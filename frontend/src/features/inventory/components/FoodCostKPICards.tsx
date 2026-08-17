import React from 'react';
import { DollarSign, AlertTriangle, TrendingDown, Layers } from 'lucide-react';
import { InventoryValuation, VarianceAnalysis } from '../types/inventory.types';

interface FoodCostKPICardsProps {
  valuation?: InventoryValuation;
  variance?: VarianceAnalysis;
  lowStockCount?: number;
  outOfStockCount?: number;
}

export const FoodCostKPICards: React.FC<FoodCostKPICardsProps> = ({
  valuation,
  variance,
  lowStockCount = 0,
  outOfStockCount = 0,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Total Valuation */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Valuation
          </span>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-slate-100">
            ${Number(valuation?.total_valuation || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Across {valuation?.total_items_count || 0} active master items
          </p>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-emerald-500/0 via-emerald-500/50 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* 2. Theoretical vs Actual Variance */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Cost Variance (30d)
          </span>
          <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className={`text-2xl font-bold ${Number(variance?.net_variance_cost || 0) > 0 ? 'text-rose-400' : 'text-slate-100'}`}>
            ${Number(variance?.net_variance_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Actual: ${Number(variance?.total_actual_cost || 0).toFixed(2)} | Theo: ${Number(variance?.total_theoretical_cost || 0).toFixed(2)}
          </p>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-rose-500/0 via-rose-500/50 to-rose-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* 3. Low / Out of Stock Alerts */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Stock Health
          </span>
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <div className="text-2xl font-bold text-amber-400">{lowStockCount}</div>
          <span className="text-xs text-slate-400">low stock</span>
          {outOfStockCount > 0 && (
            <>
              <span className="text-slate-600">•</span>
              <div className="text-2xl font-bold text-rose-400">{outOfStockCount}</div>
              <span className="text-xs text-slate-400">out of stock</span>
            </>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-1">Below minimum threshold levels</p>
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-amber-500/0 via-amber-500/50 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* 4. Storage Breakdown */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Locations
          </span>
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-slate-100">
            {Object.keys(valuation?.by_location || {}).length || 1} Stations
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Kitchen, Main Store, Bar, Freezers
          </p>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-indigo-500/0 via-indigo-500/50 to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
};
