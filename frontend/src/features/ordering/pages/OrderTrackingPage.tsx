import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useOrderTracking } from '../hooks/useOrdering';
import { OrderTimeline } from '../components/OrderTimeline';
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Receipt,
} from 'lucide-react';

export const OrderTrackingPage: React.FC = () => {
  const { trackingToken } = useParams<{
    trackingToken: string;
  }>();

  const { data: order, isLoading, error } = useOrderTracking(trackingToken || '');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-900 dark:text-white text-center transition-colors duration-200">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Connecting to Kitchen...</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Fetching real-time preparation status</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-900 dark:text-white text-center transition-colors duration-200">
        <AlertCircle className="w-14 h-14 text-rose-400 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Order Not Found</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 max-w-md">
          Unable to locate this order. Please verify your tracking URL link.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24 pt-6 transition-colors duration-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to={`/r/${order.restaurant_slug}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Storefront
          </Link>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {order.restaurant_name}
          </span>
        </div>

        {/* Hero Card */}
        <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 mb-6 relative overflow-hidden shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Live Order Tracking
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                Order #{order.order_number}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Placed on {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {order.order_type}
                {order.table_name && ` • Table ${order.table_name}`}
              </p>
            </div>

            <div className="px-4 py-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 text-sm font-bold flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              {order.display_stage}
            </div>
          </div>

          {/* Visual Step Timeline */}
          <OrderTimeline stage={order.display_stage} />
        </div>

        {/* Order Details & Receipt */}
        <div className="bg-white/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 mb-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-500" /> Items in this Order
          </h2>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {order.items.map((item, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {item.quantity}x {item.name}
                  </span>
                  {item.notes && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">"{item.notes}"</p>
                  )}
                </div>
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">${item.line_total}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-base font-bold text-slate-900 dark:text-white">Total Amount</span>
            <span className="text-2xl font-black text-amber-400">${order.total}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to={`/r/${order.restaurant_slug}`}
            className="flex-1 py-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-sm text-center transition-colors"
          >
            Order More Items
          </Link>
        </div>
      </div>
    </div>
  );
};
