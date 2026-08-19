import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";
import { useAuthStore } from "../store/authStore";
import {
  LoginFormData,
  RegisterFormData,
  ForgotPasswordFormData,
  ResetPasswordFormData,
} from "../schemas/auth.schemas";

export const useAuth = () => {
  const queryClient = useQueryClient();
  const { user, accessToken, isAuthenticated, isInitialized, setAuth, clearAuth, setInitialized } =
    useAuthStore();

  // Initial App Session Bootstrap
  useEffect(() => {
    if (!isInitialized) {
      authApi
        .refresh()
        .then((res) => {
          if (res.success && res.data) {
            setAuth(res.data.user, res.data.access_token);
          } else {
            clearAuth();
          }
        })
        .catch(() => {
          clearAuth();
        })
        .finally(() => {
          setInitialized(true);
        });
    }
  }, [isInitialized, setAuth, clearAuth, setInitialized]);

  // Login Mutation
  const loginMutation = useMutation({
    mutationFn: (data: LoginFormData) => authApi.login(data),
    onSuccess: (res) => {
      if (res.success && res.data) {
        setAuth(res.data.user, res.data.access_token);
        queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      }
    },
  });

  // Register Mutation
  const registerMutation = useMutation({
    mutationFn: (data: RegisterFormData) => authApi.register(data),
    onSuccess: (res) => {
      if (res.success && res.data) {
        setAuth(res.data.user, res.data.access_token);
        queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      }
    },
  });

  // Logout Mutation
  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      clearAuth();
      queryClient.clear();
    },
  });

  // Forgot Password Mutation
  const forgotPasswordMutation = useMutation({
    mutationFn: (data: ForgotPasswordFormData) => authApi.forgotPassword(data),
  });

  // Reset Password Mutation
  const resetPasswordMutation = useMutation({
    mutationFn: ({ token, data }: { token: string; data: ResetPasswordFormData }) =>
      authApi.resetPassword(token, data),
  });

  return {
    user,
    accessToken,
    isAuthenticated,
    isInitialized,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    registerUser: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,
    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
    forgotPassword: forgotPasswordMutation.mutateAsync,
    isSubmittingForgot: forgotPasswordMutation.isPending,
    resetPassword: resetPasswordMutation.mutateAsync,
    isSubmittingReset: resetPasswordMutation.isPending,
  };
};

export const useSessions = () => {
  const queryClient = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: ["authSessions"],
    queryFn: () => authApi.getSessions().then((res) => res.data),
  });

  const terminateSessionMutation = useMutation({
    mutationFn: (sessionId: string) => authApi.terminateSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authSessions"] });
    },
  });

  const terminateOtherSessionsMutation = useMutation({
    mutationFn: () => authApi.terminateOtherSessions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authSessions"] });
    },
  });

  return {
    sessions: sessionsQuery.data || [],
    isLoading: sessionsQuery.isLoading,
    terminateSession: terminateSessionMutation.mutateAsync,
    terminateOtherSessions: terminateOtherSessionsMutation.mutateAsync,
  };
};
