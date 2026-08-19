import React from "react";
import { Link } from "react-router-dom";
import { Tag, Play, Pause, Edit3, Trash2, Calendar, Percent, IndianRupee } from "lucide-react";
import { Promotion } from "../types/marketing.types";
import { PromotionStatusBadge } from "./PromotionStatusBadge";
import { useActivatePromotion, usePausePromotion, useDeletePromotion } from "../hooks/useMarketing";

interface Props {
  promotion: Promotion;
}

export const PromotionCard: React.FC<Props> = ({ promotion }) => {
  const activateMut = useActivatePromotion();
  const pauseMut = usePausePromotion();
  const deleteMut = useDeletePromotion();

  const isPercentage = promotion.promotion_type === "PERCENTAGE_DISCOUNT";
  const isFixed = promotion.promotion_type === "FIXED_DISCOUNT";

  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/80 transition-all flex flex-col justify-between group">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              {isPercentage ? <Percent className="h-4 w-4" /> : isFixed ? <IndianRupee className="h-4 w-4" /> : <Tag className="h-4 w-4" />}
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors leading-tight">
                {promotion.name}
              </h4>
              <div className="text-[10px] text-slate-500 font-medium">
                {promotion.promotion_type.replace(/_/g, " ")} • Priority {promotion.priority}
              </div>
            </div>
          </div>
          <PromotionStatusBadge status={promotion.status} />
        </div>

        {promotion.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">{promotion.description}</p>
        )}

        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/50 text-[11px] mb-3">
          <div>
            <span className="text-slate-500 block text-[10px]">Discount Value</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-300">
              {isPercentage ? `${promotion.discount_value}%` : `₹${promotion.discount_value}`}
              {promotion.max_discount_amount && (
                <span className="text-[10px] text-slate-500 font-normal ml-1">(Cap ${promotion.max_discount_amount})</span>
              )}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[10px]">Redemptions</span>
            <span className="font-bold text-emerald-400">
              {promotion.current_usage_count}
              {promotion.total_usage_limit ? ` /${promotion.total_usage_limit}` : " uses"}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[10px]">Min Spend</span>
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              {Number(promotion.min_order_value) > 0 ? `₹${promotion.min_order_value}` : "No min"}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[10px]">Audience</span>
            <span className="font-semibold text-slate-600 dark:text-slate-300 truncate block">
              {promotion.target_audience_type.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>From: {new Date(promotion.start_at).toLocaleDateString()}</span>
          </div>
          {promotion.end_at && (
            <span>To: {new Date(promotion.end_at).toLocaleDateString()}</span>
          )}
          {promotion.stackable && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              Stackable
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200 dark:border-slate-800/80 gap-2">
        <div className="flex items-center gap-1.5">
          {promotion.status === "ACTIVE" ? (
            <button
              onClick={() => pauseMut.mutate(promotion.id)}
              disabled={pauseMut.isPending}
              className="px-2 py-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 text-[11px] font-semibold flex items-center gap-1"
            >
              <Pause className="h-3 w-3" />
              Pause
            </button>
          ) : promotion.status === "PAUSED" || promotion.status === "DRAFT" ? (
            <button
              onClick={() => activateMut.mutate(promotion.id)}
              disabled={activateMut.isPending}
              className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-[11px] font-semibold flex items-center gap-1"
            >
              <Play className="h-3 w-3" />
              Activate
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-1">
          <Link
            to={`/marketing/promotions/${promotion.id}/edit`}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            title="Edit Rule"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={() => {
              if (confirm(`Archive promotion "${promotion.name}"?`)) {
                deleteMut.mutate(promotion.id);
              }
            }}
            disabled={deleteMut.isPending}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Archive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
