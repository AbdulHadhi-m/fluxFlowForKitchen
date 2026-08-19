import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePublicRestaurant, usePublicMenu } from '../hooks/useOrdering';
import { useCartStore } from '../stores/cartStore';
import { StorefrontHeader } from '../components/StorefrontHeader';
import { CategoryNav } from '../components/CategoryNav';
import { MenuItemCard } from '../components/MenuItemCard';
import { ItemDetailModal } from '../components/ItemDetailModal';
import { PublicMenuItem } from '../types/ordering.types';
import { Search, ShoppingBag, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export const PublicStorefrontPage: React.FC = () => {
  const { restaurantSlug } = useParams<{ restaurantSlug: string }>();
  const navigate = useNavigate();
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<PublicMenuItem | null>(null);

  const { data: restaurant, isLoading: isLoadingRest, error: restError } = usePublicRestaurant(
    restaurantSlug || ''
  );
  const { data: menuData, isLoading: isLoadingMenu } = usePublicMenu(
    restaurantSlug || '',
    activeCategoryId || undefined,
    searchQuery || undefined
  );

  const {
    items: cartItems,
    addItem,
    tableName,
    getSubtotal,
    getTotalItemsCount,
    setRestaurantSlug,
  } = useCartStore();

  useEffect(() => {
    if (restaurantSlug) {
      setRestaurantSlug(restaurantSlug);
    }
  }, [restaurantSlug, setRestaurantSlug]);

  if (isLoadingRest) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-900 dark:text-white transition-colors duration-200">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500 mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">Loading restaurant catalog...</p>
      </div>
    );
  }

  if (restError || !restaurant) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-900 dark:text-white text-center transition-colors duration-200">
        <AlertCircle className="w-14 h-14 text-rose-400 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Restaurant Not Found</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 max-w-md">
          The requested restaurant could not be found or digital ordering is currently offline.
        </p>
      </div>
    );
  }

  const subtotal = getSubtotal();
  const totalCount = getTotalItemsCount();

  const handleAddToCart = (item: PublicMenuItem, qty = 1, notes = '') => {
    addItem({
      menu_item_id: item.id,
      name: item.name,
      price: item.price,
      quantity: qty,
      notes,
    });
  };

  const getItemQuantityInCart = (itemId: string) => {
    const found = cartItems.find((i) => i.menu_item_id === itemId);
    return found ? found.quantity : 0;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-32 transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        {/* Restaurant Header */}
        <StorefrontHeader
          restaurant={restaurant}
          tableInfo={tableName ? { tableName } : null}
        />

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="w-5 h-5 text-slate-500 dark:text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search menu for dishes, ingredients, or drinks..."
            className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-inner"
          />
        </div>

        {/* Categories Nav */}
        {menuData && menuData.categories && (
          <CategoryNav
            categories={menuData.categories}
            activeCategoryId={activeCategoryId}
            onSelectCategory={setActiveCategoryId}
          />
        )}

        {/* Menu Items List */}
        {isLoadingMenu ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : menuData && menuData.categories && menuData.categories.length > 0 ? (
          <div className="space-y-10">
            {menuData.categories.map((category) => (
              <section key={category.id} className="space-y-4">
                <div className="border-b border-slate-200 dark:border-slate-800/80 pb-2">
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{category.name}</h2>
                  {category.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{category.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {category.items.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      currency={restaurant.currency}
                      cartQuantity={getItemQuantityInCart(item.id)}
                      onAddToCart={(it) => handleAddToCart(it)}
                      onOpenDetails={(it) => setSelectedItem(it)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-100/60 dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-slate-800/60 p-8">
            <p className="text-slate-500 dark:text-slate-400 font-medium">No dishes match your search criteria.</p>
          </div>
        )}
      </div>

      {/* Item Detail Modal */}
      <ItemDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onAddToCart={handleAddToCart}
      />

      {/* Floating Bottom Cart Bar */}
      {totalCount > 0 && (
        <div className="fixed bottom-6 inset-x-0 z-40 max-w-lg mx-auto px-4 animate-in slide-in-from-bottom-6 duration-300">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-amber-500/40 rounded-3xl p-4 shadow-2xl shadow-amber-500/10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 font-black text-lg shadow-md shadow-amber-500/30">
                {totalCount}
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400">Total items</span>
                <p className="text-lg font-black text-slate-900 dark:text-white">${subtotal.toFixed(2)}</p>
              </div>
            </div>

            <button
              onClick={() => navigate(`/r/${restaurantSlug}/cart`)}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" /> View Cart <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
