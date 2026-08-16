import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "../api/notifications.api";
import { useAuthStore } from "@/features/auth/store/authStore";

export const useNotifications = (isRead?: boolean, severity?: string, notificationType?: string) => {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const notificationsQuery = useQuery({
    queryKey: ["notifications", isRead, severity, notificationType],
    queryFn: () => notificationsApi.getNotifications(isRead, severity, notificationType),
    enabled: isAuthenticated,
  });

  const unreadCountQuery = useQuery({
    queryKey: ["notificationsUnreadCount"],
    queryFn: () => notificationsApi.getUnreadCount(),
    enabled: isAuthenticated,
    refetchInterval: 30000, // Poll every 30s as fallback if socket disconnected
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notificationsUnreadCount"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notificationsUnreadCount"] });
    },
  });

  return {
    notifications: notificationsQuery.data?.data || [],
    isLoadingNotifications: notificationsQuery.isLoading,
    unreadCount: unreadCountQuery.data?.data?.count || 0,
    markAsRead: markReadMutation.mutateAsync,
    isMarkingRead: markReadMutation.isPending,
    markAllAsRead: markAllReadMutation.mutateAsync,
    isMarkingAllRead: markAllReadMutation.isPending,
  };
};
