import React from "react";
import { Loader2 } from "lucide-react";

export const LoadingState: React.FC<{ message?: string }> = ({
  message = "Loading...",
}) => {
  return (
    <div className="min-h-[250px] flex flex-col items-center justify-center p-6 text-center space-y-3">
      <div className="relative">
        <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse" />
        <Loader2 className="relative h-7 w-7 animate-spin text-emerald-500" />
      </div>
      <span className="text-xs text-slate-400 font-medium tracking-wide">{message}</span>
    </div>
  );
};
