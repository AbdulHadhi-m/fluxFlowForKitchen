import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { forgotPasswordSchema, ForgotPasswordFormData } from "../schemas/auth.schemas";
import { useAuth } from "../hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, Loader2, Mail, ArrowLeft } from "lucide-react";

export const ForgotPasswordForm: React.FC = () => {
  const { forgotPassword, isSubmittingForgot } = useAuth();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await forgotPassword(data);
      setSuccessMessage(
        res.data?.message ||
          "If an account exists with this email, password reset instructions have been dispatched."
      );
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error?.message || "Failed to process request. Please try again."
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {successMessage && (
        <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
          Registered Email
        </label>
        <Input
          type="email"
          placeholder="name@restaurant.com"
          {...register("email")}
          disabled={isSubmittingForgot}
          className="bg-white dark:bg-slate-900/60 border-slate-300 dark:border-slate-800 focus-visible:ring-emerald-500 text-slate-900 dark:text-slate-100"
        />
        {errors.email && (
          <p className="text-xs text-rose-400">{errors.email.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmittingForgot}
        className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium py-2.5 shadow-lg shadow-emerald-600/25 transition-all"
      >
        {isSubmittingForgot ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Sending Instructions...
          </>
        ) : (
          "Send Reset Link"
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
    </form>
  );
};
