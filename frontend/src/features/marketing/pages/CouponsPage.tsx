import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Gift } from "lucide-react";
import { useCoupons, usePromotions } from "../hooks/useMarketing";
import { CouponList } from "../components/CouponList";
import { CreateCouponModal } from "../components/CreateCouponModal";
import { BulkCouponModal } from "../components/BulkCouponModal";

export const CouponsPage: React.FC = () => {
  const { data: coupons, isLoading } = useCoupons();
  const { data: promotions } = usePromotions();

  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

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
            <Gift className="h-5 w-5 text-violet-400" />
            <span>Vouchers & Coupon Codes</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Generate, distribute, and track single and batch promotional codes</p>
        </div>
      </div>

      <CouponList
        coupons={coupons || []}
        isLoading={isLoading}
        onCreateSingle={() => setIsSingleModalOpen(true)}
        onCreateBulk={() => setIsBulkModalOpen(true)}
      />

      <CreateCouponModal
        isOpen={isSingleModalOpen}
        onClose={() => setIsSingleModalOpen(false)}
        promotions={promotions || []}
      />

      <BulkCouponModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        promotions={promotions || []}
      />
    </div>
  );
};
