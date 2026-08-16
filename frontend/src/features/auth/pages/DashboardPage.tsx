import React from "react";
import { Link } from "react-router-dom";
import { useAuth, useSessions } from "../hooks/useAuth";
import { useActiveRole } from "@/features/authorization/hooks/useActiveRole";
import { RoleSwitcher } from "@/features/authorization/components/RoleSwitcher";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { Can } from "@/features/authorization/components/Can";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  User as UserIcon,
  Shield,
  Smartphone,
  Monitor,
  Trash2,
  Clock,
  Utensils,
  RotateCcw,
  Sparkles,
  Building2,
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
} from "lucide-react";

export const DashboardPage: React.FC = () => {
  const { user, logout, isLoggingOut } = useAuth();
  const { sessions, terminateSession, terminateOtherSessions } = useSessions();
  const { activeRole, permissions } = useActiveRole();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 selection:bg-blue-500/30">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Top bar */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <UserIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                {user?.full_name || user?.email}
                <Badge variant="success" className="text-[10px] py-0">
                  Authenticated
                </Badge>
              </h1>
              <p className="text-xs text-slate-400 font-mono">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Real-time Notification Bell */}
            <NotificationBell />

            {/* Dynamic Active Role Switcher */}
            <RoleSwitcher />

            <Button
              variant="outline"
              size="sm"
              onClick={() => logout()}
              disabled={isLoggingOut}
              className="border-slate-800 hover:bg-slate-800 text-rose-300 hover:text-rose-200 gap-1.5 text-xs"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </header>

        {/* Operational Context & RBAC Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-400" />
                Active Operational Role
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Current active RBAC scope governing access to terminal actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Role Title</span>
                <span className="font-semibold text-white">{activeRole?.name || "Standard Member"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Role Slug</span>
                <span className="font-mono text-blue-400 text-[11px]">{activeRole?.code || "MEMBER"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Active Permissions Count</span>
                <span className="font-mono text-emerald-400 font-medium">{permissions.length} capabilities</span>
              </div>
              <div className="pt-2">
                <span className="text-slate-400 text-[11px] block mb-2 font-medium">Effective Permissions:</span>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {permissions.map((perm) => (
                    <Badge key={perm} variant="outline" className="text-[10px] border-slate-800 bg-slate-900 text-slate-300">
                      {perm}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Demonstration of <Can> permission gating */}
          <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                Permission-Aware UI Guards
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Live evaluation of UI capabilities based on active role
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-slate-300">
              <p className="text-slate-400 leading-relaxed">
                Actions below automatically enable/disable or hide when you switch roles:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <Can
                  permission="orders.create"
                  fallback={
                    <Button disabled variant="outline" size="sm" className="opacity-40 text-xs gap-1.5 justify-start">
                      <Utensils className="h-3.5 w-3.5" /> Create Order (Locked)
                    </Button>
                  }
                >
                  <Button variant="outline" size="sm" className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10 text-xs gap-1.5 justify-start">
                    <Utensils className="h-3.5 w-3.5 text-blue-400" /> Create Dine-in Order
                  </Button>
                </Can>

                <Can
                  permission="billing.refund"
                  fallback={
                    <Button disabled variant="outline" size="sm" className="opacity-40 text-xs gap-1.5 justify-start">
                      <RotateCcw className="h-3.5 w-3.5" /> Refund (Manager Only)
                    </Button>
                  }
                >
                  <Button variant="outline" size="sm" className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 text-xs gap-1.5 justify-start">
                    <RotateCcw className="h-3.5 w-3.5 text-emerald-400" /> Managerial Refund
                  </Button>
                </Can>

                <Can permission="settings.view">
                  <Link to="/restaurant/setup">
                    <Button variant="outline" size="sm" className="w-full border-blue-500/30 text-blue-300 hover:bg-blue-500/10 text-xs gap-1.5 justify-start">
                      <Building2 className="h-3.5 w-3.5 text-blue-400" /> Restaurant Settings & Setup
                    </Button>
                  </Link>
                </Can>

                <Can permission="staff.view">
                  <Link to="/staff">
                    <Button variant="outline" size="sm" className="w-full border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 text-xs gap-1.5 justify-start">
                      <Users className="h-3.5 w-3.5 text-indigo-400" /> Staff Roster & Roles
                    </Button>
                  </Link>
                </Can>

                <Can permission="menu.view">
                  <Link to="/menu">
                    <Button variant="outline" size="sm" className="w-full border-amber-500/30 text-amber-300 hover:bg-amber-500/10 text-xs gap-1.5 justify-start">
                      <UtensilsCrossed className="h-3.5 w-3.5 text-amber-400" /> Menu & Catalog Management
                    </Button>
                  </Link>
                </Can>

                <Can permission="tables.view">
                  <Link to="/tables">
                    <Button variant="outline" size="sm" className="w-full border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 text-xs gap-1.5 justify-start">
                      <LayoutGrid className="h-3.5 w-3.5 text-emerald-400" /> Floor Plan & Dining Tables
                    </Button>
                  </Link>
                </Can>

                <Can permission="orders.create">
                  <Link to="/orders/pos">
                    <Button variant="outline" size="sm" className="w-full border-blue-500/30 text-blue-300 hover:bg-blue-500/10 text-xs gap-1.5 justify-start">
                      <Store className="h-3.5 w-3.5 text-blue-400" /> Live POS Terminal
                    </Button>
                  </Link>
                </Can>

                <Can permission="orders.view">
                  <Link to="/orders/history">
                    <Button variant="outline" size="sm" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 text-xs gap-1.5 justify-start">
                      <History className="h-3.5 w-3.5 text-slate-400" /> Orders & Ticket Ledger
                    </Button>
                  </Link>
                </Can>

                <Can permission="kitchen.view">
                  <Link to="/kds">
                    <Button variant="outline" size="sm" className="w-full border-amber-500/30 text-amber-300 hover:bg-amber-500/10 text-xs gap-1.5 justify-start">
                      <ChefHat className="h-3.5 w-3.5 text-amber-400" /> Kitchen Display System (KDS)
                    </Button>
                  </Link>
                </Can>

                <Can permission="billing.view">
                  <Link to="/billing">
                    <Button variant="outline" size="sm" className="w-full border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 text-xs gap-1.5 justify-start">
                      <Receipt className="h-3.5 w-3.5 text-emerald-400" /> POS Billing & Register
                    </Button>
                  </Link>
                </Can>

                <Can permission="inventory.view">
                  <Link to="/inventory">
                    <Button variant="outline" size="sm" className="w-full border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 text-xs gap-1.5 justify-start">
                      <Boxes className="h-3.5 w-3.5 text-indigo-400" /> Inventory & Stock
                    </Button>
                  </Link>
                </Can>

                <Can permission="procurement.view">
                  <Link to="/procurement/orders">
                    <Button variant="outline" size="sm" className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10 text-xs gap-1.5 justify-start">
                      <Truck className="h-3.5 w-3.5 text-purple-400" /> Procurement & POs
                    </Button>
                  </Link>
                </Can>

                <Can permission="reports.view">
                  <Link to="/reports">
                    <Button variant="outline" size="sm" className="w-full border-amber-500/30 text-amber-300 hover:bg-amber-500/10 text-xs gap-1.5 justify-start">
                      <BarChart3 className="h-3.5 w-3.5 text-amber-400" /> Business Analytics & Reports
                    </Button>
                  </Link>
                </Can>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Sessions Management */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-400" />
                Active Device Sessions
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
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
            <div className="divide-y divide-slate-800/80">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="py-3 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                      {session.device_info.includes("Mobile") ? (
                        <Smartphone className="h-4 w-4" />
                      ) : (
                        <Monitor className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-slate-200 flex items-center gap-2">
                        {session.device_info}
                        {session.is_current && (
                          <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10 py-0">
                            Current Device
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono">
                        IP: {session.ip_address || "Unknown"} &bull; Last Active:{" "}
                        {new Date(session.last_activity).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  {!session.is_current && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => terminateSession(session.id)}
                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-7 text-xs"
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
