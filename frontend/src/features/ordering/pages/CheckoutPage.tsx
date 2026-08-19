import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCartStore } from '../stores/cartStore';
import { useCartValidationMutation, useCheckoutMutation } from '../hooks/useOrdering';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CreditCard,
  Banknote,
  Clock,
  ShieldCheck,
  User,
  Phone,
  Mail,
} from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const { restaurantSlug } = useParams<{ restaurantSlug: string }>();
  const navigate = useNavigate();
  const {
    items,
    orderType,
    tableId,
    qrToken,
    couponCode,
    specialInstructions,
    clearCart,
  } = useCartStore();

  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'PAY_AT_COUNTER' | 'ONLINE_CARD' | 'CASH'>(
    'PAY_AT_COUNTER'
  );
  const [formError, setFormError] = useState<string | null>(null);

  const cartValidationMutation = useCartValidationMutation();
  const checkoutMutation = useCheckoutMutation();

  useEffect(() => {
    if (!restaurantSlug || items.length === 0) {
      navigate(`/r/${restaurantSlug || ''}/cart`, { replace: true });
      return;
    }

    // Trigger authoritative cart evaluation
    cartValidationMutation.mutate({
      restaurant_slug: restaurantSlug,
      items: items.map((i) => ({
        menu_item_id: i.menu_item_id,
        quantity: i.quantity,
        notes: i.notes,
      })),
      order_type: orderType,
      table_id: tableId,
      coupon_code: couponCode || undefined,
    });
  }, [restaurantSlug, items, orderType, tableId, couponCode, cartValidationMutation, navigate]);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!guestName.trim()) {
      setFormError('Please provide your name.');
      return;
    }

    if (orderType === 'TAKEAWAY' && !guestPhone.trim()) {
      setFormError('Please provide a contact phone number for takeaway orders.');
      return;
    }

    if (!restaurantSlug) return;

    try {
      const res = await checkoutMutation.mutateAsync({
        restaurant_slug: restaurantSlug,
        items: items.map((i) => ({
          menu_item_id: i.menu_item_id,
          quantity: i.quantity,
          notes: i.notes,
        })),
        order_type: orderType,
        table_id: tableId,
        qr_token: qrToken || undefined,
        coupon_code: couponCode || undefined,
        guest_info: {
          name: guestName.trim(),
          phone: guestPhone.trim(),
          email: guestEmail.trim(),
        },
        payment_method: paymentMethod,
        special_instructions: specialInstructions,
      });

      clearCart();
      navigate(`/r/${restaurantSlug}/order/${res.tracking_token}/track`, { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.items?.[0] ||
        err?.response?.data?.ordering?.[0] ||
        'Failed to place order. Please try again.';
      setFormError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  const validation = cartValidationMutation.data;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24 pt-6 transition-colors duration-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Navigation */}
        <div className="mb-6">
          <Link
            to={`/r/${restaurantSlug}/cart`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Cart
          </Link>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-6">Finalize Checkout</h1>

        {formError && (
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-3 mb-6">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{formError}</p>
          </div>
        )}

        <form onSubmit={handlePlaceOrder} className="space-y-6">
          {/* Customer Contact Details */}
          <div className="bg-white/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4 text-amber-500" /> Customer Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Full Name *
                </label>
                <div className="relative mt-1.5">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Phone Number {orderType === 'TAKEAWAY' && '*'}
                </label>
                <div className="relative mt-1.5">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required={orderType === 'TAKEAWAY'}
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="+1 555-0199"
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Email (Optional for receipt)
                </label>
                <div className="relative mt-1.5">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="bg-white/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-amber-500" /> Select Payment Method
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'PAY_AT_COUNTER'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  className="sr-only"
                  checked={paymentMethod === 'PAY_AT_COUNTER'}
                  onChange={() => setPaymentMethod('PAY_AT_COUNTER')}
                />
                <Banknote className="w-6 h-6 mb-2" />
                <span className="text-xs text-center">Pay at Counter</span>
              </label>

              <label
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'ONLINE_CARD'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  className="sr-only"
                  checked={paymentMethod === 'ONLINE_CARD'}
                  onChange={() => setPaymentMethod('ONLINE_CARD')}
                />
                <CreditCard className="w-6 h-6 mb-2" />
                <span className="text-xs text-center">Credit / Debit Card</span>
              </label>

              <label
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'CASH'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  className="sr-only"
                  checked={paymentMethod === 'CASH'}
                  onChange={() => setPaymentMethod('CASH')}
                />
                <Clock className="w-6 h-6 mb-2" />
                <span className="text-xs text-center">Cash on Pickup</span>
              </label>
            </div>
          </div>

          {/* Authoritative Order Summary */}
          <div className="bg-white/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">Authoritative Order Summary</h2>

            {cartValidationMutation.isPending ? (
              <div className="py-6 flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                Calculating authoritative taxes & totals...
              </div>
            ) : validation ? (
              <>
                <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-slate-900 dark:text-white">₹{validation.subtotal}</span>
                </div>

                {parseFloat(validation.discount_amount) > 0 && (
                  <div className="flex items-center justify-between text-sm text-emerald-400 font-semibold">
                    <span>Discount ({validation.applied_promotion?.promotion_name || 'Promo'})</span>
                    <span>-₹{validation.discount_amount}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                  <span>Taxes ({validation.tax_rate}%)</span>
                  <span className="font-semibold text-slate-900 dark:text-white">₹{validation.tax_amount}</span>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">Grand Total</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Est. Prep Time: {validation.estimated_prep_time_minutes} mins
                    </p>
                  </div>
                  <span className="text-3xl font-black text-amber-400">₹{validation.total}</span>
                </div>
              </>
            ) : null}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={checkoutMutation.isPending || cartValidationMutation.isPending}
            className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-base transition-all shadow-xl shadow-amber-500/20 active:scale-98 flex items-center justify-center gap-2"
          >
            {checkoutMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Placing Your Order...
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" /> Confirm & Place Order • $
                {validation?.total || '0.00'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
