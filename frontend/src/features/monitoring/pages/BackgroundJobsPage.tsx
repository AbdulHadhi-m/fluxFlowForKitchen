import React from "react";
import { Clock, Cpu, Layers, AlertOctagon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useJobs } from "../hooks/useMonitoring";
import { MetricCard } from "../components/MetricCard";
import { HealthBadge, StatusBadge } from "../components/MonitoringBadges";

export const BackgroundJobsPage: React.FC = () => {
  const { data, isLoading } = useJobs();
  const jobs = data?.data;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Cpu className="h-4 w-4" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Background Jobs</h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Celery workers, queue depth, task outcomes, and stuck-job detection (auto-refreshes every 30s).
        </p>
      </div>

      {isLoading && <div className="text-xs text-slate-500">Loading job data…</div>}

      {jobs && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label="Workers"
              value={jobs.workers.workers}
              sub="Active worker processes"
              icon={<Layers className="h-3.5 w-3.5" />}
            />
            <MetricCard
              label="Queue Depth"
              value={jobs.queue.depth < 0 ? "—" : jobs.queue.depth}
              sub={`Oldest queued: ${jobs.queue.oldest_seconds}s`}
              tone={jobs.queue.depth > 100 ? "warn" : "default"}
            />
            <MetricCard
              label="Tasks (60m)"
              value={jobs.tasks.total}
              sub={`Failed: ${jobs.tasks.failed} (${jobs.tasks.failure_rate.toFixed(1)}%) · Retried: ${jobs.tasks.retried}`}
              tone={jobs.tasks.failure_rate > 5 ? "bad" : "default"}
            />
            <MetricCard
              label="Stuck Tasks"
              value={jobs.stuck.count}
              sub={`Threshold: ${jobs.stuck.threshold_minutes} min`}
              tone={jobs.stuck.count > 0 ? "bad" : "good"}
              icon={<AlertOctagon className="h-3.5 w-3.5" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-cyan-400" /> Recent Stuck / Running Tasks
                </h3>
              </div>
              {jobs.stuck.recent.length === 0 ? (
                <div className="text-xs text-slate-500">No stuck or suspicious tasks detected.</div>
              ) : (
                <div className="space-y-2">
                  {jobs.stuck.recent.map((task, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="text-xs text-slate-700 dark:text-slate-200 font-medium truncate">{task.task_name}</div>
                        <div className="text-[10px] text-slate-500">
                          started {new Date(task.started_at).toLocaleString()}
                        </div>
                      </div>
                      <StatusBadge status={task.status} />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 p-4">
              <div className="mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Broker & Worker Health</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-300">Worker availability</span>
                  <HealthBadge status={jobs.workers.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-300">Queue status</span>
                  <HealthBadge status={jobs.queue.status} />
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};