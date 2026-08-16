import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { staffUpdateSchema, StaffUpdateFormData } from "../schemas/staff.schemas";
import { useStaff } from "../hooks/useStaff";
import { useActiveRole } from "@/features/authorization/hooks/useActiveRole";
import { StaffMember } from "../types/staff.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Loader2, AlertCircle, Edit, Shield } from "lucide-react";

interface StaffEditModalProps {
  staff: StaffMember | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StaffEditModal: React.FC<StaffEditModalProps> = ({ staff, isOpen, onClose }) => {
  const { updateStaff, isUpdating } = useStaff();
  const { availableRoles } = useActiveRole();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const assignableRoles = availableRoles.filter((r) => r.code !== "SAAS_OWNER");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
  } = useForm<StaffUpdateFormData>({
    resolver: zodResolver(staffUpdateSchema),
    defaultValues: {
      first_name: staff?.first_name || "",
      last_name: staff?.last_name || "",
      phone: staff?.phone || "",
      primary_role: staff?.primary_role.code || "WAITER",
      secondary_roles: staff?.secondary_roles.map((r) => r.code) || [],
      status: staff?.status || "ACTIVE",
    },
  });

  useEffect(() => {
    if (staff) {
      reset({
        first_name: staff.first_name,
        last_name: staff.last_name,
        phone: staff.phone,
        primary_role: staff.primary_role.code,
        secondary_roles: staff.secondary_roles.map((r) => r.code),
        status: staff.status,
      });
    }
  }, [staff, reset]);

  const selectedPrimary = watch("primary_role");
  const selectedSecondaries = watch("secondary_roles") || [];

  const handleToggleSecondary = (roleCode: string) => {
    if (selectedSecondaries.includes(roleCode)) {
      setValue(
        "secondary_roles",
        selectedSecondaries.filter((r) => r !== roleCode)
      );
    } else {
      setValue("secondary_roles", [...selectedSecondaries, roleCode]);
    }
  };

  const onSubmit = async (data: StaffUpdateFormData) => {
    if (!staff) return;
    setErrorMessage(null);
    try {
      await updateStaff({ id: staff.id, data });
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error?.message || "Failed to update staff member."
      );
    }
  };

  if (!isOpen || !staff) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-blue-400" />
            <h3 className="text-base font-semibold text-white">
              Edit Staff Member &bull; {staff.employee_id}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">First Name</label>
              <Input
                {...register("first_name")}
                className="bg-slate-950/60 border-slate-800 text-slate-100 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Last Name</label>
              <Input
                {...register("last_name")}
                className="bg-slate-950/60 border-slate-800 text-slate-100 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium">Phone Number</label>
            <Input
              {...register("phone")}
              className="bg-slate-950/60 border-slate-800 text-slate-100 text-xs"
            />
          </div>

          {/* Primary Role */}
          <div className="space-y-1.5 pt-1">
            <label className="text-slate-300 font-medium flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-blue-400" />
              Primary Role *
            </label>
            <select
              {...register("primary_role")}
              className="w-full h-9 rounded-md border border-slate-800 bg-slate-950/60 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {assignableRoles.map((role) => (
                <option key={role.id} value={role.code}>
                  {role.name} ({role.code})
                </option>
              ))}
            </select>
          </div>

          {/* Secondary Roles Multi-Select */}
          <div className="space-y-1.5 pt-1">
            <label className="text-slate-300 font-medium block">
              Secondary Roles
            </label>
            <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              {assignableRoles
                .filter((r) => r.code !== selectedPrimary)
                .map((role) => {
                  const isChecked = selectedSecondaries.includes(role.code);
                  return (
                    <label
                      key={role.id}
                      className="flex items-center gap-2 text-slate-300 cursor-pointer hover:text-white"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSecondary(role.code)}
                        className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                      />
                      <span className="text-xs">{role.name}</span>
                    </label>
                  );
                })}
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-slate-800 hover:bg-slate-800 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUpdating}
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5 shadow-md shadow-blue-600/20"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
