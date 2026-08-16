import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { loyaltyApi } from "../api/loyalty.api";
import { useAuthStore } from "@/features/auth/store/authStore";

export const useGiftCards = () => {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const cardsQuery = useQuery({
    queryKey: ["giftCards"],
    queryFn: () => loyaltyApi.getGiftCards(),
    enabled: isAuthenticated,
  });

  const issueCardMutation = useMutation({
    mutationFn: (payload: { initial_balance: string; customer?: string; currency?: string }) =>
      loyaltyApi.issueGiftCard(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["giftCards"] });
    },
  });

  const redeemCardMutation = useMutation({
    mutationFn: ({ cardNumber, amount }: { cardNumber: string; amount: string }) =>
      loyaltyApi.redeemGiftCard(cardNumber, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["giftCards"] });
    },
  });

  return {
    giftCards: cardsQuery.data?.data || [],
    isLoadingGiftCards: cardsQuery.isLoading,
    issueGiftCard: issueCardMutation.mutateAsync,
    isIssuingGiftCard: issueCardMutation.isPending,
    redeemGiftCard: redeemCardMutation.mutateAsync,
    isRedeemingGiftCard: redeemCardMutation.isPending,
  };
};
