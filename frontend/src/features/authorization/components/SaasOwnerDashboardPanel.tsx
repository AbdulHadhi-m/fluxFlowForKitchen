import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  CreditCard,
  HeartPulse,
  BarChart3,
  UserCheck,
  Flag,
  FileText,
  Wrench,
  AlertOctagon,
  CheckCircle2,
  Lock,
  ExternalLink,
  Eye,
  Server,
  ZapOff,
} from "lucide-react";

export const SaasOwnerDashboardPanel: React.FC = () => {
  const [impersonateModalOpen, setImpersonateModalOpen] = useState(false);
  const [featureFlagsModalOpen, setFeatureFlagsModalOpen] = useState(false);

  const responsibilities = [
    {
      icon: Building2,
      title: "View All Restaurants",
      description: "Inspect multi-tenant directory, tenant lifecycle states, and branch configurations.",
      link: "/settings",
      actionLabel: "View Tenants",
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      icon: CreditCard,
      title: "Monitor Subscriptions",
      description: "Track SaaS tier plans, tenant billing status, MRR analytics, and renewal quotas.",
      link: "/reports",
      actionLabel: "Billing Plans",
      color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    },
    {
      icon: HeartPulse,
      title: "Monitor System Health",
      description: "Real-time service health, PostgreSQL/Redis latencies, worker queues, and SLO tracking.",
      link: "/monitoring/health",
      actionLabel: "Health Check",
      color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    },
    {
      icon: BarChart3,
      title: "View Platform Analytics",
      description: "Aggregate multi-restaurant GMV, global order volume trends, and API traffic metrics.",
      link: "/reports",
      actionLabel: "Platform Stats",
      color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    },
    {
      icon: UserCheck,
      title: "Impersonate Restaurant Users",
      description: "Provide support in Read-Only Diagnostics mode with strict break-glass controls.",
      onClick: () => setImpersonateModalOpen(true),
      actionLabel: "Launch Support",
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    },
    {
      icon: Flag,
      title: "Enable Feature Flags",
      description: "Toggle beta modules, AI menu automation, and rollout flags across restaurant tenants.",
      onClick: () => setFeatureFlagsModalOpen(true),
      actionLabel: "Manage Flags",
      color: "text-teal-500 bg-teal-500/10 border-teal-500/20",
    },
    {
      icon: FileText,
      title: "View Audit Logs",
      description: "Immutable compliance trail of security events, privilege escalations, and auth audits.",
      link: "/audit-logs",
      actionLabel: "Security Audit",
      color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
    },
    {
      icon: Wrench,
      title: "Platform Maintenance",
      description: "Configure background workers, purge cache pools, and trigger maintenance windows.",
      link: "/monitoring",
      actionLabel: "Maintenance",
      color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
    },
  ];

  return (
    <div className="space-y-6">
      {/* SaaS Owner Responsibilities Grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Platform Responsibilities
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">8 Core Platform Workflows</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {responsibilities.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Card
                key={idx}
                className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 shadow-sm hover:border-emerald-400 dark:hover:border-emerald-500/50 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`h-8 w-8 rounded-lg border flex items-center justify-center ${item.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <Badge variant="outline" className="text-[10px] border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 py-0">
                      Platform
                    </Badge>
                  </div>
                  <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  {item.link ? (
                    <Link to={item.link}>
                      <Button variant="ghost" size="sm" className="w-full text-[11px] h-7 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 justify-between px-2">
                        {item.actionLabel}
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      onClick={item.onClick}
                      variant="ghost"
                      size="sm"
                      className="w-full text-[11px] h-7 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 justify-between px-2"
                    >
                      {item.actionLabel}
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* SaaS Owner Operational Restrictions (Segregation of Duties) Card */}
      <Card className="border-rose-200 dark:border-rose-900/40 bg-gradient-to-br from-rose-50/50 via-white to-amber-50/30 dark:from-rose-950/20 dark:via-slate-900 dark:to-amber-950/10 shadow-sm">
        <CardHeader className="pb-3 border-b border-rose-100 dark:border-rose-900/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <AlertOctagon className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  SaaS Owner Operational Restrictions & Compliance
                  <Badge variant="outline" className="text-[10px] text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-500/10">
                    Segregation of Duties (SoD)
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-slate-600 dark:text-slate-400">
                  Architectural boundaries enforcing tenant sovereignty, PCI-DSS compliance, and fraud protection.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-300 dark:border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              Guardrails Enforced
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="flex items-start gap-3 bg-white dark:bg-slate-950/60 border border-rose-100 dark:border-rose-900/20 p-3.5 rounded-xl">
              <div className="h-6 w-6 rounded-md bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                <ZapOff className="h-3.5 w-3.5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  ● Cannot participate in restaurant operations
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Cannot bump kitchen display tickets, change live table seating status, or manage staff shifts. SaaS Owner cannot be assigned to restaurant employee profiles.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white dark:bg-slate-950/60 border border-rose-100 dark:border-rose-900/20 p-3.5 rounded-xl">
              <div className="h-6 w-6 rounded-md bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="h-3.5 w-3.5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  ● Cannot create customer orders
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Orders must originate from verified restaurant staff or customer digital ordering channels. SaaS Owners are blocked from POS order creation and modification.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white dark:bg-slate-950/60 border border-rose-100 dark:border-rose-900/20 p-3.5 rounded-xl">
              <div className="h-6 w-6 rounded-md bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                <CreditCard className="h-3.5 w-3.5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  ● Cannot process payments
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Barred from processing customer credit card payments, bill splitting, manager discounts, payment refunds, and cash drawer session balancing.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white dark:bg-slate-950/60 border border-rose-100 dark:border-rose-900/20 p-3.5 rounded-xl">
              <div className="h-6 w-6 rounded-md bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                <Eye className="h-3.5 w-3.5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  ● Cannot modify operational data while impersonating
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Impersonation support operates in strict <strong>Read-Only Diagnostics Mode</strong>. Write mutations are denied unless an explicit, audited Break-Glass elevation is granted.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Impersonation Diagnostics Modal */}
      {impersonateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tenant User Impersonation</h3>
              </div>
              <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30">
                Read-Only Diagnostics
              </Badge>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              As a SaaS Owner, customer support impersonation starts in <strong>Read-Only Diagnostics Mode</strong>. You can inspect menus, table setups, and reports to diagnose issues. Modifying live operational data is disabled to safeguard restaurant integrity.
            </p>
            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span>Support Mode:</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">Read-Only Diagnostics</span>
              </div>
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span>Write Mutations:</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">Blocked (Break-Glass Required)</span>
              </div>
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span>Audit Logging:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Immutable Trace Enabled</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setImpersonateModalOpen(false)} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Feature Flags Modal */}
      {featureFlagsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-teal-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Platform Feature Flags</h3>
              </div>
              <Badge variant="outline" className="text-[10px] text-teal-600 dark:text-teal-400 border-teal-500/30">
                Active Governance
              </Badge>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Manage platform-wide and tenant-specific feature rollouts.
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">AI Recipe Food Costing</div>
                  <div className="text-[10px] text-slate-500">Automated yield & price forecasting</div>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                  Enabled
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">Multi-Location Stock Transfer</div>
                  <div className="text-[10px] text-slate-500">Inter-branch inventory logistics</div>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                  Enabled
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">Digital QR Customer Checkout</div>
                  <div className="text-[10px] text-slate-500">Contactless table self-pay</div>
                </div>
                <Badge variant="outline" className="text-slate-500 text-[10px]">
                  Beta (15% tenants)
                </Badge>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setFeatureFlagsModalOpen(false)} className="text-xs">
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
