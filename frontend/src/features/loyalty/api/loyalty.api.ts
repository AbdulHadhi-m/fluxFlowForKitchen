import { apiClient } from "@/lib/api-client";
import {
  LoyaltyProgram,
  MembershipTier,
  LoyaltyAccount,
  LoyaltyTransaction,
  Reward,
  GiftCard,
} from "../types/loyalty.types";

export const loyaltyApi = {
  async getLoyaltyProgram(): Promise<{ success: boolean; data: LoyaltyProgram }> {
    const response = await apiClient.get<{ success: boolean; data: LoyaltyProgram }>("/loyalty/program/");
    return response.data;
  },

  async updateLoyaltyProgram(payload: Partial<LoyaltyProgram>): Promise<{ success: boolean; data: LoyaltyProgram }> {
    const response = await apiClient.patch<{ success: boolean; data: LoyaltyProgram }>("/loyalty/program/", payload);
    return response.data;
  },

  async getLoyaltyAccounts(params?: { search?: string; tier?: string }): Promise<{ success: boolean; data: LoyaltyAccount[] }> {
    const response = await apiClient.get<{ success: boolean; data: LoyaltyAccount[] }>("/loyalty/accounts/", { params });
    return response.data;
  },

  async getLoyaltyAccountTransactions(accountId: string): Promise<{ success: boolean; data: LoyaltyTransaction[] }> {
    const response = await apiClient.get<{ success: boolean; data: LoyaltyTransaction[] }>(`/loyalty/accounts/${accountId}/transactions/`);
    return response.data;
  },

  async adjustPoints(accountId: string, pointsDelta: number, reason: string): Promise<{ success: boolean; data: LoyaltyTransaction }> {
    const response = await apiClient.post<{ success: boolean; data: LoyaltyTransaction }>(`/loyalty/accounts/${accountId}/adjust/`, {
      points_delta: pointsDelta,
      reason,
    });
    return response.data;
  },

  async getMembershipTiers(): Promise<{ success: boolean; data: MembershipTier[] }> {
    const response = await apiClient.get<{ success: boolean; data: MembershipTier[] }>("/loyalty/tiers/");
    return response.data;
  },

  async createMembershipTier(payload: Partial<MembershipTier>): Promise<{ success: boolean; data: MembershipTier }> {
    const response = await apiClient.post<{ success: boolean; data: MembershipTier }>("/loyalty/tiers/", payload);
    return response.data;
  },

  async getRewards(): Promise<{ success: boolean; data: Reward[] }> {
    const response = await apiClient.get<{ success: boolean; data: Reward[] }>("/loyalty/rewards/");
    return response.data;
  },

  async createReward(payload: Partial<Reward>): Promise<{ success: boolean; data: Reward }> {
    const response = await apiClient.post<{ success: boolean; data: Reward }>("/loyalty/rewards/", payload);
    return response.data;
  },

  async getGiftCards(): Promise<{ success: boolean; data: GiftCard[] }> {
    const response = await apiClient.get<{ success: boolean; data: GiftCard[] }>("/gift-cards/");
    return response.data;
  },

  async issueGiftCard(payload: { initial_balance: string; customer?: string; currency?: string }): Promise<{ success: boolean; data: GiftCard }> {
    const response = await apiClient.post<{ success: boolean; data: GiftCard }>("/gift-cards/", payload);
    return response.data;
  },

  async redeemGiftCard(cardNumber: string, amount: string): Promise<{ success: boolean; message: string; balance_after: string }> {
    const response = await apiClient.post<{ success: boolean; message: string; balance_after: string }>("/gift-cards/redeem/", {
      card_number: cardNumber,
      amount,
    });
    return response.data;
  },
};
