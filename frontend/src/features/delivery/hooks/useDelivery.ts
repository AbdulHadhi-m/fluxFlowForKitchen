import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryApi } from '../api/delivery.api';
import { DriverAvailability, DeliveryZone, CustomerAddress } from '../types/delivery.types';

export const useDeliveries = (params?: {
  status?: string;
  driver_id?: string;
  zone_id?: string;
  search?: string;
}) => {
  return useQuery({
    queryKey: ['deliveries', params],
    queryFn: () => deliveryApi.getDeliveries(params),
    refetchInterval: 10000,
  });
};

export const useDeliveryDetail = (id: string) => {
  return useQuery({
    queryKey: ['delivery-detail', id],
    queryFn: () => deliveryApi.getDeliveryDetail(id),
    enabled: Boolean(id),
    refetchInterval: 5000,
  });
};

export const useDeliveryMetrics = () => {
  return useQuery({
    queryKey: ['delivery-metrics'],
    queryFn: () => deliveryApi.getMetrics(),
    refetchInterval: 10000,
  });
};

export const useDeliveryZones = () => {
  return useQuery({
    queryKey: ['delivery-zones'],
    queryFn: () => deliveryApi.getZones(),
  });
};

export const useDeliveryDrivers = () => {
  return useQuery({
    queryKey: ['delivery-drivers'],
    queryFn: () => deliveryApi.getDrivers(),
    refetchInterval: 15000,
  });
};

export const useAssignDriverMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ deliveryId, driverId }: { deliveryId: string; driverId: string }) =>
      deliveryApi.assignDriver(deliveryId, driverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-detail'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-drivers'] });
    },
  });
};

export const useDeliveryActionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      action,
      deliveryId,
      payload,
    }: {
      action: 'pickup' | 'start' | 'complete' | 'fail' | 'cancel' | 'unassign';
      deliveryId: string;
      payload?: any;
    }) => {
      switch (action) {
        case 'pickup':
          return deliveryApi.markPickedUp(deliveryId);
        case 'start':
          return deliveryApi.startDelivery(deliveryId);
        case 'complete':
          return deliveryApi.completeDelivery(deliveryId, payload?.pin);
        case 'fail':
          return deliveryApi.failDelivery(deliveryId, payload?.reason || 'Failed delivery');
        case 'cancel':
          return deliveryApi.cancelDelivery(deliveryId, payload?.reason);
        case 'unassign':
          return deliveryApi.unassignDriver(deliveryId, payload?.reason);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-detail'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-drivers'] });
    },
  });
};

export const useDriverAvailabilityMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      driverId,
      status,
    }: {
      driverId: string;
      status: DriverAvailability;
    }) => deliveryApi.updateDriverAvailability(driverId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-drivers'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-metrics'] });
    },
  });
};

export const useSaveZoneMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<DeliveryZone> }) =>
      id ? deliveryApi.updateZone(id, data) : deliveryApi.createZone(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
    },
  });
};

export const useDeleteZoneMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deliveryApi.deleteZone(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
    },
  });
};

export const useCustomerAddresses = () => {
  return useQuery({
    queryKey: ['customer-addresses'],
    queryFn: () => deliveryApi.getCustomerAddresses(),
  });
};

export const useSaveCustomerAddressMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CustomerAddress>) => deliveryApi.createCustomerAddress(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses'] });
    },
  });
};
