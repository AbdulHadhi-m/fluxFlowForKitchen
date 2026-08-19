import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPasswordSchema, ResetPasswordFormData } from "../schemas/auth.schemas";
import { useAuth } from "../hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, Loader2, Lock, ArrowLeft } from "lucide-react";

export const ResetPasswordForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const { resetPassword, isSubmittingReset } = useAuth();
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setErrorMessage("Missing or invalid password reset token in URL.");
      return;
    }

    setErrorMessage(null);
    try {
      await resetPassword({ token, data });
      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error?.message ||
          "Failed to reset password. The link may be expired or already used."
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {success ? (
        <div className="p-4 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs space-y-2">
          <div className="flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Password Reset Successful!
          </div>
          <p className="text-slate-500 dark:text-slate-400">
            Your password has been updated. Redirecting to login in a moment...
          </p>
          <div className="pt-2">
            <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
              Click here to sign in immediately &rarr;
            </Link>
          </div>
        </div>
      ) : (
        <>
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              New Password
            </label>
            <Input
              type="password"
              placeholder="At least 8 characters"
              {...register("password")}
              disabled={isSubmittingReset}
              className="bg-white dark:bg-slate-900/60 border-slate-300 dark:border-slate-800 focus-visible:ring-blue-500 text-slate-900 dark:text-slate-100"
            />
            {errors.password && (
              <p className="text-xs text-rose-400">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              Confirm New Password
            </label>
            <Input
              type="password"
              placeholder="Repeat password"
              {...register("confirmPassword")}
              disabled={isSubmittingReset}
              className="bg-white dark:bg-slate-900/60 border-slate-300 dark:border-slate-800 focus-visible:ring-blue-500 text-slate-900 dark:text-slate-100"
            />
            {errors.confirmPassword && (
              <p className="text-xs text-rose-400">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmittingReset}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 shadow-lg shadow-blue-600/20"
          >
            {isSubmittingReset ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Updating Password...
              </>
            ) : (
              "Set New Password"
            )}
          </Button>

          <div className="text-center pt-2">
            <Link
              to="/login"
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Login
            </Link>
          </div>
        </>
      )}
    </form>
  );
};
