import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { restaurantApi } from "../api/restaurant.api";
import { RestaurantUpdatePayload, BusinessHour } from "../types/restaurant.types";
import { useAuthStore } from "@/features/auth/store/authStore";

export const useRestaurant = () => {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Fetch current restaurant data
  const restaurantQuery = useQuery({
    queryKey: ["currentRestaurant"],
    queryFn: () => restaurantApi.getCurrentRestaurant().then((res) => res.data),
    enabled: isAuthenticated,
  });

  // Update profile mutation
  const updateRestaurantMutation = useMutation({
    mutationFn: (data: RestaurantUpdatePayload) =>
      restaurantApi.updateCurrentRestaurant(data).then((res) => res.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(["currentRestaurant"], updated);
      queryClient.invalidateQueries({ queryKey: ["currentRestaurant"] });
    },
  });

  // Update operating hours mutation
  const updateBusinessHoursMutation = useMutation({
    mutationFn: (hours: BusinessHour[]) =>
      restaurantApi.updateBusinessHours(hours).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentRestaurant"] });
    },
  });

  return {
    restaurant: restaurantQuery.data,
    isLoading: restaurantQuery.isLoading,
    isError: restaurantQuery.isError,
    error: restaurantQuery.error,
    updateRestaurant: updateRestaurantMutation.mutateAsync,
    isUpdatingRestaurant: updateRestaurantMutation.isPending,
    updateBusinessHours: updateBusinessHoursMutation.mutateAsync,
    isUpdatingHours: updateBusinessHoursMutation.isPending,
  };
};
