import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { marketingApi } from "../api/marketing.api";
import { Promotion, Coupon, CustomerSegment, Campaign } from "../types/marketing.types";

export const MARKETING_QUERY_KEYS = {
  promotions: ["marketing", "promotions"] as const,
  promotion: (id: string) => ["marketing", "promotions", id] as const,
  coupons: ["marketing", "coupons"] as const,
  segments: ["marketing", "segments"] as const,
  segmentPreview: (id: string) => ["marketing", "segments", id, "preview"] as const,
  campaigns: ["marketing", "campaigns"] as const,
  analytics: ["marketing", "analytics"] as const,
  consents: ["marketing", "consents"] as const,
};

export const usePromotions = (params?: Record<string, any>) => {
  return useQuery({
    queryKey: [...MARKETING_QUERY_KEYS.promotions, params],
    queryFn: () => marketingApi.getPromotions(params),
  });
};

export const usePromotion = (id: string) => {
  return useQuery({
    queryKey: MARKETING_QUERY_KEYS.promotion(id),
    queryFn: () => marketingApi.getPromotion(id),
    enabled: Boolean(id),
  });
};

export const useCreatePromotion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Promotion>) => marketingApi.createPromotion(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MARKETING_QUERY_KEYS.promotions });
      queryClient.invalidateQueries({ queryKey: MARKETING_QUERY_KEYS.analytics });
    },
  });
};

export const useUpdatePromotion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Promotion> }) =>
      marketingApi.updatePromotion(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: MARKETING_QUERY_KEYS.promotions });
      queryClient.invalidateQueries({ queryKey: MARKETING_QUERY_KEYS.promotion(variables.id) });
      queryClient.invalidateQueries({ queryKey: MARKETING_QUERY_KEYS.analytics });
    },
  });
};

export const useDeletePromotion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => marketingApi.deletePromotion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MARKETING_QUERY_KEYS.promotions });
      queryClient.invalidateQueries({ queryKey: MARKETING_QUERY_KEYS.analytics });
    },
  });
};

export const useActivatePromotion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => marketingApi.activatePromotion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MARKETING_QUERY_KEYS.promotions });
      queryClient.invalidateQueries({ queryKey: MARKETING_QUERY_KEYS.analytics });
    },
  });
};

export const usePausePromotion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => marketingApi.pausePromotion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MARKETING_QUERY_KEYS.promotions });
      queryClient.invalidateQueries({ queryKey: MARKETING_QUERY_KEYS.analytics });
    },
  });
};

export const useCoupons = (params?: Record<string, any>) => {
  return useQuery({
    queryKey: [...MARKETING_QUERY_KEYS.coupons, params],
    queryFn: () => marketingApi.getCoupons(params),
  });
};

export const useCreateCoupon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Coupon>) => marketingApi.createCoupon(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MARKETING_QUERY_KEYS.coupons });
      queryClient.invalidateQueries({ queryKey: MARKETING_QUERY_KEYS.analytics });
    },
  });
};

export const useBulkGenerateCoupons = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      promotion_id: string;
      count: number;
      prefix?: string;
      usage_limit?: number | null;
      per_customer_limit?: number;
      valid_from?: string;
      valid_until?: string | null;
    }) => marketingApi.bulkGenerateCoupons(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MARKETING_QUERY_KEYS.coupons });
      queryClient.invalidateQueries({ queryKey: MARKETING_QUERY_KEYS.promotions });
    },
  });
};

export const useSegments = () => {
  return useQuery({
    queryKey: MARKETING_QUERY_KEYS.segments,
    queryFn: () => marketingApi.getSegments(),
  });
};

export const useCreateSegment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<CustomerSegment>) => marketingApi.createSegment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MARKETING_QUERY_KEYS.segments });
    },
  });
};

export const useCampaigns = () => {
  return useQuery({
    queryKey: MARKETING_QUERY_KEYS.campaigns,
    queryFn: () => marketingApi.getCampaigns(),
  });
};

export const useCreateCampaign = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Campaign>) => marketingApi.createCampaign(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MARKETING_QUERY_KEYS.campaigns });
    },
  });
};

export const useLaunchCampaign = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => marketingApi.launchCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MARKETING_QUERY_KEYS.campaigns });
    },
  });
};

export const useMarketingAnalytics = () => {
  return useQuery({
    queryKey: MARKETING_QUERY_KEYS.analytics,
    queryFn: () => marketingApi.getAnalytics(),
    refetchInterval: 30000,
  });
};

export const useMarketingConsents = (params?: Record<string, any>) => {
  return useQuery({
    queryKey: [...MARKETING_QUERY_KEYS.consents, params],
    queryFn: () => marketingApi.getConsents(params),
  });
};

export const useUpdateConsent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      customer_id: string;
      channel: string;
      status: string;
      source?: string;
      notes?: string;
    }) => marketingApi.updateConsent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MARKETING_QUERY_KEYS.consents });
    },
  });
};
