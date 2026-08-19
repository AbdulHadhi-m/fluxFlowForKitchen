import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCartStore } from '../stores/cartStore';
import {
  ArrowLeft,
  Plus,
  Minus,
  Tag,
  ArrowRight,
  ShoppingBag,
  Utensils,
  ShoppingBasket,
} from 'lucide-react';

export const CartPage: React.FC = () => {
  const { restaurantSlug } = useParams<{ restaurantSlug: string }>();
  const navigate = useNavigate();
  const {
    items,
    tableName,
    orderType,
    setOrderType,
    couponCode,
    setCouponCode,
    specialInstructions,
    setSpecialInstructions,
    updateQuantity,
    removeItem,
    clearCart,
    getSubtotal,
  } = useCartStore();
  const [couponInput, setCouponInput] = useState(couponCode);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(couponCode || null);

  const subtotal = getSubtotal();

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponInput.trim()) {
      setCouponCode(couponInput.trim());
      setAppliedCoupon(couponInput.trim().toUpperCase());
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setAppliedCoupon(null);
    setCouponInput('');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-6 text-center transition-colors duration-200">
        <div className="w-20 h-20 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 mb-6">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Your Cart is Empty</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mb-6">
          Looks like you haven't added any delicious dishes yet.
        </p>
        <Link
          to={`/r/${restaurantSlug}`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Browse Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24 pt-6 transition-colors duration-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Top Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to={`/r/${restaurantSlug}`}
            className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Continue Ordering
          </Link>
          <button
            onClick={clearCart}
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors"
          >
            Clear Cart
          </button>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-6">Your Order Cart</h1>

        {/* Order Type Toggle */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-2xl flex items-center gap-2 mb-6">
          <button
            type="button"
            onClick={() => setOrderType('DINE_IN')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              orderType === 'DINE_IN'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800/60'
            }`}
          >
            <Utensils className="w-4 h-4" /> Dine-In {tableName && `(${tableName})`}
          </button>
          <button
            type="button"
            onClick={() => setOrderType('TAKEAWAY')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              orderType === 'TAKEAWAY'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800/60'
            }`}
          >
            <ShoppingBasket className="w-4 h-4" /> Takeaway / Pickup
          </button>
        </div>

        {/* Cart Item List */}
        <div className="bg-white/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 mb-6 space-y-5">
          {items.map((item) => (
            <div
              key={item.menu_item_id}
              className="flex items-start justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800/80 last:border-0 last:pb-0"
            >
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{item.name}</h3>
                <p className="text-xs font-semibold text-amber-400 mt-0.5">
                  ${parseFloat(item.price).toFixed(2)} each
                </p>
                {item.notes && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">Note: "{item.notes}"</p>
                )}
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center gap-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-xl">
                <button
                  onClick={() => updateQuantity(item.menu_item_id, item.quantity - 1)}
                  className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-extrabold text-sm text-slate-900 dark:text-white w-5 text-center">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.menu_item_id, item.quantity + 1)}
                  className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Line Total */}
              <div className="text-right">
                <p className="text-base font-extrabold text-slate-900 dark:text-white">
                  ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                </p>
                <button
                  onClick={() => removeItem(item.menu_item_id)}
                  className="text-xs text-slate-500 hover:text-rose-400 transition-colors mt-1"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Special Instructions */}
        <div className="bg-white/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 mb-6">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Order Preparation Instructions
          </label>
          <textarea
            rows={2}
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="e.g. Please bring extra cutlery, leave sauce on the side..."
            maxLength={300}
            className="mt-2 w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
          />
        </div>

        {/* Coupon Code Input */}
        <div className="bg-white/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 mb-6">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-2">
            <Tag className="w-3.5 h-3.5 text-amber-500" /> Have a Coupon or Voucher Code?
          </label>
          {appliedCoupon ? (
            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5 rounded-xl text-emerald-400">
              <span className="text-sm font-bold tracking-wider">CODE: {appliedCoupon}</span>
              <button
                type="button"
                onClick={handleRemoveCoupon}
                className="text-xs font-bold text-rose-400 hover:text-rose-300"
              >
                Remove
              </button>
            </div>
          ) : (
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="Enter promo code"
                className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 uppercase font-medium focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs transition-colors"
              >
                Apply
              </button>
            </form>
          )}
        </div>

        {/* Totals Breakdown */}
        <div className="bg-white/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 mb-8 space-y-3">
          <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-900 dark:text-white">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <span>Taxes & Fees</span>
            <span className="font-medium text-slate-500 dark:text-slate-400">Calculated at checkout</span>
          </div>
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-lg font-bold text-slate-900 dark:text-white">Estimated Subtotal</span>
            <span className="text-2xl font-black text-amber-400">${subtotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Checkout Action Button */}
        <button
          onClick={() => navigate(`/r/${restaurantSlug}/checkout`)}
          className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-base transition-all shadow-xl shadow-amber-500/20 active:scale-98 flex items-center justify-center gap-2"
        >
          Proceed to Checkout <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
