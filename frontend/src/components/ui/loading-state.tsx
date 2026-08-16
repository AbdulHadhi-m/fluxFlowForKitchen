import React from "react";
import { Loader2 } from "lucide-react";

export const LoadingState: React.FC<{ message?: string }> = ({
  message = "Loading...",
}) => {
  return (
    <div className="min-h-[250px] flex flex-col items-center justify-center p-6 text-center space-y-2.5">
      <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      <span className="text-xs text-slate-400 font-medium">{message}</span>
    </div>
  );
};
