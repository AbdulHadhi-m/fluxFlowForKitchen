import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught frontend error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center space-y-4 bg-slate-900/60 rounded-2xl border border-slate-800 m-4">
          <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1 max-w-md">
            <h2 className="text-base font-bold text-white">Something went wrong</h2>
            <p className="text-xs text-slate-400">
              An unexpected UI error occurred while rendering this component. You can reload the section.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => this.setState({ hasError: false })}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
