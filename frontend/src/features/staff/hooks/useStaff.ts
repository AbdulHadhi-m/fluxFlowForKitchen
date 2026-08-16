import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffApi } from "../api/staff.api";
import { StaffCreatePayload, StaffUpdatePayload } from "../types/staff.types";
import { useAuthStore } from "@/features/auth/store/authStore";

export const useStaff = (params?: { page?: number; status?: string; role?: string; search?: string }) => {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Staff List Query
  const staffListQuery = useQuery({
    queryKey: ["staffList", params],
    queryFn: () => staffApi.getStaffList(params),
    enabled: isAuthenticated,
  });

  // Create Staff Mutation
  const createStaffMutation = useMutation({
    mutationFn: (data: StaffCreatePayload) => staffApi.createStaff(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staffList"] });
    },
  });

  // Update Staff Mutation
  const updateStaffMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: StaffUpdatePayload }) =>
      staffApi.updateStaff(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staffList"] });
    },
  });

  // Disable Staff Mutation
  const disableStaffMutation = useMutation({
    mutationFn: (id: string) => staffApi.disableStaff(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staffList"] });
    },
  });

  // Reactivate Staff Mutation
  const reactivateStaffMutation = useMutation({
    mutationFn: (id: string) => staffApi.reactivateStaff(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staffList"] });
    },
  });

  return {
    staffList: staffListQuery.data?.data || [],
    meta: staffListQuery.data?.meta,
    isLoading: staffListQuery.isLoading,
    isError: staffListQuery.isError,
    createStaff: createStaffMutation.mutateAsync,
    isCreating: createStaffMutation.isPending,
    updateStaff: updateStaffMutation.mutateAsync,
    isUpdating: updateStaffMutation.isPending,
    disableStaff: disableStaffMutation.mutateAsync,
    isDisabling: disableStaffMutation.isPending,
    reactivateStaff: reactivateStaffMutation.mutateAsync,
    isReactivating: reactivateStaffMutation.isPending,
  };
};
