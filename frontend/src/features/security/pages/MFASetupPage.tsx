import React, { useEffect, useState } from "react";
import {
  Key,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { securityApi } from "../api/security.api";
import { MFADeviceInfo } from "../types/security.types";

export const MFASetupPage: React.FC = () => {
  const [mfaStatus, setMfaStatus] = useState<{ mfa_enabled: boolean; device: MFADeviceInfo | null } | null>(null);

  // Setup flow states
  const [setupData, setSetupData] = useState<{ secret: string; provisioning_uri: string } | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Disable flow
  const [disablePassword, setDisablePassword] = useState("");
  const [showDisableModal, setShowDisableModal] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const res = await securityApi.getMFAStatus();
      if (res.success) {
        setMfaStatus(res.data);
      }
    } catch (err) {
      console.error("Failed to load MFA status", err);
    }
  };

  const handleStartSetup = async () => {
    try {
      setErrorMsg("");
      const res = await securityApi.setupMFA();
      if (res.success) {
        setSetupData(res.data);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || "Failed to initiate MFA setup");
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMsg("");
      const res = await securityApi.verifyMFA(otpCode);
      if (res.success) {
        setRecoveryCodes(res.data.recovery_codes);
        setSuccessMsg(res.data.message);
        setSetupData(null);
        loadStatus();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || "Invalid verification code");
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMsg("");
      const res = await securityApi.disableMFA(disablePassword);
      if (res.success) {
        setShowDisableModal(false);
        setDisablePassword("");
        setRecoveryCodes([]);
        loadStatus();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || "Incorrect password");
    }
  };

  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Key className="h-4 w-4" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Two-Factor Authentication (2FA)</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Protect your account with standard TOTP-based authentication (Google Authenticator, Authy, 1Password).
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-950/40 border border-rose-800 p-3 rounded-xl text-xs text-rose-600 dark:text-rose-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-950/40 border border-emerald-800 p-3 rounded-xl text-xs text-emerald-600 dark:text-emerald-300 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
          {successMsg}
        </div>
      )}

      {/* Status Card */}
      <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {mfaStatus?.mfa_enabled ? (
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
            )}
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                MFA Status: {mfaStatus?.mfa_enabled ? (
                  <span className="text-emerald-400">Active & Enforced</span>
                ) : (
                  <span className="text-slate-400">Disabled</span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {mfaStatus?.mfa_enabled
                  ? `Active since ${mfaStatus.device?.verified_at ? new Date(mfaStatus.device.verified_at).toLocaleDateString() : "recently"}`
                  : "MFA is not currently active on your staff profile."}
              </p>
            </div>
          </div>

          {mfaStatus?.mfa_enabled ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDisableModal(true)}
              className="border-rose-900/60 text-rose-400 hover:bg-rose-950/40 text-xs font-bold"
            >
              Disable MFA
            </Button>
          ) : (
            !setupData && (
              <Button
                onClick={handleStartSetup}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
              >
                Enable 2FA
              </Button>
            )
          )}
        </div>

        {/* Setup Flow in Progress */}
        {setupData && (
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-4 animate-in fade-in">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Step 1: Link Authenticator App</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Open your authenticator app (Google Authenticator, Microsoft Authenticator, 1Password) and enter the key below:
            </p>

            <div className="bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="font-mono text-sm tracking-wider text-emerald-400 font-bold">{setupData.secret}</span>
              <Button size="sm" variant="ghost" onClick={copySecret} className="h-7 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white gap-1">
                {copiedSecret ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedSecret ? "Copied" : "Copy"}
              </Button>
            </div>

            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider pt-2">Step 2: Enter 6-Digit Code</h3>
            <form onSubmit={handleVerify} className="space-y-3">
              <Input
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="font-mono text-center tracking-widest text-lg bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-11"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setSetupData(null)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">
                  Verify & Activate
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Recovery Codes Display */}
        {recoveryCodes.length > 0 && (
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
              <AlertTriangle className="h-4 w-4" />
              Save Your Recovery Codes
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              If you lose access to your authenticator device, each recovery code can be used once to access your account.
              Store these securely:
            </p>
            <div className="grid grid-cols-2 gap-2 bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-600 dark:text-slate-300">
              {recoveryCodes.map((code, idx) => (
                <div key={idx} className="p-1 bg-slate-100/60 dark:bg-slate-900/60 rounded text-center font-bold text-emerald-600 dark:text-emerald-300">
                  {code}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Disable Modal */}
      {showDisableModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 text-rose-400">
              <Lock className="h-4 w-4" />
              Confirm Disabling 2FA
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Enter your current account password to verify your identity and disable two-factor authentication.
            </p>
            <form onSubmit={handleDisable} className="space-y-3">
              <Input
                type="password"
                required
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Current account password"
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs"
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowDisableModal(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold">
                  Disable 2FA
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
