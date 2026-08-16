import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { staffCreateSchema, StaffCreateFormData } from "../schemas/staff.schemas";
import { useStaff } from "../hooks/useStaff";
import { useActiveRole } from "@/features/authorization/hooks/useActiveRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Loader2, AlertCircle, UserPlus, Shield } from "lucide-react";

interface StaffCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StaffCreateModal: React.FC<StaffCreateModalProps> = ({ isOpen, onClose }) => {
  const { createStaff, isCreating } = useStaff();
  const { availableRoles } = useActiveRole();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Exclude SAAS_OWNER from assignable employee roles
  const assignableRoles = availableRoles.filter((r) => r.code !== "SAAS_OWNER");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<StaffCreateFormData>({
    resolver: zodResolver(staffCreateSchema),
    defaultValues: {
      email: "",
      first_name: "",
      last_name: "",
      phone: "",
      primary_role: assignableRoles[0]?.code || "WAITER",
      secondary_roles: [],
      password: "",
      employee_id: "",
    },
  });

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

  const onSubmit = async (data: StaffCreateFormData) => {
    setErrorMessage(null);
    try {
      await createStaff(data);
      reset();
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error?.message || "Failed to create staff member."
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-400" />
            <h3 className="text-base font-semibold text-white">Add Staff Member</h3>
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
                placeholder="Mario"
                {...register("first_name")}
                className="bg-slate-950/60 border-slate-800 text-slate-100 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Last Name</label>
              <Input
                placeholder="Rossi"
                {...register("last_name")}
                className="bg-slate-950/60 border-slate-800 text-slate-100 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Email Address *</label>
              <Input
                type="email"
                placeholder="staff@restaurant.com"
                {...register("email")}
                className="bg-slate-950/60 border-slate-800 text-slate-100 text-xs"
              />
              {errors.email && <p className="text-rose-400 text-[11px]">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Phone Number</label>
              <Input
                placeholder="+1 555-0192"
                {...register("phone")}
                className="bg-slate-950/60 border-slate-800 text-slate-100 text-xs"
              />
            </div>
          </div>

          {/* Primary Role */}
          <div className="space-y-1.5 pt-1">
            <label className="text-slate-300 font-medium flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-blue-400" />
              Primary Role (Determines Default Dashboard) *
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
              Secondary Roles (Zero or More for Dynamic Switching)
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
            {errors.secondary_roles && (
              <p className="text-rose-400 text-[11px]">{errors.secondary_roles.message}</p>
            )}
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
              disabled={isCreating}
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5 shadow-md shadow-blue-600/20"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Provisioning...
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" /> Create Staff Account
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
