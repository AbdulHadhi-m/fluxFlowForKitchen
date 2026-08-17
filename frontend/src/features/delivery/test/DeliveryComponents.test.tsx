import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeliveryStatusBadge } from '../components/DeliveryStatusBadge';
import { DeliveryMetricsCards } from '../components/DeliveryMetricsCards';
import { DeliveryEventHistory } from '../components/DeliveryEventHistory';
import { DeliveryMetrics, DeliveryEvent } from '../types/delivery.types';

const queryClient = new QueryClient();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <MemoryRouter>{children}</MemoryRouter>
  </QueryClientProvider>
);

describe('Delivery Components', () => {
  it('renders DeliveryStatusBadge for multiple statuses', () => {
    const { rerender } = render(<DeliveryStatusBadge status="READY_FOR_DISPATCH" />);
    expect(screen.getByText('Ready for Dispatch')).toBeDefined();

    rerender(<DeliveryStatusBadge status="OUT_FOR_DELIVERY" />);
    expect(screen.getByText('Out for Delivery')).toBeDefined();

    rerender(<DeliveryStatusBadge status="DELIVERED" />);
    expect(screen.getByText('Delivered')).toBeDefined();

    rerender(<DeliveryStatusBadge status="FAILED" />);
    expect(screen.getByText('Failed')).toBeDefined();
  });

  it('renders DeliveryMetricsCards with correct figures', () => {
    const mockMetrics: DeliveryMetrics = {
      pending_count: 3,
      ready_for_dispatch_count: 5,
      assigned_count: 2,
      out_for_delivery_count: 4,
      completed_today_count: 18,
      failed_today_count: 1,
      available_drivers_count: 6,
      total_drivers_count: 8,
    };

    render(<DeliveryMetricsCards metrics={mockMetrics} />, { wrapper });
    expect(screen.getByText('Ready Dispatch')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();
    expect(screen.getByText('4')).toBeDefined();
    expect(screen.getByText('6 / 8')).toBeDefined();
    expect(screen.getByText('18')).toBeDefined();
  });

  it('renders DeliveryEventHistory timeline events', () => {
    const mockEvents: DeliveryEvent[] = [
      {
        id: 'evt-1',
        event_type: 'DELIVERY_CREATED',
        actor_name: 'POS System',
        notes: 'Order placed online',
        created_at: new Date().toISOString(),
      },
      {
        id: 'evt-2',
        event_type: 'DRIVER_ASSIGNED',
        actor_name: 'Manager John',
        notes: 'Assigned to courier Dave',
        created_at: new Date().toISOString(),
      },
    ];

    render(<DeliveryEventHistory events={mockEvents} />);
    expect(screen.getByText('DELIVERY CREATED')).toBeDefined();
    expect(screen.getByText('DRIVER ASSIGNED')).toBeDefined();
    expect(screen.getByText('Order placed online')).toBeDefined();
    expect(screen.getByText('Manager John')).toBeDefined();
  });
});
