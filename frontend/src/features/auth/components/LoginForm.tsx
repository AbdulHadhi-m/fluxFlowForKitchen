import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { loginSchema, LoginFormData } from "../schemas/auth.schemas";
import { useAuth } from "../hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Loader2, Lock, Mail } from "lucide-react";

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoggingIn } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);
    try {
      const res = await login(data);
      if (res.success) {
        navigate("/dashboard");
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        "Authentication failed. Please check your credentials.";
      setErrorMessage(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
          Email Address
        </label>
        <Input
          type="email"
          placeholder="name@restaurant.com"
          {...register("email")}
          disabled={isLoggingIn}
          className="bg-white dark:bg-slate-900/60 border-slate-300 dark:border-slate-800 focus-visible:ring-blue-500 text-slate-900 dark:text-slate-100"
        />
        {errors.email && (
          <p className="text-xs text-rose-400">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            Password
          </label>
          <Link
            to="/forgot-password"
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          type="password"
          placeholder="••••••••"
          {...register("password")}
          disabled={isLoggingIn}
          className="bg-white dark:bg-slate-900/60 border-slate-300 dark:border-slate-800 focus-visible:ring-blue-500 text-slate-900 dark:text-slate-100"
        />
        {errors.password && (
          <p className="text-xs text-rose-400">{errors.password.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isLoggingIn}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 shadow-lg shadow-blue-600/20 transition-all mt-2"
      >
        {isLoggingIn ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Signing in...
          </>
        ) : (
          "Sign In to Terminal"
        )}
      </Button>
    </form>
  );
};
