import React, { useEffect, useState, useMemo } from "react";
import { rbacApi } from "../api/rbac.api";
import { Role, Permission, TenantMembership } from "../types/rbac.types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Shield,
  Key,
  Users,
  Plus,
  Trash2,
  Edit,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Lock,
  Check,
  X,
} from "lucide-react";

export const AccessControlPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [memberships, setMemberships] = useState<TenantMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedRolePerms, setSelectedRolePerms] = useState<Set<string>>(new Set());
  const [isSavingPerms, setIsSavingPerms] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [activeTab, setActiveTab] = useState<"MATRIX" | "STAFF" | "DICTIONARY">("MATRIX");

  // Notification Banner
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Create Role Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleCode, setNewRoleCode] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [isCreatingRole, setIsCreatingRole] = useState(false);

  // Edit Staff Roles Modal
  const [selectedMembership, setSelectedMembership] = useState<TenantMembership | null>(null);
  const [assignedRoleIds, setAssignedRoleIds] = useState<string[]>([]);
  const [activeRoleId, setActiveRoleId] = useState<string>("");
  const [isSavingMembership, setIsSavingMembership] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [rolesRes, permsRes, memsRes] = await Promise.all([
        rbacApi.getRoles(),
        rbacApi.getPermissions(),
        rbacApi.getMemberships(),
      ]);

      if (rolesRes.success) {
        setRoles(rolesRes.data);
        if (rolesRes.data.length > 0 && !selectedRoleId) {
          const firstRole = rolesRes.data[0];
          setSelectedRoleId(firstRole.id);
          const permCodes = new Set((firstRole.permissions || []).map((p) => p.code || p.id));
          setSelectedRolePerms(permCodes);
        }
      }
      if (permsRes.success) {
        setPermissions(permsRes.data);
      }
      if (memsRes.success) {
        setMemberships(memsRes.data);
      }
    } catch (err) {
      console.error("Failed to load RBAC data", err);
      showNotice("Failed to load RBAC data from server", "error");
    } finally {
      setLoading(false);
    }
  };

  const showNotice = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  // When a role is selected from the list
  const handleSelectRole = (role: Role) => {
    setSelectedRoleId(role.id);
    const permCodes = new Set((role.permissions || []).map((p) => p.code || p.id));
    setSelectedRolePerms(permCodes);
  };

  // Toggle permission for currently selected role
  const handleTogglePermission = (permCode: string) => {
    setSelectedRolePerms((prev) => {
      const next = new Set(prev);
      if (next.has(permCode)) {
        next.delete(permCode);
      } else {
        next.add(permCode);
      }
      return next;
    });
  };

  // Save modified permissions for selected role
  const handleSavePermissions = async () => {
    if (!selectedRoleId) return;
    try {
      setIsSavingPerms(true);
      const res = await rbacApi.updateRole(selectedRoleId, {
        permission_ids: Array.from(selectedRolePerms),
      });
      if (res.success) {
        showNotice(`Permissions updated successfully for ${res.data.name}.`, "success");
        // Refresh roles list
        const rolesRes = await rbacApi.getRoles();
        if (rolesRes.success) {
          setRoles(rolesRes.data);
        }
      }
    } catch (err: any) {
      showNotice(err.response?.data?.error?.message || "Failed to update role permissions", "error");
    } finally {
      setIsSavingPerms(false);
    }
  };

  // Create new custom role
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    try {
      setIsCreatingRole(true);
      const res = await rbacApi.createRole({
        name: newRoleName.trim(),
        code: newRoleCode.trim(),
        description: newRoleDesc.trim(),
        permission_ids: Array.from(selectedRolePerms),
      });
      if (res.success) {
        showNotice(`Custom role "${res.data.name}" created successfully.`, "success");
        setShowCreateModal(false);
        setNewRoleName("");
        setNewRoleCode("");
        setNewRoleDesc("");
        loadAllData();
      }
    } catch (err: any) {
      showNotice(err.response?.data?.error?.message || "Failed to create role", "error");
    } finally {
      setIsCreatingRole(false);
    }
  };

  // Delete custom role
  const handleDeleteRole = async (role: Role) => {
    if (role.is_system) {
      showNotice("System roles cannot be deleted.", "error");
      return;
    }
    if (!confirm(`Are you sure you want to delete custom role "${role.name}"?`)) return;
    try {
      const res = await rbacApi.deleteRole(role.id);
      if (res.success) {
        showNotice(`Role ${role.name} deleted.`, "success");
        loadAllData();
      }
    } catch (err: any) {
      showNotice(err.response?.data?.error?.message || "Failed to delete role", "error");
    }
  };

  // Sync System RBAC
  const handleSeedRBAC = async () => {
    try {
      setLoading(true);
      const res = await rbacApi.seedRBAC();
      if (res.success) {
        showNotice(res.message, "success");
        loadAllData();
      }
    } catch (err: any) {
      showNotice("Failed to sync system RBAC", "error");
    } finally {
      setLoading(false);
    }
  };

  // Open Edit Staff Membership Modal
  const handleOpenEditStaff = (mem: TenantMembership) => {
    setSelectedMembership(mem);
    setAssignedRoleIds(mem.assigned_roles.map((r) => r.id));
    setActiveRoleId(mem.active_role?.id || (mem.assigned_roles[0]?.id ?? ""));
  };

  // Save Staff Membership Roles
  const handleSaveMembershipRoles = async () => {
    if (!selectedMembership) return;
    if (assignedRoleIds.length === 0) {
      showNotice("Staff member must have at least one assigned role.", "error");
      return;
    }
    try {
      setIsSavingMembership(true);
      const res = await rbacApi.assignMembershipRoles(selectedMembership.id, {
        assigned_role_ids: assignedRoleIds,
        active_role_id: activeRoleId || undefined,
      });
      if (res.success) {
        showNotice(`Roles updated for ${selectedMembership.user.full_name || selectedMembership.user.email}.`, "success");
        setSelectedMembership(null);
        const memsRes = await rbacApi.getMemberships();
        if (memsRes.success) {
          setMemberships(memsRes.data);
        }
      }
    } catch (err: any) {
      showNotice(err.response?.data?.error?.message || "Failed to update staff roles", "error");
    } finally {
      setIsSavingMembership(false);
    }
  };

  // Group permissions by resource domain
  const groupedPermissions = useMemo(() => {
    const groups: { [domain: string]: Permission[] } = {};
    permissions.forEach((p) => {
      const domain = p.resource || "general";
      if (!groups[domain]) groups[domain] = [];
      groups[domain].push(p);
    });
    return groups;
  }, [permissions]);

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/25">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <span>Enterprise Access Control</span>
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] uppercase font-bold">
                  Dynamic RBAC
                </Badge>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                SuperAdmin policy manager: configure granular resource permissions, custom workstation roles, and staff role bindings.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeedRBAC}
            disabled={loading}
            className="text-xs font-semibold h-9 rounded-xl border-slate-200 dark:border-slate-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Sync RBAC Defaults
          </Button>

          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold h-9 rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Create Custom Role
          </Button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center justify-between gap-3 shadow-md animate-in slide-in-from-top-2 duration-200 ${
            notification.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/50 border border-rose-500/40 text-rose-800 dark:text-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
            )}
            <span className="font-semibold">{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800/80 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Configured Roles</span>
            <Shield className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{roles.length}</div>
          <div className="text-[10px] text-slate-400">
            {roles.filter((r) => r.is_system).length} System &bull; {roles.filter((r) => !r.is_system).length} Custom
          </div>
        </Card>

        <Card className="bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800/80 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Granular Permissions</span>
            <Key className="h-4 w-4 text-teal-500" />
          </div>
          <div className="text-2xl font-black text-teal-600 dark:text-teal-400">{permissions.length}</div>
          <div className="text-[10px] text-slate-400">{Object.keys(groupedPermissions).length} Resource Domains</div>
        </Card>

        <Card className="bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800/80 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Active Staff Profiles</span>
            <Users className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{memberships.length}</div>
          <div className="text-[10px] text-slate-400">Multi-Role Enabled</div>
        </Card>

        <Card className="bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800/80 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Security Engine</span>
            <Lock className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">Zero-Trust</div>
          <div className="text-[10px] text-slate-400">Tenant-Isolated RBAC</div>
        </Card>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("MATRIX")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "MATRIX"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
          }`}
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>Role &amp; Permissions Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab("STAFF")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "STAFF"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Staff User Role Bindings ({memberships.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("DICTIONARY")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "DICTIONARY"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
          }`}
        >
          <Key className="h-3.5 w-3.5" />
          <span>Permissions Catalog ({permissions.length})</span>
        </button>
      </div>

      {/* TAB 1: Role & Permissions Matrix */}
      {activeTab === "MATRIX" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Role Selector */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Platform Roles</span>
              <span className="text-[11px] text-slate-400">{roles.length} available</span>
            </div>

            <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
              {roles.map((role) => {
                const isSelected = role.id === selectedRoleId;
                return (
                  <div
                    key={role.id}
                    onClick={() => handleSelectRole(role)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? "bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/30"
                        : "bg-white/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{role.name}</span>
                        {role.is_system && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 border-slate-300 dark:border-slate-700 text-slate-500"
                          >
                            System
                          </Badge>
                        )}
                        {!role.is_system && (
                          <Badge className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30 text-[9px] px-1.5 py-0">
                            Custom
                          </Badge>
                        )}
                      </div>

                      {!role.is_system && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRole(role);
                          }}
                          className="p-1 text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 rounded-md transition-colors"
                          title="Delete Custom Role"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {role.description || "No description provided."}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                      <span className="font-mono">{role.code}</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {role.permissions?.length || 0} permissions
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Dynamic Permissions Checklist */}
          <div className="lg:col-span-8 space-y-4">
            {selectedRole ? (
              <Card className="bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800/80 p-5 space-y-5 shadow-xl shadow-emerald-950/5">
                {/* Selected Role Header & Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">{selectedRole.name}</h2>
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                        {selectedRole.code}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {selectedRole.description || "Configure granted capabilities for this role."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">
                      {selectedRolePerms.size} / {permissions.length} Granted
                    </span>
                    <Button
                      onClick={handleSavePermissions}
                      disabled={isSavingPerms}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 h-9 rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                    >
                      {isSavingPerms ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Apply Permissions</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Filter Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search permission code or description (e.g. orders.create, kitchen.bump)..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="pl-9 h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800"
                  />
                </div>

                {/* Domain Grouped Permissions */}
                <div className="space-y-5 max-h-[600px] overflow-y-auto pr-2">
                  {Object.entries(groupedPermissions).map(([domain, domainPerms]) => {
                    const filtered = domainPerms.filter(
                      (p) =>
                        p.code.toLowerCase().includes(searchFilter.toLowerCase()) ||
                        p.description.toLowerCase().includes(searchFilter.toLowerCase())
                    );
                    if (filtered.length === 0) return null;

                    const allDomainSelected = filtered.every((p) => selectedRolePerms.has(p.code));

                    return (
                      <div
                        key={domain}
                        className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 p-4 space-y-3"
                      >
                        {/* Domain Header */}
                        <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                              {domain}
                            </span>
                            <span className="text-[11px] text-slate-400">({filtered.length} capabilities)</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRolePerms((prev) => {
                                const next = new Set(prev);
                                if (allDomainSelected) {
                                  filtered.forEach((p) => next.delete(p.code));
                                } else {
                                  filtered.forEach((p) => next.add(p.code));
                                }
                                return next;
                              });
                            }}
                            className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                          >
                            {allDomainSelected ? "Deselect All" : "Select All"}
                          </button>
                        </div>

                        {/* Permissions Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {filtered.map((perm) => {
                            const isChecked = selectedRolePerms.has(perm.code);
                            return (
                              <label
                                key={perm.id || perm.code}
                                onClick={() => handleTogglePermission(perm.code)}
                                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 select-none ${
                                  isChecked
                                    ? "bg-emerald-500/10 dark:bg-emerald-950/30 border-emerald-500/40 text-slate-900 dark:text-white"
                                    : "bg-white dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800/60 text-slate-500 hover:border-slate-300 dark:hover:border-slate-700"
                                }`}
                              >
                                <div
                                  className={`h-4 w-4 rounded-md mt-0.5 flex items-center justify-center transition-colors shrink-0 ${
                                    isChecked
                                      ? "bg-emerald-600 text-white"
                                      : "border border-slate-300 dark:border-slate-700"
                                  }`}
                                >
                                  {isChecked && <Check className="h-3 w-3" />}
                                </div>
                                <div className="space-y-0.5 flex-1 min-w-0">
                                  <div className="text-xs font-mono font-bold truncate">{perm.code}</div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                                    {perm.description || `${perm.action} action on ${perm.resource}`}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ) : (
              <div className="text-center py-20 text-slate-400 text-xs">
                Select a role from the left column to configure its permissions.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Staff User Role Bindings */}
      {activeTab === "STAFF" && (
        <Card className="bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800/80 p-5 space-y-4 shadow-xl shadow-emerald-950/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Tenant Staff Authorization Roster</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Assign single or multiple workstation roles and define the active primary role for staff members.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400">{memberships.length} Active Members</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Staff Member</th>
                  <th className="py-2.5 px-3">Email Address</th>
                  <th className="py-2.5 px-3">Current Active Role</th>
                  <th className="py-2.5 px-3">Assigned Secondary Roles</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {memberships.map((mem) => (
                  <tr key={mem.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {mem.user.full_name || `${mem.user.first_name} ${mem.user.last_name}`.trim() || "Staff Member"}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400">{mem.user.email}</td>
                    <td className="py-3 px-3">
                      {mem.active_role ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                          {mem.active_role.name}
                        </Badge>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {mem.assigned_roles.map((r) => (
                          <Badge
                            key={r.id}
                            variant="outline"
                            className="text-[9px] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                          >
                            {r.name}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditStaff(mem)}
                        className="text-xs h-7 px-3 rounded-lg border-slate-200 dark:border-slate-800 hover:border-emerald-500"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Modify Roles
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: Permissions Catalog */}
      {activeTab === "DICTIONARY" && (
        <Card className="bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800/80 p-5 space-y-4 shadow-xl shadow-emerald-950/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Granular Permissions Catalog</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Comprehensive dictionary of platform permission codes used in backend decorators and frontend guards.
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Filter permissions..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-9 h-8 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {permissions
              .filter(
                (p) =>
                  p.code.toLowerCase().includes(searchFilter.toLowerCase()) ||
                  p.description.toLowerCase().includes(searchFilter.toLowerCase())
              )
              .map((perm) => (
                <div
                  key={perm.id || perm.code}
                  className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950/50 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {perm.code}
                    </span>
                    <Badge variant="outline" className="text-[9px] uppercase font-semibold">
                      {perm.resource}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{perm.description}</p>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Modal: Create Custom Role */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-emerald-500" />
                Create Custom Dynamic Role
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Role Title *</label>
                <Input
                  placeholder="e.g. Sommelier / Beverage Lead"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  required
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Programmatic Code (Optional)
                </label>
                <Input
                  placeholder="e.g. SOMMELIER"
                  value={newRoleCode}
                  onChange={(e) => setNewRoleCode(e.target.value)}
                  className="h-9 text-xs rounded-xl font-mono uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Description</label>
                <Input
                  placeholder="Responsibilities & scope of this role..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreateModal(false)}
                  className="text-xs h-9 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreatingRole}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-md"
                >
                  {isCreatingRole ? "Creating Role..." : "Create Role"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Modify Staff Member Roles */}
      {selectedMembership && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Modify Staff Role Bindings</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedMembership.user.email}</p>
              </div>
              <button onClick={() => setSelectedMembership(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Assigned Roles Checkboxes */}
              <div className="space-y-2">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Assigned Roles (Staff can switch between these):
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                  {roles.map((role) => {
                    const isChecked = assignedRoleIds.includes(role.id);
                    return (
                      <label
                        key={role.id}
                        onClick={() => {
                          setAssignedRoleIds((prev) => {
                            if (prev.includes(role.id)) {
                              return prev.filter((id) => id !== role.id);
                            } else {
                              return [...prev, role.id];
                            }
                          });
                        }}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2 select-none ${
                          isChecked
                            ? "bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500/40 font-bold text-slate-900 dark:text-white"
                            : "bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-500"
                        }`}
                      >
                        <div
                          className={`h-3.5 w-3.5 rounded flex items-center justify-center ${
                            isChecked ? "bg-emerald-600 text-white" : "border border-slate-300 dark:border-slate-700"
                          }`}
                        >
                          {isChecked && <Check className="h-2.5 w-2.5" />}
                        </div>
                        <span className="truncate">{role.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Primary Active Role Selector */}
              <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Primary Active Role:
                </label>
                <select
                  value={activeRoleId}
                  onChange={(e) => setActiveRoleId(e.target.value)}
                  className="w-full h-9 rounded-xl px-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100"
                >
                  {roles
                    .filter((r) => assignedRoleIds.includes(r.id))
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedMembership(null)}
                  className="text-xs h-9 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveMembershipRoles}
                  disabled={isSavingMembership}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-md"
                >
                  {isSavingMembership ? "Saving Bindings..." : "Save Role Bindings"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
