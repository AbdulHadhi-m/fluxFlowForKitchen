import React from "react";
import { StaffMember } from "../types/staff.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/features/authorization/components/Can";
import {
  UserCheck,
  UserX,
  Edit2,
  Shield,
  Phone,
  Mail,
  User,
} from "lucide-react";

interface StaffListTableProps {
  staffList: StaffMember[];
  onEdit: (staff: StaffMember) => void;
  onDisable: (staff: StaffMember) => void;
  onReactivate: (staff: StaffMember) => void;
}

export const StaffListTable: React.FC<StaffListTableProps> = ({
  staffList,
  onEdit,
  onDisable,
  onReactivate,
}) => {
  if (staffList.length === 0) {
    return (
      <div className="py-16 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
        <User className="h-10 w-10 text-slate-600 mx-auto mb-3" />
        <h3 className="text-sm font-medium text-slate-300">No staff members found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
          No employees match your current filter criteria or none have been provisioned yet.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
          <tr>
            <th className="py-3.5 px-4 font-semibold">Employee</th>
            <th className="py-3.5 px-4 font-semibold">Contact</th>
            <th className="py-3.5 px-4 font-semibold">Primary Role</th>
            <th className="py-3.5 px-4 font-semibold">Secondary Roles</th>
            <th className="py-3.5 px-4 font-semibold">Status</th>
            <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-normal">
          {staffList.map((staff) => {
            const isStaffActive = staff.status === "ACTIVE";
            return (
              <tr key={staff.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-semibold text-xs">
                      {staff.first_name?.[0] || staff.email[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-white flex items-center gap-1.5">
                        {staff.display_name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {staff.employee_id}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="py-3 px-4">
                  <div className="space-y-0.5 text-[11px]">
                    <div className="flex items-center gap-1 text-slate-300">
                      <Mail className="h-3 w-3 text-slate-500" />
                      {staff.email}
                    </div>
                    {staff.phone && (
                      <div className="flex items-center gap-1 text-slate-400">
                        <Phone className="h-3 w-3 text-slate-500" />
                        {staff.phone}
                      </div>
                    )}
                  </div>
                </td>

                <td className="py-3 px-4">
                  <Badge variant="outline" className="text-[10px] font-semibold border-blue-500/30 bg-blue-500/10 text-blue-300">
                    <Shield className="h-3 w-3 mr-1" />
                    {staff.primary_role.name}
                  </Badge>
                </td>

                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {staff.secondary_roles.length > 0 ? (
                      staff.secondary_roles.map((role) => (
                        <Badge
                          key={role.id}
                          variant="outline"
                          className="text-[10px] border-slate-800 bg-slate-900 text-slate-400 py-0"
                        >
                          {role.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-slate-600 text-[11px] italic">None</span>
                    )}
                  </div>
                </td>

                <td className="py-3 px-4">
                  {isStaffActive ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                      <UserCheck className="h-3.5 w-3.5" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400">
                      <UserX className="h-3.5 w-3.5" /> Disabled
                    </span>
                  )}
                </td>

                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Can permission="staff.update">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(staff)}
                        className="h-7 px-2 text-slate-300 hover:text-white hover:bg-slate-800 text-xs"
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                    </Can>

                    {isStaffActive ? (
                      <Can permission="staff.remove">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDisable(staff)}
                          className="h-7 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs"
                        >
                          <UserX className="h-3.5 w-3.5 mr-1" /> Disable
                        </Button>
                      </Can>
                    ) : (
                      <Can permission="staff.update">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onReactivate(staff)}
                          className="h-7 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 text-xs"
                        >
                          <UserCheck className="h-3.5 w-3.5 mr-1" /> Reactivate
                        </Button>
                      </Can>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
