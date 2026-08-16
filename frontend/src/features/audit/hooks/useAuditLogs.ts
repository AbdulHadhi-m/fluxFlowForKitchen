import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auditApi } from "../api/audit.api";
import { useAuthStore } from "@/features/auth/store/authStore";

export const useAuditLogs = (
  search?: string,
  action?: string,
  entityType?: string,
  preset?: string,
  startDate?: string,
  endDate?: string
) => {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const logsQuery = useQuery({
    queryKey: ["auditLogs", search, action, entityType, preset, startDate, endDate],
    queryFn: () => auditApi.getAuditLogs(search, action, entityType, preset, startDate, endDate),
    enabled: isAuthenticated,
  });

  const exportMutation = useMutation({
    mutationFn: () => auditApi.exportAuditLogs(),
    onSuccess: (blob) => {
      queryClient.invalidateQueries({ queryKey: ["auditLogs"] });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    },
  });

  return {
    auditLogs: logsQuery.data?.data || [],
    isLoadingLogs: logsQuery.isLoading,
    exportAuditLogs: exportMutation.mutateAsync,
    isExporting: exportMutation.isPending,
  };
};
