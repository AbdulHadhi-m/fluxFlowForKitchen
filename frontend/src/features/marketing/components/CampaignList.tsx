import React from "react";
import { Send, Play, Plus, CheckCircle2, MessageSquare, Mail, Bell } from "lucide-react";
import { Campaign, CampaignChannel } from "../types/marketing.types";
import { useLaunchCampaign } from "../hooks/useMarketing";

interface Props {
  campaigns: Campaign[];
  isLoading?: boolean;
  onCreateCampaign: () => void;
}

export const CampaignList: React.FC<Props> = ({ campaigns, isLoading, onCreateCampaign }) => {
  const launchMut = useLaunchCampaign();

  const channelIcons: Record<CampaignChannel, any> = {
    IN_APP: Bell,
    EMAIL: Mail,
    SMS: MessageSquare,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800/80">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Marketing Campaigns & Broadcasts</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Launch targeted promotional messages with customer consent enforcement</p>
        </div>

        <button
          onClick={onCreateCampaign}
          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Campaign</span>
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-slate-100/70 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 p-8">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <Send className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">No Campaigns Created</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Broadcast in-app alerts, emails, or SMS vouchers to target customer segments.
          </p>
          <button
            onClick={onCreateCampaign}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all"
          >
            Create First Campaign
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const ChannelIcon = channelIcons[c.channel] || Bell;
            return (
              <div
                key={c.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                    <ChannelIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{c.name}</h4>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                          c.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : c.status === "RUNNING"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse"
                            : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {c.title} • Channel: <span className="font-semibold text-slate-600 dark:text-slate-300">{c.channel}</span>
                      {c.target_segment_name && (
                        <span> • Segment: <span className="text-emerald-600 dark:text-emerald-300 font-semibold">{c.target_segment_name}</span></span>
                      )}
                      {c.promotion_name && (
                        <span> • Promo: <span className="text-emerald-600 dark:text-emerald-300 font-semibold">{c.promotion_name}</span></span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 mt-1 font-mono line-clamp-1 bg-slate-100/80 dark:bg-slate-950/60 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800/50">
                      Template: {c.message_template}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-slate-800">
                  <div className="text-left md:text-right">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {c.sent_count} <span className="text-slate-500 font-normal">sent</span> /{" "}
                      <span className="text-slate-500 dark:text-slate-400">{c.skipped_count} skipped</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Started: {new Date(c.start_at).toLocaleDateString()}
                    </div>
                  </div>

                  {c.status === "DRAFT" || c.status === "PAUSED" ? (
                    <button
                      onClick={() => launchMut.mutate(c.id)}
                      disabled={launchMut.isPending}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
                    >
                      <Play className="h-3.5 w-3.5" />
                      <span>{launchMut.isPending ? "Sending..." : "Launch Now"}</span>
                    </button>
                  ) : c.status === "COMPLETED" ? (
                    <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Broadcasted</span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
