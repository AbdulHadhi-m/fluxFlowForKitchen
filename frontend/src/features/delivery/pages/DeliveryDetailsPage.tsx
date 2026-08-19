import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDeliveryDetail, useDeliveryActionMutation } from '../hooks/useDelivery';
import { DeliveryStatusBadge } from '../components/DeliveryStatusBadge';
import { AssignDriverModal } from '../components/AssignDriverModal';
import { DeliveryEventHistory } from '../components/DeliveryEventHistory';
import {
  Truck,
  ArrowLeft,
  MapPin,
  Receipt,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  KeyRound,
  Loader2,
} from 'lucide-react';

export const DeliveryDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [failReason, setFailReason] = useState('');
  const [showFailModal, setShowFailModal] = useState(false);

  const { data: delivery, isLoading, error } = useDeliveryDetail(id || '');
  const actionMutation = useDeliveryActionMutation();

  if (isLoading) {
    return (
      <div className="p-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-3" />
        <p className="text-xs text-slate-400">Loading delivery details...</p>
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center max-w-lg mx-auto">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Delivery Not Found</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
          Unable to locate the specified delivery fulfillment record.
        </p>
        <Link
          to="/delivery"
          className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold"
        >
          Back to Deliveries
        </Link>
      </div>
    );
  }

  const handlePickup = () => actionMutation.mutate({ action: 'pickup', deliveryId: delivery.id });
  const handleStart = () => actionMutation.mutate({ action: 'start', deliveryId: delivery.id });
  const handleComplete = () =>
    actionMutation.mutate({ action: 'complete', deliveryId: delivery.id });
  const handleFail = () => {
    if (!failReason) return;
    actionMutation.mutate({
      action: 'fail',
      deliveryId: delivery.id,
      payload: { reason: failReason },
    });
    setShowFailModal(false);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/delivery/dispatch"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dispatch Board
        </Link>
        <DeliveryStatusBadge status={delivery.status} />
      </div>

      {/* Main Delivery Hero */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Delivery Fulfillment
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
              Order #{delivery.order_number}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Created {new Date(delivery.created_at).toLocaleString()} • {delivery.zone_name || 'Standard Area'}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {!delivery.assigned_driver && delivery.status === 'READY_FOR_DISPATCH' && (
              <button
                onClick={() => setIsAssignModalOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-amber-500/20"
              >
                <UserCheck className="w-4 h-4" /> Assign Driver
              </button>
            )}

            {delivery.status === 'ASSIGNED' && (
              <button
                onClick={handlePickup}
                className="px-4 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors"
              >
                Mark Picked Up
              </button>
            )}

            {delivery.status === 'PICKED_UP' && (
              <button
                onClick={handleStart}
                className="px-4 py-2.5 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs transition-colors"
              >
                Start Delivery
              </button>
            )}

            {delivery.status === 'OUT_FOR_DELIVERY' && (
              <button
                onClick={handleComplete}
                className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" /> Complete Delivery
              </button>
            )}

            {['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(delivery.status) && (
              <button
                onClick={() => setShowFailModal(true)}
                className="px-3.5 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center gap-1 transition-colors"
              >
                <XCircle className="w-4 h-4" /> Mark Failed
              </button>
            )}
          </div>
        </div>

        {/* Verification PIN Badge */}
        {delivery.delivery_pin && (
          <div className="mt-6 p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <KeyRound className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Customer Verification PIN</p>
                <p className="text-xs text-slate-500">Provide to driver upon handover</p>
              </div>
            </div>
            <span className="text-xl font-mono font-black tracking-widest text-amber-400 bg-amber-500/10 px-4 py-1.5 rounded-xl border border-amber-500/30">
              {delivery.delivery_pin}
            </span>
          </div>
        )}
      </div>

      {/* Grid: Address Snapshot + Courier Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Address Snapshot */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-500" /> Immutable Address Snapshot
          </h2>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-500 block">Recipient</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">{delivery.recipient_name}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Phone</span>
              <span className="font-semibold text-slate-600 dark:text-slate-300">{delivery.recipient_phone || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Street Address</span>
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {delivery.address_line_1}
                {delivery.address_line_2 && `, ${delivery.address_line_2}`}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">City, Postal Code</span>
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {delivery.city} {delivery.state && `, ${delivery.state}`} ({delivery.postal_code})
              </span>
            </div>
            {delivery.delivery_instructions && (
              <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl mt-3">
                <span className="text-amber-400 font-bold block mb-0.5">Special Instructions:</span>
                <span className="text-slate-600 dark:text-slate-300 italic">"{delivery.delivery_instructions}"</span>
              </div>
            )}
          </div>
        </div>

        {/* Courier Details */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-500" /> Assigned Courier
          </h2>

          {delivery.driver ? (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block">Courier Name</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{delivery.driver.full_name}</span>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {delivery.driver.availability_status}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Vehicle</span>
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  {delivery.driver.vehicle_type}{' '}
                  {delivery.driver.vehicle_number && `(${delivery.driver.vehicle_number})`}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Phone</span>
                <span className="font-semibold text-slate-600 dark:text-slate-300">{delivery.driver.phone || '—'}</span>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setIsAssignModalOpen(true)}
                  className="w-full py-2 bg-white dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-amber-400 font-bold rounded-xl transition-colors"
                >
                  Reassign Different Driver
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Truck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">No driver assigned yet.</p>
              <button
                onClick={() => setIsAssignModalOpen(true)}
                className="mt-3 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                Assign Courier
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Order Items & Receipt Summary */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-amber-500" /> Order Items ({delivery.order_items.length})
        </h2>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {delivery.order_items.map((item, idx) => (
            <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-900 dark:text-white">
                  {item.quantity}x {item.name}
                </span>
                {item.notes && <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">"{item.notes}"</p>}
              </div>
              <span className="font-semibold text-slate-600 dark:text-slate-300">${item.total_price}</span>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-1 text-xs">
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Subtotal</span>
            <span>${delivery.order_subtotal}</span>
          </div>
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Delivery Fee</span>
            <span>${delivery.delivery_fee}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
            <span>Total Amount</span>
            <span className="text-amber-400 font-extrabold">${delivery.order_total}</span>
          </div>
        </div>
      </div>

      {/* Operational Event History */}
      <DeliveryEventHistory events={delivery.events} />

      {/* Assign Driver Modal */}
      <AssignDriverModal
        delivery={{
          id: delivery.id,
          order: delivery.order,
          order_number: delivery.order_number,
          order_total: delivery.order_total,
          status: delivery.status,
          recipient_name: delivery.recipient_name,
          recipient_phone: delivery.recipient_phone,
          address_line_1: delivery.address_line_1,
          city: delivery.city,
          postal_code: delivery.postal_code,
          zone_name: delivery.zone_name,
          driver_name: delivery.driver?.full_name || '',
          delivery_fee: delivery.delivery_fee,
          created_at: delivery.created_at,
        }}
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
      />

      {/* Fail Modal */}
      {showFailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Mark Delivery as Failed</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Please specify the failure reason (e.g., customer unavailable, wrong address).
            </p>
            <textarea
              value={failReason}
              onChange={(e) => setFailReason(e.target.value)}
              placeholder="Enter reason..."
              rows={3}
              className="w-full p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowFailModal(false)}
                className="flex-1 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleFail}
                disabled={!failReason}
                className="flex-1 py-2 bg-rose-500 hover:bg-rose-400 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                Confirm Failure
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
