import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderingApi } from '../api/ordering.api';
import { CheckoutPayload } from '../types/ordering.types';

export const usePublicRestaurant = (slug: string) => {
  return useQuery({
    queryKey: ['public-restaurant', slug],
    queryFn: () => orderingApi.getPublicRestaurant(slug),
    enabled: Boolean(slug),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const usePublicMenu = (slug: string, categoryId?: string, search?: string) => {
  return useQuery({
    queryKey: ['public-menu', slug, categoryId, search],
    queryFn: () => orderingApi.getPublicMenu(slug, { category_id: categoryId, search }),
    enabled: Boolean(slug),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

export const useQRValidation = (restaurantSlug: string, qrToken: string) => {
  return useQuery({
    queryKey: ['qr-validation', restaurantSlug, qrToken],
    queryFn: () => orderingApi.validateQR(restaurantSlug, qrToken),
    enabled: Boolean(restaurantSlug && qrToken),
    retry: false,
  });
};

export const useCartValidationMutation = () => {
  return useMutation({
    mutationFn: (payload: {
      restaurant_slug: string;
      items: { menu_item_id: string; quantity: number; notes?: string }[];
      order_type: string;
      table_id?: string | null;
      coupon_code?: string;
    }) => orderingApi.validateCart(payload),
  });
};

export const useCheckoutMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CheckoutPayload) => orderingApi.placeCheckout(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
    },
  });
};

export const useOrderTracking = (trackingToken: string) => {
  return useQuery({
    queryKey: ['order-tracking', trackingToken],
    queryFn: () => orderingApi.trackOrder(trackingToken),
    enabled: Boolean(trackingToken),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && (data.display_stage === 'COMPLETED' || data.display_stage === 'CANCELLED')) {
        return false;
      }
      return 6000; // Poll every 6 seconds while in active preparation
    },
  });
};

export const useCustomerOrders = (restaurantSlug: string) => {
  return useQuery({
    queryKey: ['customer-orders', restaurantSlug],
    queryFn: () => orderingApi.getCustomerOrders(restaurantSlug),
    enabled: Boolean(restaurantSlug),
  });
};
