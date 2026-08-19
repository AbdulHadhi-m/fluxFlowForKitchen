import React from "react";
import { LoginForm } from "../components/LoginForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, ShieldCheck, Lock, UtensilsCrossed } from "lucide-react";

export const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-blue-500/30 transition-colors duration-200 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="bg-grid absolute inset-0 opacity-60" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-500/10 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[360px] bg-blue-600/10 blur-[140px] rounded-full" />
      </div>

      <div className="max-w-md w-full space-y-6 relative">
        {/* Brand header */}
        <div className="text-center space-y-3">
          <div className="relative inline-flex mb-1">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/40 to-teal-500/40 blur-xl rounded-full" />
            <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-emerald-500 to-teal-500 items-center justify-center shadow-lg shadow-blue-500/30 ring-1 ring-white/20 flex">
              <Zap className="h-7 w-7 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Fluxiflow <span className="text-gradient">for Kitchen</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              Restaurant Operations Management System
            </p>
          </div>
        </div>

        {/* Sign-in card */}
        <Card className="bg-white/85 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl shadow-2xl shadow-emerald-950/10 dark:shadow-black/40">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4 text-emerald-500" />
                Staff Sign In
              </CardTitle>
              <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10">
                JWT Auth
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Enter your credentials to access the kitchen &amp; dining terminals.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>

        {/* Trust footer */}
        <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 dark:text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Enterprise Lockout
          </span>
          <span className="h-3 w-px bg-slate-300 dark:bg-slate-700" />
          <span className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-emerald-500" /> 256-bit Encryption
          </span>
        </div>
      </div>
    </div>
  );
};