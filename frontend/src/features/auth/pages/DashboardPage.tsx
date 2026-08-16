import React from "react";
import { useAuth, useSessions } from "../hooks/useAuth";
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
  Lock,
  CheckCircle2,
  Clock,
} from "lucide-react";

export const DashboardPage: React.FC = () => {
  const { user, logout, isLoggingOut } = useAuth();
  const { sessions, terminateSession, terminateOtherSessions } = useSessions();

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
        </header>

        {/* User details & Security stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-400" />
                Account Identity & Status
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Current authenticated principal metadata
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">User ID</span>
                <span className="font-mono text-slate-300 text-[11px]">{user?.id}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Account Status</span>
                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="h-3 w-3" /> Active
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Staff Status</span>
                <span className="text-slate-300">{user?.is_staff ? "Yes" : "Standard User"}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Last Login</span>
                <span className="font-mono text-slate-400 text-[11px]">
                  {user?.last_login ? new Date(user.last_login).toLocaleString() : "First Session"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Lock className="h-4 w-4 text-indigo-400" />
                Prompt 6 Architecture Lock
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Authentication Foundation Complete
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-slate-300">
              <p className="text-slate-400 leading-relaxed">
                Authentication answers <span className="text-white font-medium">"Who you are"</span>.
                RBAC, restaurant tenancy binding, and active role switching will be integrated in
                <span className="text-blue-400 font-medium"> Prompt 7</span>.
              </p>
              <div className="pt-2 flex flex-wrap gap-2">
                <Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-400 text-[11px]">
                  JWT 15m Expiry
                </Badge>
                <Badge variant="outline" className="border-indigo-500/20 bg-indigo-500/10 text-indigo-400 text-[11px]">
                  HttpOnly Refresh
                </Badge>
                <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[11px]">
                  Session Rotation
                </Badge>
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
                Manage your active logins across different devices and browsers.
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
