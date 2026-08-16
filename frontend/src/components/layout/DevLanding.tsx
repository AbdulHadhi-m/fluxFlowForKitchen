import React from "react";
import { useQuery } from "@tanstack/react-query";
import { healthService } from "@/services/health.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Database,
  Layers,
  RefreshCw,
  Server,
  Terminal,
  Zap,
  AlertCircle
} from "lucide-react";

export const DevLanding: React.FC = () => {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["healthCheck"],
    queryFn: healthService.getHealth,
    refetchInterval: 10000,
  });

  const healthData = data?.data;
  const isHealthy = data?.success && healthData?.status === "healthy";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 md:p-12 selection:bg-blue-500/30">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[300px] bg-indigo-600/10 blur-[100px] rounded-full" />
      </div>

      {/* Header */}
      <header className="max-w-6xl w-full mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-8 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Fluxiflow for Kitchen
              <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400 bg-blue-500/10 font-mono">
                v1.0.0-foundation
              </Badge>
            </h1>
            <p className="text-xs text-slate-400">
              Restaurant Operations Management System — Core Development Environment
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge
            variant={isHealthy ? "success" : isError ? "destructive" : "warning"}
            className="px-3 py-1 text-xs gap-1.5"
          >
            {isHealthy ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Backend Connected & Ready
              </>
            ) : isLoading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-400" />
                Connecting Backend...
              </>
            ) : (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                Backend Offline / Initializing
              </>
            )}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="border-slate-800 hover:bg-slate-800 text-slate-300 gap-1.5 text-xs h-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="max-w-6xl w-full mx-auto py-8 flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Backend Runtime Card */}
        <Card className="bg-slate-900/60 border-slate-800/80 backdrop-blur-sm shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Server className="h-4 w-4 text-blue-400" />
              API Service Runtime
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Django 5.0 + Django REST Framework + ASGI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-xs py-2 border-b border-slate-800/50">
              <span className="text-slate-400">Endpoint</span>
              <span className="font-mono text-slate-200">/api/v1/health/</span>
            </div>
            <div className="flex items-center justify-between text-xs py-2 border-b border-slate-800/50">
              <span className="text-slate-400">API Status</span>
              <span className="font-medium text-emerald-400">
                {isLoading ? "Checking..." : healthData?.status || (isError ? "Error" : "Standby")}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs py-2">
              <span className="text-slate-400">Timestamp</span>
              <span className="font-mono text-slate-400 text-[11px]">
                {healthData?.timestamp ? new Date(healthData.timestamp).toLocaleTimeString() : "--:--:--"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Database & Cache Card */}
        <Card className="bg-slate-900/60 border-slate-800/80 backdrop-blur-sm shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Database className="h-4 w-4 text-indigo-400" />
              Infrastructure Dependencies
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              PostgreSQL 16 Engine & Redis Cluster
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-xs py-2 border-b border-slate-800/50">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                PostgreSQL
              </span>
              <Badge variant="outline" className="font-mono text-[11px] border-slate-700 bg-slate-800/50">
                {healthData?.dependencies?.database || "Connecting..."}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs py-2 border-b border-slate-800/50">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                Redis Channel Layer
              </span>
              <Badge variant="outline" className="font-mono text-[11px] border-slate-700 bg-slate-800/50">
                {healthData?.dependencies?.redis || "Connecting..."}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs py-2">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Celery Worker Broker
              </span>
              <span className="text-xs text-slate-300">Redis DB 1</span>
            </div>
          </CardContent>
        </Card>

        {/* Development Pipeline Card */}
        <Card className="bg-slate-900/60 border-slate-800/80 backdrop-blur-sm shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-400" />
              Roadmap Progress
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Foundational Milestones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Prompt 1: Master SRS Analysis
              </span>
              <Badge variant="success" className="text-[10px] py-0">Done</Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Prompt 2: Technical Architecture
              </span>
              <Badge variant="success" className="text-[10px] py-0">Done</Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Prompt 3: Execution Plan
              </span>
              <Badge variant="success" className="text-[10px] py-0">Done</Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                Prompt 4: System Foundation
              </span>
              <Badge variant="default" className="text-[10px] py-0 bg-blue-600">Active</Badge>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Notice & Footer */}
      <footer className="max-w-6xl w-full mx-auto pt-6 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-slate-400" />
          <span>Foundation Scaffolding Complete. Ready for Prompt 5.</span>
        </div>
        <div>
          <span>Antigravity Engine &bull; Modular Monolith &bull; PostgreSQL &bull; React &bull; Vite &bull; Tailwind</span>
        </div>
      </footer>
    </div>
  );
};
