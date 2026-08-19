import React from "react";
import { RegisterForm } from "../components/RegisterForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Sparkles, ShieldCheck, Lock, UserPlus } from "lucide-react";

export const RegisterPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-emerald-500/30 transition-colors duration-200 relative overflow-hidden">
      {/* Ambient background lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="bg-grid absolute inset-0 opacity-50 dark:opacity-20" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/15 dark:bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-500/15 dark:bg-teal-500/10 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-emerald-600/10 dark:bg-emerald-600/5 blur-[140px] rounded-full" />
      </div>

      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="max-w-lg w-full space-y-5 relative z-10 my-6">
        {/* Brand header */}
        <div className="text-center space-y-2.5">
          <div className="relative inline-flex mb-0.5">
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-600/40 to-teal-500/40 blur-xl rounded-full" />
            <div className="relative h-13 w-13 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-500 items-center justify-center shadow-xl shadow-emerald-600/30 ring-1 ring-white/25 flex p-3">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Fluxiflow <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent">for Kitchen</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Create your restaurant staff &amp; kitchen workstation account
            </p>
          </div>
        </div>

        {/* Register card */}
        <Card className="bg-white/90 dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl shadow-2xl shadow-emerald-950/10 dark:shadow-black/50 rounded-3xl overflow-hidden">
          <CardHeader className="space-y-1 pb-3.5 pt-5 px-6 border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-emerald-500" />
                Register Restaurant Account
              </CardTitle>
              <Badge
                variant="outline"
                className="text-[10px] font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
              >
                Instant Setup
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Set up your staff credentials and kitchen profile in seconds.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <RegisterForm />
          </CardContent>
        </Card>

        {/* Trust footer */}
        <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 dark:text-slate-500 pt-1">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Enterprise Isolation
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
