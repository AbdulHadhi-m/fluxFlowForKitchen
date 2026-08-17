import { apiClient } from '@/lib/api-client';
import {
  DeliveryListItem,
  DeliveryDetail,
  DeliveryMetrics,
  DeliveryZone,
  DeliveryDriver,
  DriverAvailability,
  CustomerAddress,
  DeliveryEstimateResponse,
} from '../types/delivery.types';

export const deliveryApi = {
  // Deliveries Dispatch
  getDeliveries: async (params?: {
    status?: string;
    driver_id?: string;
    zone_id?: string;
    search?: string;
  }): Promise<DeliveryListItem[]> => {
    const res = await apiClient.get<any>('/delivery/', { params });
    const payload = res.data;
    return payload?.data?.results || payload?.data || payload?.results || payload || [];
  },

  getDeliveryDetail: async (id: string): Promise<DeliveryDetail> => {
    const res = await apiClient.get<any>(`/delivery/${id}/`);
    const payload = res.data;
    return payload?.data || payload;
  },

  getMetrics: async (): Promise<DeliveryMetrics> => {
    const res = await apiClient.get<any>('/delivery/metrics/');
    const payload = res.data;
    return payload?.data || payload;
  },

  assignDriver: async (deliveryId: string, driverId: string): Promise<DeliveryDetail> => {
    const res = await apiClient.post<any>(`/delivery/${deliveryId}/assign/`, {
      driver_id: driverId,
    });
    return res.data?.data || res.data;
  },

  unassignDriver: async (deliveryId: string, reason?: string): Promise<DeliveryDetail> => {
    const res = await apiClient.post<any>(`/delivery/${deliveryId}/unassign/`, { reason });
    return res.data?.data || res.data;
  },

  markPickedUp: async (deliveryId: string): Promise<DeliveryDetail> => {
    const res = await apiClient.post<any>(`/delivery/${deliveryId}/pickup/`, {});
    return res.data?.data || res.data;
  },

  startDelivery: async (deliveryId: string): Promise<DeliveryDetail> => {
    const res = await apiClient.post<any>(`/delivery/${deliveryId}/start/`, {});
    return res.data?.data || res.data;
  },

  completeDelivery: async (deliveryId: string, pin?: string): Promise<DeliveryDetail> => {
    const res = await apiClient.post<any>(`/delivery/${deliveryId}/complete/`, { pin });
    return res.data?.data || res.data;
  },

  failDelivery: async (deliveryId: string, reason: string): Promise<DeliveryDetail> => {
    const res = await apiClient.post<any>(`/delivery/${deliveryId}/fail/`, { reason });
    return res.data?.data || res.data;
  },

  cancelDelivery: async (deliveryId: string, reason?: string): Promise<DeliveryDetail> => {
    const res = await apiClient.post<any>(`/delivery/${deliveryId}/cancel/`, { reason });
    return res.data?.data || res.data;
  },

  // Delivery Zones
  getZones: async (): Promise<DeliveryZone[]> => {
    const res = await apiClient.get<any>('/delivery/zones/');
    const payload = res.data;
    return payload?.data?.results || payload?.data || payload?.results || payload || [];
  },

  createZone: async (data: Partial<DeliveryZone>): Promise<DeliveryZone> => {
    const res = await apiClient.post<any>('/delivery/zones/', data);
    return res.data?.data || res.data;
  },

  updateZone: async (id: string, data: Partial<DeliveryZone>): Promise<DeliveryZone> => {
    const res = await apiClient.patch<any>(`/delivery/zones/${id}/`, data);
    return res.data?.data || res.data;
  },

  deleteZone: async (id: string): Promise<void> => {
    await apiClient.delete(`/delivery/zones/${id}/`);
  },

  // Drivers
  getDrivers: async (): Promise<DeliveryDriver[]> => {
    const res = await apiClient.get<any>('/delivery/drivers/');
    const payload = res.data;
    return payload?.data?.results || payload?.data || payload?.results || payload || [];
  },

  updateDriverAvailability: async (
    driverId: string,
    status: DriverAvailability
  ): Promise<DeliveryDriver> => {
    const res = await apiClient.patch<any>(`/delivery/drivers/${driverId}/availability/`, {
      availability_status: status,
    });
    return res.data?.data || res.data;
  },

  // Customer Addresses
  getCustomerAddresses: async (): Promise<CustomerAddress[]> => {
    const res = await apiClient.get<any>('/delivery/addresses/');
    const payload = res.data;
    return payload?.data?.results || payload?.data || payload?.results || payload || [];
  },

  createCustomerAddress: async (data: Partial<CustomerAddress>): Promise<CustomerAddress> => {
    const res = await apiClient.post<any>('/delivery/addresses/', data);
    return res.data?.data || res.data;
  },

  estimateDelivery: async (
    restaurantSlug: string,
    postalCode: string,
    subtotal?: string
  ): Promise<DeliveryEstimateResponse> => {
    const res = await apiClient.post<DeliveryEstimateResponse>('/delivery/estimate/', {
      restaurant_slug: restaurantSlug,
      postal_code: postalCode,
      subtotal: subtotal || '0.00',
    });
    return res.data;
  },
};
