import React from "react";
import { ForgotPasswordForm } from "../components/ForgotPasswordForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound } from "lucide-react";

export const ForgotPasswordPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-blue-500/30">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-slate-900 border border-slate-800 items-center justify-center shadow-lg text-blue-400 mb-2">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Reset Account Password</h1>
          <p className="text-xs text-slate-400">
            Enter your email and we'll dispatch single-use recovery instructions.
          </p>
        </div>

        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-base font-semibold text-white">Recovery Request</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Zero-leakage enumeration protected endpoint.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ForgotPasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
