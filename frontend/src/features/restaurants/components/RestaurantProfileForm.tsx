import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { restaurantProfileSchema, RestaurantProfileFormData } from "../schemas/restaurant.schemas";
import { useRestaurant } from "../hooks/useRestaurant";
import { Restaurant } from "../types/restaurant.types";
import { Can } from "@/features/authorization/components/Can";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Save, Loader2, CheckCircle2, AlertCircle, Globe, Phone, Mail, MapPin } from "lucide-react";

export const RestaurantProfileForm: React.FC<{ restaurant?: Restaurant }> = ({ restaurant }) => {
  const { updateRestaurant, isUpdatingRestaurant } = useRestaurant();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RestaurantProfileFormData>({
    resolver: zodResolver(restaurantProfileSchema),
    defaultValues: {
      name: restaurant?.name || "",
      legal_name: restaurant?.legal_name || "",
      phone: restaurant?.phone || "",
      email: restaurant?.email || "",
      address_line1: restaurant?.address_line1 || "",
      address_line2: restaurant?.address_line2 || "",
      city: restaurant?.city || "",
      state: restaurant?.state || "",
      postal_code: restaurant?.postal_code || "",
      country: restaurant?.country || "United States",
      timezone: restaurant?.timezone || "UTC",
      currency: restaurant?.currency || "USD",
    },
  });

  const onSubmit = async (data: RestaurantProfileFormData) => {
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await updateRestaurant(data);
      setSuccessMessage("Restaurant profile updated successfully!");
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error?.message || "Failed to update restaurant configuration."
      );
    }
  };

  return (
    <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-400" />
          <CardTitle className="text-base font-semibold text-white">
            General Restaurant Identity
          </CardTitle>
        </div>
        <CardDescription className="text-xs text-slate-400">
          Configure trading names, contact coordinates, localization, and currency.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Trading Name *</label>
              <Input
                placeholder="e.g. Bella Italia Bistro"
                {...register("name")}
                className="bg-slate-950/60 border-slate-800 text-slate-100"
              />
              {errors.name && <p className="text-rose-400 text-[11px]">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Legal / Corporate Name</label>
              <Input
                placeholder="e.g. Bella Hospitality LLC"
                {...register("legal_name")}
                className="bg-slate-950/60 border-slate-800 text-slate-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" /> Contact Phone
              </label>
              <Input
                placeholder="+1 (555) 019-2834"
                {...register("phone")}
                className="bg-slate-950/60 border-slate-800 text-slate-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" /> Contact Email
              </label>
              <Input
                type="email"
                placeholder="operations@restaurant.com"
                {...register("email")}
                className="bg-slate-950/60 border-slate-800 text-slate-100"
              />
              {errors.email && <p className="text-rose-400 text-[11px]">{errors.email.message}</p>}
            </div>
          </div>

          {/* Location details */}
          <div className="pt-2 border-t border-slate-800/80 space-y-3">
            <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-blue-400" /> Physical Location & Address
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Address Line 1</label>
                <Input
                  placeholder="Street address, suite/unit"
                  {...register("address_line1")}
                  className="bg-slate-950/60 border-slate-800 text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">City</label>
                <Input
                  placeholder="City"
                  {...register("city")}
                  className="bg-slate-950/60 border-slate-800 text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">State / Province</label>
                <Input
                  placeholder="State / Region"
                  {...register("state")}
                  className="bg-slate-950/60 border-slate-800 text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Postal / ZIP Code</label>
                <Input
                  placeholder="ZIP"
                  {...register("postal_code")}
                  className="bg-slate-950/60 border-slate-800 text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Localization */}
          <div className="pt-2 border-t border-slate-800/80 space-y-3">
            <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-indigo-400" /> Regional Localization
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Country *</label>
                <Input
                  placeholder="Country"
                  {...register("country")}
                  className="bg-slate-950/60 border-slate-800 text-slate-100"
                />
                {errors.country && <p className="text-rose-400 text-[11px]">{errors.country.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Timezone *</label>
                <Input
                  placeholder="e.g. America/New_York, UTC"
                  {...register("timezone")}
                  className="bg-slate-950/60 border-slate-800 text-slate-100"
                />
                {errors.timezone && <p className="text-rose-400 text-[11px]">{errors.timezone.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Currency (ISO) *</label>
                <Input
                  placeholder="USD, EUR, INR, GBP"
                  {...register("currency")}
                  className="bg-slate-950/60 border-slate-800 text-slate-100 font-mono"
                />
                {errors.currency && <p className="text-rose-400 text-[11px]">{errors.currency.message}</p>}
              </div>
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <Can
              permission="settings.update"
              fallback={
                <Button disabled size="sm" className="opacity-50 text-xs">
                  Read Only (Admin / Manager Permission Required)
                </Button>
              }
            >
              <Button
                type="submit"
                disabled={isUpdatingRestaurant}
                size="sm"
                className="bg-blue-600 hover:bg-blue-500 text-white gap-1.5 text-xs shadow-md shadow-blue-600/20"
              >
                {isUpdatingRestaurant ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" /> Save Configuration
                  </>
                )}
              </Button>
            </Can>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
