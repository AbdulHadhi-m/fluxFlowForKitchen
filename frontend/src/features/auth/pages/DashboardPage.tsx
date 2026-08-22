import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth, useSessions } from "../hooks/useAuth";
import { useActiveRole } from "@/features/authorization/hooks/useActiveRole";
import { Can } from "@/features/authorization/components/Can";
import { useReports } from "@/features/reports/hooks/useReports";
import { ModelDashboardAnalytics } from "@/features/reports/components/ModelDashboardAnalytics";
import { SaasOwnerDashboardPanel } from "@/features/authorization/components/SaasOwnerDashboardPanel";
import { SaasPlatformDashboardAnalytics } from "@/features/authorization/components/SaasPlatformDashboardAnalytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User as UserIcon,
  Shield,
  Smartphone,
  Monitor,
  Trash2,
  Clock,
  RotateCcw,
  Sparkles,
  Users,
  UtensilsCrossed,
  LayoutGrid,
  Store,
  History,
  ChefHat,
  Receipt,
  Boxes,
  Truck,
  BarChart3,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Zap,
} from "lucide-react";

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { sessions, terminateSession, terminateOtherSessions } = useSessions();
  const { activeRole, permissions } = useActiveRole();
  const [rbacOpen, setRbacOpen] = useState(false);

  const isSaasOwner = activeRole?.code === "SAAS_OWNER";
  const hasReportsPermission = permissions.includes("reports.view");
  const { dashboardData, salesData } = useReports("LAST_7_DAYS", "", "", hasReportsPermission);

  const sales = dashboardData?.sales;
  const inventory = dashboardData?.inventory;
  const procurement = dashboardData?.procurement;

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Welcome Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/30">
            <UserIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {greeting}, {user?.full_name || user?.email?.split("@")[0] || "there"}
              <Badge variant="success" className="text-[10px] py-0">
                {activeRole?.name || "Member"}
              </Badge>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              {" · "}
              {isSaasOwner
                ? "Fluxiflow Platform Administration & Multi-Tenant Control Hub."
                : "Here's what's happening across your restaurant today."}
            </p>
          </div>
        </div>
        <Can permission="orders.create">
          <Link to="/orders/pos">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 gap-2 shadow-md shadow-emerald-600/30">
              <Zap className="h-3.5 w-3.5" /> Open POS Terminal
            </Button>
          </Link>
        </Can>
      </header>

      {/* 1. Overview & Analytics (Top Section): SaaS Base Data for SaaS Owner, or Restaurant Sales for Staff */}
      {isSaasOwner ? (
        <SaasPlatformDashboardAnalytics />
      ) : (
        hasReportsPermission && (
          <ModelDashboardAnalytics
            salesSummary={sales}
            dailyTrends={salesData?.daily_trends || []}
            hourlyTrends={salesData?.hourly_trends || dashboardData?.hourly_trends || []}
            categories={salesData?.categories || dashboardData?.categories || []}
            payments={dashboardData?.payments || []}
            procurementSummary={procurement}
          />
        )
      )}

      {/* 2. SaaS Platform Owner Governance & Responsibilities Hub */}
      {isSaasOwner && <SaasOwnerDashboardPanel />}

      {/* Operational Health Alerts (Restaurant Staff only) */}
      {!isSaasOwner && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Can permission="inventory.view">
              <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-emerald-500" />
                    Inventory Stock Status
                  </CardTitle>
                  <Link to="/inventory">
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] text-emerald-500 hover:text-slate-900 dark:hover:text-white gap-1 px-1.5">
                      Manage <ArrowRight className="h-2.5 w-2.5" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="pt-1">
                  {(inventory?.low_stock || 0) > 0 || (inventory?.out_of_stock || 0) > 0 ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-2.5 rounded-xl text-xs">
                        <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium">
                          <AlertTriangle className="h-3.5 w-3.5" /> Low Stock Items
                        </span>
                        <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{inventory?.low_stock ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-2.5 rounded-xl text-xs">
                        <span className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-medium">
                          <AlertTriangle className="h-3.5 w-3.5" /> Out of Stock Items
                        </span>
                        <span className="font-mono font-bold text-rose-700 dark:text-rose-400">{inventory?.out_of_stock ?? 0}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-3 rounded-xl text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-2">
                      <Boxes className="h-3.5 w-3.5" /> Stock levels look healthy — no low or out-of-stock alerts.
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2.5">
                    {inventory?.total_items ?? 0} active items tracked · {inventory?.in_stock ?? 0} fully stocked
                  </p>
                </CardContent>
              </Card>
            </Can>

            <Can permission="procurement.view">
              <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Truck className="h-4 w-4 text-purple-500" />
                    Procurement Pipeline
                  </CardTitle>
                  <Link to="/procurement">
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] text-purple-500 hover:text-slate-900 dark:hover:text-white gap-1 px-1.5">
                      View <ArrowRight className="h-2.5 w-2.5" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="pt-1 space-y-2.5">
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 p-2.5 rounded-xl text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Open Purchase Orders</span>
                    <span className="font-mono font-bold text-purple-600 dark:text-purple-400">{procurement?.open_purchase_orders ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 p-2.5 rounded-xl text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Awaiting Approval</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{procurement?.pending_approval ?? 0}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {(procurement?.pending_approval ?? 0) > 0
                      ? "Some purchase orders need your review and sign-off."
                      : "No purchase orders awaiting approval."}
                  </p>
                </CardContent>
              </Card>
            </Can>
          </div>

          {/* Quick Actions */}
          <section className="space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Can permission="orders.create">
                <Link to="/orders/pos" className="group">
                  <div className="h-full flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-md hover:shadow-emerald-500/10 transition-all">
                    <div className="h-9 w-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                      <Store className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">POS Terminal</span>
                  </div>
                </Link>
              </Can>
              <Can permission="orders.create">
                <Link to="/billing" className="group">
                  <div className="h-full flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-md hover:shadow-emerald-500/10 transition-all">
                    <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                      <Receipt className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Billing</span>
                  </div>
                </Link>
              </Can>
              <Can permission="kitchen.view">
                <Link to="/kitchen" className="group">
                  <div className="h-full flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-md hover:shadow-amber-500/10 transition-all">
                    <div className="h-9 w-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                      <ChefHat className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Kitchen (KDS)</span>
                  </div>
                </Link>
              </Can>
              <Can permission="tables.view">
                <Link to="/tables" className="group">
                  <div className="h-full flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center hover:border-teal-400 dark:hover:border-teal-500 hover:shadow-md hover:shadow-teal-500/10 transition-all">
                    <div className="h-9 w-9 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-500 group-hover:scale-110 transition-transform">
                      <LayoutGrid className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Floor Plan</span>
                  </div>
                </Link>
              </Can>
              <Can permission="menu.view">
                <Link to="/menu" className="group">
                  <div className="h-full flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center hover:border-cyan-400 dark:hover:border-cyan-500 hover:shadow-md hover:shadow-cyan-500/10 transition-all">
                    <div className="h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 group-hover:scale-110 transition-transform">
                      <UtensilsCrossed className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Menu</span>
                  </div>
                </Link>
              </Can>
              <Can permission="orders.view">
                <Link to="/orders/history" className="group">
                  <div className="h-full flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-md transition-all">
                    <div className="h-9 w-9 rounded-lg bg-slate-500/10 border border-slate-500/20 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:scale-110 transition-transform">
                      <History className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Order History</span>
                  </div>
                </Link>
              </Can>
              <Can permission="customers.view">
                <Link to="/customers" className="group">
                  <div className="h-full flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-md hover:shadow-emerald-500/10 transition-all">
                    <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                      <Users className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Customers & CRM</span>
                  </div>
                </Link>
              </Can>
              <Can permission="inventory.view">
                <Link to="/inventory" className="group">
                  <div className="h-full flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-md hover:shadow-emerald-500/10 transition-all">
                    <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                      <Boxes className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Inventory</span>
                  </div>
                </Link>
              </Can>
              <Can permission="workflows.view">
                <Link to="/automation" className="group">
                  <div className="h-full flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center hover:border-fuchsia-400 dark:hover:border-fuchsia-500 hover:shadow-md hover:shadow-fuchsia-500/10 transition-all">
                    <div className="h-9 w-9 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-500 group-hover:scale-110 transition-transform">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Automation</span>
                  </div>
                </Link>
              </Can>
              <Can permission="reports.view">
                <Link to="/reports" className="group">
                  <div className="h-full flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md hover:shadow-purple-500/10 transition-all">
                    <div className="h-9 w-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Analytics</span>
                  </div>
                </Link>
              </Can>
            </div>
          </section>
        </>
      )}

      {/* Active Sessions Management */}
      <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Active Device Sessions
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Manage active logins across different POS terminals and kitchen tablets.
            </CardDescription>
          </div>
          {sessions.length > 1 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => terminateOtherSessions()}
              className="text-xs h-8 gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Terminate Other Sessions
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-2">No active sessions found.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {sessions.map((session) => (
                <div key={session.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      {session.device_info.includes("Mobile") ? (
                        <Smartphone className="h-4 w-4" />
                      ) : (
                        <Monitor className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-200 flex items-center gap-2">
                        {session.device_info}
                        {session.is_current && (
                          <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 py-0">
                            Current Device
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        IP: {session.ip_address || "Unknown"} · Last Active:{" "}
                        {new Date(session.last_activity).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  {!session.is_current && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => terminateSession(session.id)}
                      className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 h-7 text-xs"
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role & Permission Context (collapsible) */}
      <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 shadow-sm">
        <button
          onClick={() => setRbacOpen(!rbacOpen)}
          className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
          aria-expanded={rbacOpen}
        >
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-slate-900 dark:text-slate-200">Role & Permission Context</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-mono text-blue-600 dark:text-blue-400">
              {activeRole?.code || "MEMBER"}
            </Badge>
            <span className="text-slate-400">
              {rbacOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </span>
          </div>
        </button>
        {rbacOpen && (
          <CardContent className="pt-0 px-5 pb-5 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3">
                <div className="text-slate-500 dark:text-slate-400 mb-1">Active Role</div>
                <div className="font-semibold text-slate-900 dark:text-white">{activeRole?.name || "Standard Member"}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3">
                <div className="text-slate-500 dark:text-slate-400 mb-1">Role Slug</div>
                <div className="font-mono text-blue-600 dark:text-blue-400 font-medium">{activeRole?.code || "MEMBER"}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3">
                <div className="text-slate-500 dark:text-slate-400 mb-1">Effective Capabilities</div>
                <div className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">{permissions.length} permissions</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {permissions.map((perm) => (
                <Badge key={perm} variant="outline" className="text-[10px] border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                  {perm}
                </Badge>
              ))}
            </div>
            <div className="pt-1 flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <RotateCcw className="h-3 w-3" />
              Switch operational role from the header to change which capabilities the UI exposes.
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};
