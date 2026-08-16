import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useStaff } from "../hooks/useStaff";
import { StaffMember } from "../types/staff.types";
import { StaffListTable } from "../components/StaffListTable";
import { StaffCreateModal } from "../components/StaffCreateModal";
import { StaffEditModal } from "../components/StaffEditModal";
import { StaffDisableDialog } from "../components/StaffDisableDialog";
import { Can } from "@/features/authorization/components/Can";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  Search,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";

export const StaffManagementPage: React.FC = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [disablingStaff, setDisablingStaff] = useState<StaffMember | null>(null);

  const { staffList, meta, isLoading, reactivateStaff } = useStaff({
    page,
    search: search || undefined,
    status: statusFilter || undefined,
    role: roleFilter || undefined,
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 selection:bg-blue-500/30">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 border-slate-800 hover:bg-slate-900 text-slate-300"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Staff Roster & Roles
                <Badge
                  variant="outline"
                  className="text-[10px] border-blue-500/30 text-blue-400 bg-blue-500/10 py-0"
                >
                  RBAC Scoped
                </Badge>
              </h1>
              <p className="text-xs text-slate-400">
                Manage restaurant staff accounts, primary operational roles, and secondary switching capabilities.
              </p>
            </div>
          </div>

          <Can permission="staff.create">
            <Button
              onClick={() => setIsCreateOpen(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5 shadow-lg shadow-blue-600/20"
            >
              <UserPlus className="h-4 w-4" /> Add Staff Member
            </Button>
          </Can>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800 backdrop-blur-sm">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search by name, email, or EMP-ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8 bg-slate-950/60 border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 h-8"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Filter className="h-3.5 w-3.5 text-slate-500" />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 rounded-lg border border-slate-800 bg-slate-950/60 px-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="DISABLED">Disabled</option>
            </select>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 rounded-lg border border-slate-800 bg-slate-950/60 px-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Primary Roles</option>
              <option value="RESTAURANT_ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="WAITER">Waiter</option>
              <option value="KITCHEN_STAFF">Kitchen</option>
              <option value="CASHIER">Cashier</option>
            </select>
          </div>
        </div>

        {/* Staff Table */}
        {isLoading ? (
          <div className="py-20 text-center text-slate-500 text-xs font-mono">
            Loading Staff Records...
          </div>
        ) : (
          <StaffListTable
            staffList={staffList}
            onEdit={(staff) => setEditingStaff(staff)}
            onDisable={(staff) => setDisablingStaff(staff)}
            onReactivate={async (staff) => {
              try {
                await reactivateStaff(staff.id);
              } catch (err) {
                console.error("Failed to reactivate staff", err);
              }
            }}
          />
        )}

        {/* Pagination Controls */}
        {meta && meta.total_pages > 1 && (
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
            <span>
              Showing {staffList.length} of {meta.count} employees
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="h-7 w-7 p-0 border-slate-800 text-slate-300"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="font-mono text-slate-300 px-2">
                Page {page} of {meta.total_pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.total_pages}
                onClick={() => setPage(page + 1)}
                className="h-7 w-7 p-0 border-slate-800 text-slate-300"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals & Dialogs */}
      <StaffCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      <StaffEditModal
        staff={editingStaff}
        isOpen={!!editingStaff}
        onClose={() => setEditingStaff(null)}
      />

      <StaffDisableDialog
        staff={disablingStaff}
        isOpen={!!disablingStaff}
        onClose={() => setDisablingStaff(null)}
      />
    </div>
  );
};
