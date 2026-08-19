import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Tag } from "lucide-react";
import { usePromotions } from "../hooks/useMarketing";
import { PromotionList } from "../components/PromotionList";

export const PromotionsPage: React.FC = () => {
  const { data: promotions, isLoading } = usePromotions();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          to="/marketing"
          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Tag className="h-5 w-5 text-indigo-400" />
            <span>Promotions & Discount Rules</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Manage automated percent/fixed discounts, buy X get Y, and item caps</p>
        </div>
      </div>

      <PromotionList promotions={promotions || []} isLoading={isLoading} />
    </div>
  );
};
