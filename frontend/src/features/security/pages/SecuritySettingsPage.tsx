import React, { useEffect, useState } from "react";
import {
  Settings,
  Key,
  Lock,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { securityApi } from "../api/security.api";
import { SecurityPolicyData } from "../types/security.types";

export const SecuritySettingsPage: React.FC = () => {
  const [policy, setPolicy] = useState<SecurityPolicyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      setLoading(true);
      const res = await securityApi.getSecurityPolicy();
      if (res.success) {
        setPolicy(res.data);
      }
    } catch (err) {
      console.error("Failed to load policy", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policy) return;
    try {
      setSaving(true);
      setErrorMsg("");
      setSuccessMsg("");
      const res = await securityApi.updateSecurityPolicy(policy);
      if (res.success) {
        setPolicy(res.data);
        setSuccessMsg("Security policy updated successfully.");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || "Failed to update security policy");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
          <Settings className="h-4 w-4" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight text-white">Tenant Security & Policy Settings</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure password strength requirements, MFA enforcement, session lifetimes, and brute-force lockout rules.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-950/40 border border-emerald-800 p-3 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-950/40 border border-rose-800 p-3 rounded-xl text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          {errorMsg}
        </div>
      )}

      {loading ? (
        <Card className="bg-slate-900/60 border-slate-800 p-8 text-center text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-400" />
          Loading security policy...
        </Card>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Password Policy */}
          <Card className="bg-slate-900/60 border-slate-800 p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Lock className="h-4 w-4 text-indigo-400" />
              Password Strength & Complexity
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Minimum Length</label>
                <Input
                  type="number"
                  min={8}
                  max={64}
                  value={policy?.password_min_length || 8}
                  onChange={(e) => setPolicy({ ...policy!, password_min_length: parseInt(e.target.value) || 8 })}
                  className="bg-slate-950 border-slate-800 text-xs h-9"
                />
              </div>

              <div className="space-y-2 sm:col-span-2 pt-2">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policy?.password_require_uppercase || false}
                    onChange={(e) => setPolicy({ ...policy!, password_require_uppercase: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600"
                  />
                  <span>Require at least one uppercase letter (A-Z)</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policy?.password_require_number || false}
                    onChange={(e) => setPolicy({ ...policy!, password_require_number: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600"
                  />
                  <span>Require at least one numeric digit (0-9)</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policy?.password_require_special || false}
                    onChange={(e) => setPolicy({ ...policy!, password_require_special: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600"
                  />
                  <span>Require at least one special character (!@#$%^&*)</span>
                </label>
              </div>
            </div>
          </Card>

          {/* MFA Enforcement */}
          <Card className="bg-slate-900/60 border-slate-800 p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Key className="h-4 w-4 text-emerald-400" />
              MFA Enforcement Rules
            </h2>
            <div className="space-y-3 text-xs">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy?.mfa_required_for_admins || false}
                  onChange={(e) => setPolicy({ ...policy!, mfa_required_for_admins: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600"
                />
                <div>
                  <span className="font-semibold text-white">Require MFA for Privileged Accounts</span>
                  <p className="text-[11px] text-slate-500">Enforces 2FA on Restaurant Admin, Manager, and Finance roles.</p>
                </div>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy?.mfa_required_for_all || false}
                  onChange={(e) => setPolicy({ ...policy!, mfa_required_for_all: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600"
                />
                <div>
                  <span className="font-semibold text-white">Enforce MFA for All Staff Accounts</span>
                  <p className="text-[11px] text-slate-500">Mandates 2FA setup on next login for every team member.</p>
                </div>
              </label>
            </div>
          </Card>

          {/* Sessions & Lockout */}
          <Card className="bg-slate-900/60 border-slate-800 p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              Sessions & Brute-Force Lockout
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Session Inactivity Timeout (Minutes)</label>
                <Input
                  type="number"
                  min={15}
                  max={1440}
                  value={policy?.session_timeout_minutes || 480}
                  onChange={(e) => setPolicy({ ...policy!, session_timeout_minutes: parseInt(e.target.value) || 480 })}
                  className="bg-slate-950 border-slate-800 text-xs h-9"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Max Concurrent Sessions Per User</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={policy?.max_concurrent_sessions || 5}
                  onChange={(e) => setPolicy({ ...policy!, max_concurrent_sessions: parseInt(e.target.value) || 5 })}
                  className="bg-slate-950 border-slate-800 text-xs h-9"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Max Failed Logins Before Lockout</label>
                <Input
                  type="number"
                  min={3}
                  max={10}
                  value={policy?.max_failed_login_attempts || 5}
                  onChange={(e) => setPolicy({ ...policy!, max_failed_login_attempts: parseInt(e.target.value) || 5 })}
                  className="bg-slate-950 border-slate-800 text-xs h-9"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Lockout Duration (Minutes)</label>
                <Input
                  type="number"
                  min={5}
                  max={120}
                  value={policy?.lockout_duration_minutes || 15}
                  onChange={(e) => setPolicy({ ...policy!, lockout_duration_minutes: parseInt(e.target.value) || 15 })}
                  className="bg-slate-950 border-slate-800 text-xs h-9"
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-6">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Save Security Policy
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
