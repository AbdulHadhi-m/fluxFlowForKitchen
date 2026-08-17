import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQRValidation } from '../hooks/useOrdering';
import { useCartStore } from '../stores/cartStore';
import { Loader2, AlertCircle, QrCode } from 'lucide-react';

export const QRTableOrderingPage: React.FC = () => {
  const { restaurantSlug, qrToken } = useParams<{ restaurantSlug: string; qrToken: string }>();
  const navigate = useNavigate();
  const { setRestaurantSlug, setTableContext } = useCartStore();

  const { data: qrData, isLoading } = useQRValidation(
    restaurantSlug || '',
    qrToken || ''
  );

  useEffect(() => {
    if (qrData && restaurantSlug) {
      setRestaurantSlug(restaurantSlug);
      setTableContext(qrData.table_id, qrData.table_name, qrData.qr_token);
      navigate(`/r/${restaurantSlug}`, { replace: true });
    }
  }, [qrData, restaurantSlug, setRestaurantSlug, setTableContext, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-6 animate-pulse">
          <QrCode className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Verifying Table QR Code...</h2>
        <p className="text-slate-400 text-sm max-w-sm">Connecting your table to the digital menu</p>
        <Loader2 className="w-6 h-6 animate-spin text-amber-500 mt-6" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
      <AlertCircle className="w-14 h-14 text-rose-400 mb-4" />
      <h2 className="text-2xl font-bold text-white">Invalid Table Code</h2>
      <p className="text-slate-400 text-sm mt-2 max-w-md">
        This QR code is either expired, invalid, or belongs to another restaurant.
      </p>
    </div>
  );
};
