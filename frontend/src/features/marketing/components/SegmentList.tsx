import React, { useState } from "react";
import { Users, Plus, Eye, Sparkles } from "lucide-react";
import { CustomerSegment } from "../types/marketing.types";
import { marketingApi } from "../api/marketing.api";

interface Props {
  segments: CustomerSegment[];
  isLoading?: boolean;
  onCreateSegment: () => void;
}

export const SegmentList: React.FC<Props> = ({ segments, isLoading, onCreateSegment }) => {
  const [selectedSegment, setSelectedSegment] = useState<CustomerSegment | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const handlePreview = async (segment: CustomerSegment) => {
    setSelectedSegment(segment);
    setIsPreviewLoading(true);
    try {
      const res = await marketingApi.previewSegment(segment.id);
      setPreviewData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800/80">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Dynamic Audience Segments</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Target promotions and campaigns by customer spend and dining patterns</p>
        </div>

        <button
          onClick={onCreateSegment}
          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Segment</span>
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : segments.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-slate-100/70 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 p-8">
          <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mx-auto mb-3">
            <Users className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">No Customer Segments</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Build rules for VIPs, high spenders, and at-risk guests to trigger personalized marketing campaigns.
          </p>
          <button
            onClick={onCreateSegment}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all"
          >
            Create First Segment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {segments.map((seg) => (
            <div
              key={seg.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                    {seg.segment_type.replace(/_/g, " ")}
                  </span>
                  <button
                    onClick={() => handlePreview(seg)}
                    className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 text-[11px]"
                    title="Preview Audience"
                  >
                    <Eye className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Preview</span>
                  </button>
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{seg.name}</h4>
                {seg.description && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{seg.description}</p>}

                <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/50 space-y-1 text-[11px] mb-3">
                  {Number(seg.min_spend) > 0 && (
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Min Lifetime Spend:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">₹{seg.min_spend}</span>
                    </div>
                  )}
                  {seg.min_visits > 0 && (
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Min Visits:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{seg.min_visits}+</span>
                    </div>
                  )}
                  {seg.inactive_days > 0 && (
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Inactive Threshold:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{seg.inactive_days} days</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                <span>Created {new Date(seg.created_at).toLocaleDateString()}</span>
                <span className="text-emerald-400 font-bold">Active Rule</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Audience Preview Modal */}
      {selectedSegment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{selectedSegment.name}</h3>
                  <div className="text-[10px] text-slate-500">Live audience calculation</div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedSegment(null);
                  setPreviewData(null);
                }}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {isPreviewLoading ? (
                <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400 animate-pulse">
                  Evaluating dynamic database rules across customer records...
                </div>
              ) : previewData ? (
                <>
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-300 font-semibold">Total Audience Reach</div>
                      <div className="text-xl font-extrabold text-slate-900 dark:text-white">
                        {previewData.total_audience_count} customers
                      </div>
                    </div>
                    <Sparkles className="h-6 w-6 text-emerald-400" />
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">Sample Profiles (Masked for Privacy)</h5>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {previewData.sample_profiles.map((p: any) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/60 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-700 dark:text-slate-200">{p.name}</span>
                            <span className="text-[10px] text-slate-500 ml-2 font-mono">{p.phone_masked}</span>
                          </div>
                          <div className="text-right text-[11px]">
                            <span className="text-emerald-400 font-bold">₹{p.total_spend}</span>
                            <span className="text-slate-500 ml-1.5">({p.total_visits} visits)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => {
                    setSelectedSegment(null);
                    setPreviewData(null);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
