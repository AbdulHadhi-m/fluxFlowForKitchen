import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { registerSchema, RegisterFormData } from "../schemas/auth.schemas";
import { useAuth } from "../hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  Loader2,
  Lock,
  Mail,
  User,
  Building2,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";

export const RegisterForm: React.FC = () => {
  const navigate = useNavigate();
  const { registerUser, isRegistering } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      restaurantName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setErrorMessage(null);
    try {
      const res = await registerUser(data);
      if (res.success) {
        navigate("/dashboard");
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.email?.[0] ||
        "Registration failed. Please check the provided information.";
      setErrorMessage(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
          <span className="flex-1">{errorMessage}</span>
        </div>
      )}

      {/* Name Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-slate-400" />
            First Name
          </label>
          <Input
            type="text"
            placeholder="Gordon"
            {...register("firstName")}
            disabled={isRegistering}
            className="bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 text-slate-900 dark:text-slate-100 h-9.5 px-3 rounded-xl text-sm"
          />
          {errors.firstName && (
            <p className="text-[11px] text-rose-500 mt-0.5">{errors.firstName.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Last Name
          </label>
          <Input
            type="text"
            placeholder="Ramsey"
            {...register("lastName")}
            disabled={isRegistering}
            className="bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 text-slate-900 dark:text-slate-100 h-9.5 px-3 rounded-xl text-sm"
          />
          {errors.lastName && (
            <p className="text-[11px] text-rose-500 mt-0.5">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      {/* Restaurant / Kitchen Name */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 text-slate-400" />
          Kitchen / Restaurant Name
        </label>
        <Input
          type="text"
          placeholder="e.g. Hell's Kitchen Bistro"
          {...register("restaurantName")}
          disabled={isRegistering}
          className="bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 text-slate-900 dark:text-slate-100 h-9.5 px-3 rounded-xl text-sm"
        />
      </div>

      {/* Email Address */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5 text-slate-400" />
          Email Address
        </label>
        <Input
          type="email"
          placeholder="name@restaurant.com"
          {...register("email")}
          disabled={isRegistering}
          className="bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 text-slate-900 dark:text-slate-100 h-9.5 px-3 rounded-xl text-sm"
        />
        {errors.email && (
          <p className="text-[11px] text-rose-500 mt-0.5">{errors.email.message}</p>
        )}
      </div>

      {/* Passwords */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            Password
          </label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Min. 8 chars"
              {...register("password")}
              disabled={isRegistering}
              className="bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 text-slate-900 dark:text-slate-100 h-9.5 pl-3 pr-9 rounded-xl text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-[11px] text-rose-500 mt-0.5">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Confirm Password
          </label>
          <div className="relative">
            <Input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Repeat password"
              {...register("confirmPassword")}
              disabled={isRegistering}
              className="bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 text-slate-900 dark:text-slate-100 h-9.5 pl-3 pr-9 rounded-xl text-sm"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              tabIndex={-1}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-[11px] text-rose-500 mt-0.5">{errors.confirmPassword.message}</p>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isRegistering}
        className="w-full h-11 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] text-white font-semibold shadow-lg shadow-emerald-600/25 transition-all duration-200 rounded-xl mt-3 flex items-center justify-center gap-2 group"
      >
        {isRegistering ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Creating Restaurant Account...</span>
          </>
        ) : (
          <>
            <span>Create Account &amp; Access</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </>
        )}
      </Button>

      <div className="text-center pt-2 text-xs text-slate-500 dark:text-slate-400">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 hover:underline transition-colors"
        >
          Sign In
        </Link>
      </div>
    </form>
  );
};
