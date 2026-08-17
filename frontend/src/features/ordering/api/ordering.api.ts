import { apiClient } from '@/lib/api-client';
import {
  PublicRestaurant,
  PublicMenuData,
  QRTableValidationResponse,
  CartValidationResponse,
  CheckoutPayload,
  CheckoutResponse,
  OrderTrackingInfo,
  CustomerAuthResponse,
} from '../types/ordering.types';

export const orderingApi = {
  getPublicRestaurant: async (slug: string): Promise<PublicRestaurant> => {
    const res = await apiClient.get<PublicRestaurant>(`/public/restaurants/${slug}/`);
    return res.data;
  },

  getPublicMenu: async (slug: string, params?: { category_id?: string; search?: string }): Promise<PublicMenuData> => {
    const res = await apiClient.get<PublicMenuData>(`/public/restaurants/${slug}/menu/`, { params });
    return res.data;
  },

  validateQR: async (restaurantSlug: string, qrToken: string): Promise<QRTableValidationResponse> => {
    const res = await apiClient.get<QRTableValidationResponse>('/ordering/qr/validate/', {
      params: { restaurant_slug: restaurantSlug, qr_token: qrToken },
    });
    return res.data;
  },

  validateCart: async (payload: {
    restaurant_slug: string;
    items: { menu_item_id: string; quantity: number; notes?: string }[];
    order_type: string;
    table_id?: string | null;
    coupon_code?: string;
  }): Promise<CartValidationResponse> => {
    const res = await apiClient.post<CartValidationResponse>('/ordering/cart/validate/', payload);
    return res.data;
  },

  placeCheckout: async (payload: CheckoutPayload): Promise<CheckoutResponse> => {
    const res = await apiClient.post<CheckoutResponse>('/ordering/checkout/', payload);
    return res.data;
  },

  trackOrder: async (trackingToken: string): Promise<OrderTrackingInfo> => {
    const res = await apiClient.get<OrderTrackingInfo>(`/ordering/orders/${trackingToken}/`);
    return res.data;
  },

  customerRegister: async (payload: {
    first_name: string;
    last_name?: string;
    email: string;
    phone: string;
    password: string;
    restaurant_slug: string;
  }): Promise<CustomerAuthResponse> => {
    const res = await apiClient.post<CustomerAuthResponse>('/customer/register/', payload);
    return res.data;
  },

  customerLogin: async (payload: {
    email: string;
    password: string;
    restaurant_slug: string;
  }): Promise<CustomerAuthResponse> => {
    const res = await apiClient.post<CustomerAuthResponse>('/customer/login/', payload);
    return res.data;
  },

  getCustomerOrders: async (restaurantSlug: string): Promise<any[]> => {
    const res = await apiClient.get<any[]>('/customer/orders/', {
      params: { restaurant_slug: restaurantSlug },
    });
    return res.data;
  },
};
