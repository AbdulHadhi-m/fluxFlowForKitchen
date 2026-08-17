import { apiClient } from "@/lib/api-client";
import {
  Promotion,
  Coupon,
  CustomerSegment,
  Campaign,
  MarketingConsent,
  PromotionEvaluationResult,
  MarketingAnalyticsOverview,
} from "../types/marketing.types";

export const marketingApi = {
  // Promotions
  getPromotions: async (params?: Record<string, any>): Promise<Promotion[]> => {
    const res = await apiClient.get("/marketing/promotions/", { params });
    const data = res.data?.data || res.data?.results || res.data;
    return Array.isArray(data) ? data : [];
  },

  getPromotion: async (id: string): Promise<Promotion> => {
    const res = await apiClient.get(`/marketing/promotions/${id}/`);
    return res.data?.data || res.data;
  },

  createPromotion: async (payload: Partial<Promotion>): Promise<Promotion> => {
    const res = await apiClient.post("/marketing/promotions/", payload);
    return res.data?.data || res.data;
  },

  updatePromotion: async (id: string, payload: Partial<Promotion>): Promise<Promotion> => {
    const res = await apiClient.patch(`/marketing/promotions/${id}/`, payload);
    return res.data?.data || res.data;
  },

  deletePromotion: async (id: string): Promise<void> => {
    await apiClient.delete(`/marketing/promotions/${id}/`);
  },

  activatePromotion: async (id: string): Promise<{ status: string; message: string }> => {
    const res = await apiClient.post(`/marketing/promotions/${id}/activate/`);
    return res.data;
  },

  pausePromotion: async (id: string): Promise<{ status: string; message: string }> => {
    const res = await apiClient.post(`/marketing/promotions/${id}/pause/`);
    return res.data;
  },

  evaluatePromotions: async (payload: {
    order_id: string;
    customer_id?: string | null;
    coupon_code?: string | null;
  }): Promise<PromotionEvaluationResult> => {
    const res = await apiClient.post("/marketing/promotions/evaluate/", payload);
    return res.data?.data || res.data;
  },

  // Coupons
  getCoupons: async (params?: Record<string, any>): Promise<Coupon[]> => {
    const res = await apiClient.get("/marketing/coupons/", { params });
    const data = res.data?.data || res.data?.results || res.data;
    return Array.isArray(data) ? data : [];
  },

  createCoupon: async (payload: Partial<Coupon>): Promise<Coupon> => {
    const res = await apiClient.post("/marketing/coupons/", payload);
    return res.data?.data || res.data;
  },

  bulkGenerateCoupons: async (payload: {
    promotion_id: string;
    count: number;
    prefix?: string;
    usage_limit?: number | null;
    per_customer_limit?: number;
    valid_from?: string;
    valid_until?: string | null;
  }): Promise<Coupon[]> => {
    const res = await apiClient.post("/marketing/coupons/bulk-generate/", payload);
    const data = res.data?.data || res.data;
    return Array.isArray(data) ? data : [];
  },

  validateCoupon: async (payload: {
    code: string;
    order_id: string;
    customer_id?: string | null;
  }): Promise<{
    valid: boolean;
    reason: string;
    coupon?: Coupon;
    promotion?: Promotion;
    discount_amount?: string;
  }> => {
    const res = await apiClient.post("/marketing/coupons/validate/", payload);
    return res.data;
  },

  // Segments
  getSegments: async (): Promise<CustomerSegment[]> => {
    const res = await apiClient.get("/marketing/segments/");
    const data = res.data?.data || res.data?.results || res.data;
    return Array.isArray(data) ? data : [];
  },

  createSegment: async (payload: Partial<CustomerSegment>): Promise<CustomerSegment> => {
    const res = await apiClient.post("/marketing/segments/", payload);
    return res.data?.data || res.data;
  },

  updateSegment: async (id: string, payload: Partial<CustomerSegment>): Promise<CustomerSegment> => {
    const res = await apiClient.patch(`/marketing/segments/${id}/`, payload);
    return res.data?.data || res.data;
  },

  previewSegment: async (
    id: string
  ): Promise<{
    segment_id: string;
    segment_name: string;
    total_audience_count: number;
    sample_profiles: Array<{
      id: string;
      name: string;
      phone_masked: string;
      total_visits: number;
      total_spend: string;
      last_visit_at: string;
    }>;
  }> => {
    const res = await apiClient.get(`/marketing/segments/${id}/preview/`);
    return res.data;
  },

  // Campaigns
  getCampaigns: async (): Promise<Campaign[]> => {
    const res = await apiClient.get("/marketing/campaigns/");
    const data = res.data?.data || res.data?.results || res.data;
    return Array.isArray(data) ? data : [];
  },

  createCampaign: async (payload: Partial<Campaign>): Promise<Campaign> => {
    const res = await apiClient.post("/marketing/campaigns/", payload);
    return res.data?.data || res.data;
  },

  launchCampaign: async (id: string): Promise<any> => {
    const res = await apiClient.post(`/marketing/campaigns/${id}/launch/`);
    return res.data;
  },

  pauseCampaign: async (id: string): Promise<any> => {
    const res = await apiClient.post(`/marketing/campaigns/${id}/pause/`);
    return res.data;
  },

  // Analytics
  getAnalytics: async (): Promise<MarketingAnalyticsOverview> => {
    const res = await apiClient.get("/marketing/analytics/");
    return res.data?.data || res.data;
  },

  // Marketing Consent
  getConsents: async (params?: Record<string, any>): Promise<MarketingConsent[]> => {
    const res = await apiClient.get("/marketing/consent/", { params });
    const data = res.data?.data || res.data?.results || res.data;
    return Array.isArray(data) ? data : [];
  },

  updateConsent: async (payload: {
    customer_id: string;
    channel: string;
    status: string;
    source?: string;
    notes?: string;
  }): Promise<MarketingConsent> => {
    const res = await apiClient.post("/marketing/consent/update_consent/", payload);
    return res.data?.data || res.data;
  },
};
