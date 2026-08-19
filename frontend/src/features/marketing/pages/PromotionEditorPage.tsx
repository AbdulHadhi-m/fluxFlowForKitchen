import React from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Tag } from "lucide-react";
import { usePromotion } from "../hooks/useMarketing";
import { PromotionForm } from "../components/PromotionForm";

export const PromotionEditorPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { data: promotion, isLoading } = usePromotion(id || "");

  if (isEdit && isLoading) {
    return (
      <div className="p-12 text-center text-xs text-slate-500 animate-pulse">
        Loading promotion details...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          to="/marketing/promotions"
          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Tag className="h-5 w-5 text-indigo-400" />
            <span>{isEdit ? "Edit Promotion Rule" : "Create New Promotion Rule"}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isEdit
              ? `Configure settings and eligibility for ${promotion?.name}`
              : "Define automatic discount criteria, schedule, audience targeting, and usage limits"}
          </p>
        </div>
      </div>

      <PromotionForm initialData={promotion} isEdit={isEdit} />
    </div>
  );
};
