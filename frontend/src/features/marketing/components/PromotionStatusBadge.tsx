import React from "react";
import { PromotionStatus } from "../types/marketing.types";

export const PromotionStatusBadge: React.FC<{ status: PromotionStatus }> = ({ status }) => {
  const styles: Record<PromotionStatus, string> = {
    ACTIVE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    SCHEDULED: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    DRAFT: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    PAUSED: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    EXPIRED: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    ARCHIVED: "bg-zinc-800 text-zinc-500 border-zinc-700",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border tracking-wider uppercase ${
        styles[status] || styles.DRAFT
      }`}
    >
      {status}
    </span>
  );
};
