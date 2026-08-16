import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "../api/settings.api";
import {
  RestaurantProfile,
  OperationalConfiguration,
  UserPreference,
} from "../types/settings.types";
import { useAuthStore } from "@/features/auth/store/authStore";

export const useSettings = () => {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const profileQuery = useQuery({
    queryKey: ["restaurantProfile"],
    queryFn: () => settingsApi.getRestaurantProfile(),
    enabled: isAuthenticated,
  });

  const operationalQuery = useQuery({
    queryKey: ["operationalSettings"],
    queryFn: () => settingsApi.getOperationalConfiguration(),
    enabled: isAuthenticated,
  });

  const preferencesQuery = useQuery({
    queryKey: ["userPreferences"],
    queryFn: () => settingsApi.getUserPreferences(),
    enabled: isAuthenticated,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (payload: Partial<RestaurantProfile>) =>
      settingsApi.updateRestaurantProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurantProfile"] });
    },
  });

  const updateOperationalMutation = useMutation({
    mutationFn: (payload: Partial<OperationalConfiguration>) =>
      settingsApi.updateOperationalConfiguration(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operationalSettings"] });
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: (payload: Partial<UserPreference>) =>
      settingsApi.updateUserPreferences(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPreferences"] });
    },
  });

  return {
    profile: profileQuery.data?.data,
    isLoadingProfile: profileQuery.isLoading,
    operational: operationalQuery.data?.data,
    isLoadingOperational: operationalQuery.isLoading,
    preferences: preferencesQuery.data?.data,
    isLoadingPreferences: preferencesQuery.isLoading,
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,
    updateOperational: updateOperationalMutation.mutateAsync,
    isUpdatingOperational: updateOperationalMutation.isPending,
    updatePreferences: updatePreferencesMutation.mutateAsync,
    isUpdatingPreferences: updatePreferencesMutation.isPending,
  };
};
