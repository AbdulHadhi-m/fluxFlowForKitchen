import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StorefrontHeader } from '../components/StorefrontHeader';
import { CategoryNav } from '../components/CategoryNav';
import { MenuItemCard } from '../components/MenuItemCard';
import { OrderTimeline } from '../components/OrderTimeline';
import { PublicRestaurant, PublicMenuCategory, PublicMenuItem } from '../types/ordering.types';

const queryClient = new QueryClient();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <MemoryRouter>{children}</MemoryRouter>
  </QueryClientProvider>
);

describe('Ordering Components', () => {
  const mockRestaurant: PublicRestaurant = {
    id: 'rest-1',
    name: 'Artisan Burger Co.',
    slug: 'artisan-burger',
    phone: '555-0100',
    email: 'info@artisan.com',
    address_line1: '123 Food Street',
    address_line2: '',
    city: 'New York',
    state: 'NY',
    postal_code: '10001',
    country: 'USA',
    timezone: 'America/New_York',
    currency: 'USD',
    cover_image_url: '',
    tagline: 'Gourmet handcrafted burgers',
    online_ordering_enabled: true,
    qr_ordering_enabled: true,
    takeaway_ordering_enabled: true,
    guest_checkout_enabled: true,
    min_online_order_amount: '0.00',
    is_open: true,
  };

  it('renders StorefrontHeader with branding and table info', () => {
    render(
      <StorefrontHeader
        restaurant={mockRestaurant}
        tableInfo={{ tableName: 'Table 4', section: 'Main Patio' }}
      />,
      { wrapper }
    );

    expect(screen.getByText('Artisan Burger Co.')).toBeDefined();
    expect(screen.getByText('Gourmet handcrafted burgers')).toBeDefined();
    expect(screen.getByText('Open')).toBeDefined();
    expect(screen.getByText(/Table 4/)).toBeDefined();
  });

  it('renders CategoryNav and handles category click', () => {
    const mockCats: PublicMenuCategory[] = [
      { id: 'cat-1', name: 'Burgers', description: '', display_order: 1, items: [] },
      { id: 'cat-2', name: 'Sides', description: '', display_order: 2, items: [] },
    ];
    const onSelect = vi.fn();

    render(
      <CategoryNav
        categories={mockCats}
        activeCategoryId="cat-1"
        onSelectCategory={onSelect}
      />,
      { wrapper }
    );

    expect(screen.getByText('All Items')).toBeDefined();
    expect(screen.getByText('Burgers')).toBeDefined();
    expect(screen.getByText('Sides')).toBeDefined();

    fireEvent.click(screen.getByText('Sides'));
    expect(onSelect).toHaveBeenCalledWith('cat-2');
  });

  it('renders MenuItemCard with add to cart button', () => {
    const mockItem: PublicMenuItem = {
      id: 'item-1',
      name: 'Double Bacon Smash',
      description: 'Two patties with aged cheddar and crispy bacon',
      price: '16.50',
      is_available: true,
      category_id: 'cat-1',
      display_order: 1,
    };
    const onAdd = vi.fn();
    const onOpen = vi.fn();

    render(
      <MenuItemCard
        item={mockItem}
        currency="USD"
        cartQuantity={2}
        onAddToCart={onAdd}
        onOpenDetails={onOpen}
      />,
      { wrapper }
    );

    expect(screen.getByText('Double Bacon Smash')).toBeDefined();
    expect(screen.getByText('₹16.50')).toBeDefined();
    expect(screen.getByText('2 in cart')).toBeDefined();

    fireEvent.click(screen.getByText('Add'));
    expect(onAdd).toHaveBeenCalledWith(mockItem);
  });

  it('renders OrderTimeline according to lifecycle stage', () => {
    const { rerender } = render(<OrderTimeline stage="PLACED" />);
    expect(screen.getByText('Order Placed')).toBeDefined();
    expect(screen.getByText('Preparing')).toBeDefined();

    rerender(<OrderTimeline stage="CANCELLED" />);
    expect(screen.getByText('Order Cancelled')).toBeDefined();
  });
});
