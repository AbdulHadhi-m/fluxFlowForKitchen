import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RecipeVersionBadge } from '../components/RecipeVersionBadge';
import { FoodCostKPICards } from '../components/FoodCostKPICards';
import { StockStatusBadge } from '../components/StockStatusBadge';

describe('Advanced Inventory Components', () => {
  it('renders RecipeVersionBadge correctly', () => {
    render(<RecipeVersionBadge status="PUBLISHED" version={2} />);
    expect(screen.getByText(/v2 • PUBLISHED/i)).toBeInTheDocument();
  });

  it('renders FoodCostKPICards with valuation and variance metrics', () => {
    const valuation = {
      total_valuation: '15400.50',
      total_items_count: 42,
      by_location: { MAIN_STORE: '10000.00', KITCHEN: '5400.50' },
      by_type: { RAW_INGREDIENT: '15400.50' },
    };

    const variance = {
      total_theoretical_cost: '4200.00',
      total_actual_cost: '4550.00',
      net_variance_cost: '350.00',
      items: [],
    };

    render(
      <FoodCostKPICards
        valuation={valuation}
        variance={variance}
        lowStockCount={3}
        outOfStockCount={1}
      />
    );

    expect(screen.getByText(/\$15,400.50/i)).toBeInTheDocument();
    expect(screen.getByText(/\$350.00/i)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders StockStatusBadge properly', () => {
    render(<StockStatusBadge status="LOW_STOCK" />);
    expect(screen.getByText(/Low Stock/i)).toBeInTheDocument();
  });
});
