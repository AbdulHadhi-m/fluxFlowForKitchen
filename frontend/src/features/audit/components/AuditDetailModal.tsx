import React from "react";
import { AuditLogItem } from "../types/audit.types";
import { AuditActionBadge } from "./AuditActionBadge";
import { AuditDiffViewer } from "./AuditDiffViewer";
import { Button } from "@/components/ui/button";
import { Shield, User, Globe, Hash, X } from "lucide-react";

interface AuditDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: AuditLogItem | null;
}

export const AuditDetailModal: React.FC<AuditDetailModalProps> = ({
  isOpen,
  onClose,
  log,
}) => {
  if (!isOpen || !log) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 p-6 space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Audit Event Details
                <AuditActionBadge action={log.action} />
              </h2>
              <span className="text-[10px] text-slate-500 font-mono">
                {new Date(log.created_at).toLocaleString()}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-500 text-[10px] block">Actor:</span>
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                <User className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                {log.actor_email || log.actor_type}
              </span>
            </div>

            <div>
              <span className="text-slate-500 text-[10px] block">Active Role:</span>
              <span className="font-mono text-indigo-400 font-bold">{log.actor_role || "—"}</span>
            </div>

            <div>
              <span className="text-slate-500 text-[10px] block">Entity Target:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {log.entity_type} <span className="text-slate-500 dark:text-slate-400 text-[10px]">({log.entity_id || "—"})</span>
              </span>
            </div>

            {log.ip_address && (
              <div>
                <span className="text-slate-500 text-[10px] block">IP Address:</span>
                <span className="font-mono text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <Globe className="h-3 w-3 text-slate-500" />
                  {log.ip_address}
                </span>
              </div>
            )}

            {log.correlation_id && (
              <div className="col-span-2">
                <span className="text-slate-500 text-[10px] block">Correlation ID:</span>
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                  <Hash className="h-3 w-3 text-slate-500" />
                  {log.correlation_id}
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Action Summary</span>
            <p className="bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
              {log.description || "No description provided."}
            </p>
          </div>

          {/* Before / After Diff */}
          {(Object.keys(log.before_data || {}).length > 0 || Object.keys(log.after_data || {}).length > 0) && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">State Snapshot Changes</span>
              <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <AuditDiffViewer beforeData={log.before_data} afterData={log.after_data} />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white text-xs"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
