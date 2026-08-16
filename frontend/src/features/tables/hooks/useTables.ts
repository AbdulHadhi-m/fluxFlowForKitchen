import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tableApi } from "../api/table.api";
import {
  TableCreatePayload,
  TableUpdatePayload,
  TableStatus,
} from "../types/table.types";
import { useAuthStore } from "@/features/auth/store/authStore";

export const useTables = (params?: {
  status?: string;
  section?: string;
  is_active?: boolean;
  search?: string;
  page?: number;
}) => {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Tables List Query
  const tablesQuery = useQuery({
    queryKey: ["restaurantTables", params],
    queryFn: () => tableApi.getTables(params),
    enabled: isAuthenticated,
  });

  // Create Table Mutation
  const createTableMutation = useMutation({
    mutationFn: (data: TableCreatePayload) => tableApi.createTable(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurantTables"] });
    },
  });

  // Update Table Mutation
  const updateTableMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TableUpdatePayload }) =>
      tableApi.updateTable(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurantTables"] });
    },
  });

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TableStatus }) =>
      tableApi.updateTableStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurantTables"] });
    },
  });

  // Delete/Deactivate Table Mutation
  const deleteTableMutation = useMutation({
    mutationFn: (id: string) => tableApi.deleteTable(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurantTables"] });
    },
  });

  return {
    tables: tablesQuery.data?.data || [],
    meta: tablesQuery.data?.meta,
    isLoading: tablesQuery.isLoading,
    isError: tablesQuery.isError,
    createTable: createTableMutation.mutateAsync,
    isCreating: createTableMutation.isPending,
    updateTable: updateTableMutation.mutateAsync,
    isUpdating: updateTableMutation.isPending,
    updateStatus: updateStatusMutation.mutateAsync,
    isUpdatingStatus: updateStatusMutation.isPending,
    deleteTable: deleteTableMutation.mutateAsync,
    isDeleting: deleteTableMutation.isPending,
  };
};
