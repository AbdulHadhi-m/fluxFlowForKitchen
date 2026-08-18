import React, { useEffect, useState } from "react";
import {
  UserCheck,
  LogOut,
  Loader2,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { securityApi } from "../api/security.api";
import { AccessReviewUser } from "../types/security.types";

export const AccessReviewPage: React.FC = () => {
  const [users, setUsers] = useState<AccessReviewUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadAccessReview();
  }, []);

  const loadAccessReview = async () => {
    try {
      setLoading(true);
      const res = await securityApi.getAccessReview();
      if (res.success) {
        setUsers(res.data.users);
      }
    } catch (err) {
      console.error("Failed to load access review", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSessions = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to terminate all active sessions for ${email}?`)) return;
    try {
      setRevokingId(userId);
      const res = await securityApi.revokeUserSessions(userId);
      if (res.success) {
        setNotification({
          message: `Successfully revoked ${res.data.revoked_count} active sessions for ${email}.`,
          type: "success",
        });
        loadAccessReview();
      }
    } catch (err: any) {
      setNotification({
        message: err.response?.data?.error?.message || "Failed to revoke sessions",
        type: "error",
      });
    } finally {
      setRevokingId(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (u.active_role && u.active_role.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <UserCheck className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-white">Access & Session Review</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Audit privileged staff accounts, 2FA enrollment status, active device sessions, and perform administrative session revocations.
          </p>
        </div>
      </div>

      {notification && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            notification.type === "success"
              ? "bg-emerald-950/40 border border-emerald-800 text-emerald-300"
              : "bg-rose-950/40 border border-rose-800 text-rose-300"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
          )}
          {notification.message}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or role..."
          className="pl-9 bg-slate-950 border-slate-800 text-xs text-slate-200 h-9"
        />
      </div>

      {/* Users Table */}
      <Card className="bg-slate-900/60 border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
              <tr>
                <th className="p-3.5">Staff Member</th>
                <th className="p-3.5">Active Role</th>
                <th className="p-3.5 text-center">MFA Status</th>
                <th className="p-3.5 text-center">Active Sessions</th>
                <th className="p-3.5">Last Login</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-emerald-400" />
                    Loading staff access review...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No staff records found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.user_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-white text-xs">{user.full_name || "—"}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{user.email}</div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {user.active_role || "No Active Role"}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      {user.mfa_enabled ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Enforced
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                          <XCircle className="h-3.5 w-3.5 text-slate-600" /> Disabled
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="font-mono font-bold text-slate-200">
                        {user.active_sessions}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-400">
                      {user.last_login ? new Date(user.last_login).toLocaleString() : "Never"}
                    </td>
                    <td className="p-3.5 text-right">
                      {user.active_sessions > 0 ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRevokeSessions(user.user_id, user.email)}
                          disabled={revokingId === user.user_id}
                          className="h-7 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 gap-1"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Revoke Sessions
                        </Button>
                      ) : (
                        <span className="text-[11px] text-slate-600 italic">No active sessions</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
