import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RestaurantProfileForm } from "../components/RestaurantProfileForm";

const queryClient = new QueryClient();

describe("RestaurantProfileForm Component", () => {
  it("renders restaurant profile input fields", () => {
    const mockRestaurant = {
      id: "rest-1",
      name: "Trattoria Bella",
      legal_name: "Bella LLC",
      slug: "trattoria-bella",
      phone: "+1 555-0100",
      email: "info@bellatrattoria.com",
      address_line1: "123 Main St",
      city: "New York",
      state: "NY",
      postal_code: "10001",
      country: "United States",
      timezone: "America/New_York",
      currency: "USD",
      is_active: true,
      business_hours: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    render(
      <QueryClientProvider client={queryClient}>
        <RestaurantProfileForm restaurant={mockRestaurant} />
      </QueryClientProvider>
    );

    expect(screen.getByPlaceholderText(/Bella Italia Bistro/i)).toHaveValue("Trattoria Bella");
    expect(screen.getByPlaceholderText(/Bella Hospitality LLC/i)).toHaveValue("Bella LLC");
  });
});
