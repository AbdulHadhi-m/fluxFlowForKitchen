import React, { useState } from "react";
import { useAuditLogs } from "../hooks/useAuditLogs";
import { AuditActionBadge } from "../components/AuditActionBadge";
import { AuditDetailModal } from "../components/AuditDetailModal";
import { AuditLogItem } from "../types/audit.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Shield,
  Search,
  Download,
  Loader2,
  Eye,
} from "lucide-react";

export const AuditLogsPage: React.FC = () => {
  const [search, setSearch] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [entityFilter, setEntityFilter] = useState<string>("");
  const [presetFilter, setPresetFilter] = useState<string>("LAST_7_DAYS");
  const [categoryTab, setCategoryTab] = useState<string>("ALL");
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  // Quick category action mappings
  const getActionForCategory = () => {
    if (categoryTab === "SECURITY") return "LOGIN";
    if (categoryTab === "PROCUREMENT") return "APPROVED";
    if (categoryTab === "INVENTORY") return "STOCK_ADJUSTED";
    return actionFilter;
  };

  const {
    auditLogs,
    isLoadingLogs,
    exportAuditLogs,
    isExporting,
  } = useAuditLogs(
    search,
    getActionForCategory() || undefined,
    entityFilter || undefined,
    presetFilter
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Shield className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Security & Activity Audit Logs</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Immutable system-wide ledger of staff actions, security events, authentication records, and operational changes.
          </p>
        </div>

        <Button
          onClick={() => exportAuditLogs()}
          disabled={isExporting}
          variant="outline"
          size="sm"
          className="border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white text-xs gap-1.5 self-start sm:self-auto"
        >
          {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Export CSV Ledger
        </Button>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-white dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
        {[
          { id: "ALL", label: "All Audit Trails" },
          { id: "SECURITY", label: "Security & Auth" },
          { id: "INVENTORY", label: "Inventory Stock" },
          { id: "PROCUREMENT", label: "Procurement POs" },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={categoryTab === tab.id ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setCategoryTab(tab.id);
              setActionFilter("");
            }}
            className={`h-7 px-3 text-xs rounded-lg font-medium transition-all ${
              categoryTab === tab.id
                ? "bg-emerald-600 text-white font-bold shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800/60"
            }`}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-white dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/60">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description, actor, entity ID..."
            className="pl-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200 h-9"
          />
        </div>

        <select
          value={presetFilter}
          onChange={(e) => setPresetFilter(e.target.value)}
          className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:border-emerald-500 h-9"
        >
          <option value="TODAY">Today</option>
          <option value="YESTERDAY">Yesterday</option>
          <option value="LAST_7_DAYS">Last 7 Days</option>
          <option value="LAST_30_DAYS">Last 30 Days</option>
          <option value="THIS_MONTH">This Month</option>
        </select>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:border-emerald-500 h-9"
        >
          <option value="">All Entity Types</option>
          <option value="USER">User / Auth</option>
          <option value="STAFF">Staff</option>
          <option value="MENU_ITEM">Menu Item</option>
          <option value="ORDER">Order</option>
          <option value="BILL">Bill / Payment</option>
          <option value="INVENTORY_ITEM">Inventory Item</option>
          <option value="PURCHASE_ORDER">Purchase Order</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Actor</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Entity</th>
                <th className="p-3.5">Description</th>
                <th className="p-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-600 dark:text-slate-300">
              {isLoadingLogs ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Loading security audit logs...
                  </td>
                </tr>
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No audit records found matching your filters.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-slate-200/70 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                  >
                    <td className="p-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 dark:text-white text-xs">{log.actor_email || log.actor_type}</div>
                      {log.actor_role && (
                        <div className="text-[10px] text-emerald-400 font-mono">{log.actor_role}</div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <AuditActionBadge action={log.action} />
                    </td>
                    <td className="p-3.5 font-bold text-slate-700 dark:text-slate-200">
                      <div>{log.entity_type}</div>
                      {log.entity_id && (
                        <div className="text-[10px] text-slate-500 font-mono">{log.entity_id}</div>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {log.description}
                    </td>
                    <td className="p-3.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-emerald-400 hover:text-slate-900 dark:hover:text-white p-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AuditDetailModal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        log={selectedLog}
      />
    </div>
  );
};
