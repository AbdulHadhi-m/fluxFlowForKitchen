import React from "react";
import { StaffMember } from "../types/staff.types";
import { useStaff } from "../hooks/useStaff";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";

interface StaffDisableDialogProps {
  staff: StaffMember | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StaffDisableDialog: React.FC<StaffDisableDialogProps> = ({
  staff,
  isOpen,
  onClose,
}) => {
  const { disableStaff, isDisabling } = useStaff();

  if (!isOpen || !staff) return null;

  const handleConfirm = async () => {
    try {
      await disableStaff(staff.id);
      onClose();
    } catch (err) {
      console.error("Failed to disable staff", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 text-slate-900 dark:text-slate-100 space-y-4">
        <div className="flex items-center gap-3 text-rose-400">
          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Disable Staff Member</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Security Access Revocation</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Are you sure you want to disable{" "}
          <span className="font-semibold text-slate-900 dark:text-white">{staff.display_name}</span> (
          <span className="font-mono text-slate-500 dark:text-slate-400">{staff.employee_id}</span>)?
        </p>

        <div className="p-3 rounded-lg bg-slate-100/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
          <p className="font-medium text-rose-600 dark:text-rose-300">&bull; Immediate Access Block</p>
          <p>
            All active POS and kitchen sessions for this user will be revoked immediately.
            Historical order and billing records will remain intact.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isDisabling}
            onClick={handleConfirm}
            size="sm"
            className="text-xs gap-1.5"
          >
            {isDisabling ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Disabling...
              </>
            ) : (
              "Confirm Deactivation"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
