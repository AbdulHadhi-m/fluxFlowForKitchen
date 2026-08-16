import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { loyaltyApi } from "../api/loyalty.api";
import { LoyaltyProgram, MembershipTier, Reward } from "../types/loyalty.types";
import { useAuthStore } from "@/features/auth/store/authStore";

export const useLoyalty = (search?: string, tier?: string) => {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const programQuery = useQuery({
    queryKey: ["loyaltyProgram"],
    queryFn: () => loyaltyApi.getLoyaltyProgram(),
    enabled: isAuthenticated,
  });

  const accountsQuery = useQuery({
    queryKey: ["loyaltyAccounts", search, tier],
    queryFn: () => loyaltyApi.getLoyaltyAccounts({ search, tier }),
    enabled: isAuthenticated,
  });

  const tiersQuery = useQuery({
    queryKey: ["membershipTiers"],
    queryFn: () => loyaltyApi.getMembershipTiers(),
    enabled: isAuthenticated,
  });

  const rewardsQuery = useQuery({
    queryKey: ["loyaltyRewards"],
    queryFn: () => loyaltyApi.getRewards(),
    enabled: isAuthenticated,
  });

  const updateProgramMutation = useMutation({
    mutationFn: (payload: Partial<LoyaltyProgram>) => loyaltyApi.updateLoyaltyProgram(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyProgram"] });
    },
  });

  const adjustPointsMutation = useMutation({
    mutationFn: ({ accountId, pointsDelta, reason }: { accountId: string; pointsDelta: number; reason: string }) =>
      loyaltyApi.adjustPoints(accountId, pointsDelta, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyAccounts"] });
    },
  });

  const createTierMutation = useMutation({
    mutationFn: (payload: Partial<MembershipTier>) => loyaltyApi.createMembershipTier(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membershipTiers"] });
    },
  });

  const createRewardMutation = useMutation({
    mutationFn: (payload: Partial<Reward>) => loyaltyApi.createReward(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyRewards"] });
    },
  });

  return {
    program: programQuery.data?.data,
    isLoadingProgram: programQuery.isLoading,
    accounts: accountsQuery.data?.data || [],
    isLoadingAccounts: accountsQuery.isLoading,
    tiers: tiersQuery.data?.data || [],
    isLoadingTiers: tiersQuery.isLoading,
    rewards: rewardsQuery.data?.data || [],
    isLoadingRewards: rewardsQuery.isLoading,
    updateProgram: updateProgramMutation.mutateAsync,
    isUpdatingProgram: updateProgramMutation.isPending,
    adjustPoints: adjustPointsMutation.mutateAsync,
    isAdjustingPoints: adjustPointsMutation.isPending,
    createTier: createTierMutation.mutateAsync,
    isCreatingTier: createTierMutation.isPending,
    createReward: createRewardMutation.mutateAsync,
    isCreatingReward: createRewardMutation.isPending,
  };
};
