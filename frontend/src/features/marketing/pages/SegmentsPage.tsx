import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";
import { useSegments } from "../hooks/useMarketing";
import { SegmentList } from "../components/SegmentList";
import { CreateSegmentModal } from "../components/CreateSegmentModal";

export const SegmentsPage: React.FC = () => {
  const { data: segments, isLoading } = useSegments();
  const [isModalOpen, setIsModalOpen] = useState(false);

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
            <Users className="h-5 w-5 text-pink-400" />
            <span>Customer Segments</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Dynamic behavioral audience segmentation for marketing campaigns</p>
        </div>
      </div>

      <SegmentList
        segments={segments || []}
        isLoading={isLoading}
        onCreateSegment={() => setIsModalOpen(true)}
      />

      <CreateSegmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
