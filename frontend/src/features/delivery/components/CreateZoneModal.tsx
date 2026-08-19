import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSaveZoneMutation } from '../hooks/useDelivery';
import { DeliveryZone } from '../types/delivery.types';
import { X, MapPin, Loader2 } from 'lucide-react';

const zoneSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  postal_codes_raw: z.string().min(1, 'Enter at least one postal code (comma-separated)'),
  fee: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid fee (e.g. 5.00)'),
  minimum_order: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid minimum order (e.g. 15.00)'),
  estimated_minutes: z.coerce.number().min(5, 'Minimum 5 minutes').max(180, 'Maximum 180 minutes'),
  priority: z.coerce.number().min(1).max(100),
  is_active: z.boolean(),
});

type ZoneFormData = z.infer<typeof zoneSchema>;

interface CreateZoneModalProps {
  zone?: DeliveryZone | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CreateZoneModal: React.FC<CreateZoneModalProps> = ({ zone, isOpen, onClose }) => {
  const saveMutation = useSaveZoneMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ZoneFormData>({
    resolver: zodResolver(zoneSchema),
    defaultValues: {
      name: zone?.name || '',
      description: zone?.description || '',
      postal_codes_raw: zone?.postal_codes?.join(', ') || '',
      fee: zone?.fee || '5.00',
      minimum_order: zone?.minimum_order || '15.00',
      estimated_minutes: zone?.estimated_minutes || 30,
      priority: zone?.priority || 10,
      is_active: zone?.is_active ?? true,
    },
  });

  if (!isOpen) return null;

  const onSubmit = async (data: ZoneFormData) => {
    const codes = data.postal_codes_raw
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    await saveMutation.mutateAsync({
      id: zone?.id,
      data: {
        name: data.name,
        description: data.description || '',
        postal_codes: codes,
        fee: data.fee,
        minimum_order: data.minimum_order,
        estimated_minutes: data.estimated_minutes,
        priority: data.priority,
        is_active: data.is_active,
      },
    });
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {zone ? 'Edit Delivery Zone' : 'Create Delivery Zone'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Configure delivery radius and fee rules</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Zone Name</label>
            <input
              {...register('name')}
              placeholder="e.g. Downtown Core / Zone A"
              className="mt-1 w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
            />
            {errors.name && <p className="text-rose-400 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Matched Postal Codes (comma-separated or prefixes)
            </label>
            <input
              {...register('postal_codes_raw')}
              placeholder="e.g. 10001, 10002, 10003, 101"
              className="mt-1 w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
            />
            {errors.postal_codes_raw && (
              <p className="text-rose-400 text-xs mt-1">{errors.postal_codes_raw.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Delivery Fee ($)</label>
              <input
                {...register('fee')}
                className="mt-1 w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
              {errors.fee && <p className="text-rose-400 text-xs mt-1">{errors.fee.message}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Min. Order ($)</label>
              <input
                {...register('minimum_order')}
                className="mt-1 w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
              {errors.minimum_order && (
                <p className="text-rose-400 text-xs mt-1">{errors.minimum_order.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Transit Duration (mins)</label>
              <input
                type="number"
                {...register('estimated_minutes')}
                className="mt-1 w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
              {errors.estimated_minutes && (
                <p className="text-rose-400 text-xs mt-1">{errors.estimated_minutes.message}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Priority (1-100)</label>
              <input
                type="number"
                {...register('priority')}
                className="mt-1 w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
              {errors.priority && (
                <p className="text-rose-400 text-xs mt-1">{errors.priority.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active"
              {...register('is_active')}
              className="w-4 h-4 rounded text-amber-500 bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            />
            <label htmlFor="is_active" className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Zone is Active and Accepting Orders
            </label>
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Zone'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
