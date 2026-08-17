import React from 'react';
import { PublicRestaurant } from '../types/ordering.types';
import { Store, Phone, MapPin, CheckCircle2, XCircle } from 'lucide-react';

interface StorefrontHeaderProps {
  restaurant: PublicRestaurant;
  tableInfo?: { tableName: string; section?: string } | null;
}

export const StorefrontHeader: React.FC<StorefrontHeaderProps> = ({ restaurant, tableInfo }) => {
  return (
    <div className="relative bg-slate-900 text-white rounded-3xl overflow-hidden shadow-2xl border border-slate-800 mb-8">
      {/* Cover Background */}
      <div className="h-44 sm:h-52 w-full bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 opacity-90 relative">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      </div>

      {/* Profile Bar */}
      <div className="px-6 sm:px-10 pb-6 pt-4 relative -mt-16 sm:-mt-20 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div className="flex items-end gap-5">
          <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl bg-slate-950 border-4 border-slate-800 shadow-xl flex items-center justify-center text-amber-500 overflow-hidden flex-shrink-0">
            <Store className="w-12 h-12" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{restaurant.name}</h1>
              {restaurant.is_open ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Open
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <XCircle className="w-3.5 h-3.5" /> Closed
                </span>
              )}
            </div>
            {restaurant.tagline && (
              <p className="text-sm text-slate-300 mt-1 font-medium">{restaurant.tagline}</p>
            )}
            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-400 mt-2">
              {restaurant.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {restaurant.address_line1 ? `${restaurant.address_line1}, ` : ''}{restaurant.city}
                </span>
              )}
              {restaurant.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {restaurant.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Table Banner or Ordering Mode */}
        {tableInfo ? (
          <div className="bg-amber-500/15 border border-amber-500/30 px-4 py-2 rounded-xl text-amber-300 flex items-center gap-2 text-sm font-medium">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
            Ordering for <strong>{tableInfo.tableName}</strong> {tableInfo.section && `(${tableInfo.section})`}
          </div>
        ) : (
          <div className="bg-slate-800/80 border border-slate-700/80 px-4 py-2 rounded-xl text-slate-300 text-xs font-medium">
            Takeaway & Dine-in Digital Menu
          </div>
        )}
      </div>
    </div>
  );
};
