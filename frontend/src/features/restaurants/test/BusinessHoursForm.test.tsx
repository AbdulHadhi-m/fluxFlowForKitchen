import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BusinessHoursForm } from "../components/BusinessHoursForm";

const queryClient = new QueryClient();

describe("BusinessHoursForm Component", () => {
  it("renders all 7 days of week", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BusinessHoursForm />
      </QueryClientProvider>
    );

    expect(screen.getByText("Monday")).toBeInTheDocument();
    expect(screen.getByText("Tuesday")).toBeInTheDocument();
    expect(screen.getByText("Wednesday")).toBeInTheDocument();
    expect(screen.getByText("Thursday")).toBeInTheDocument();
    expect(screen.getByText("Friday")).toBeInTheDocument();
    expect(screen.getByText("Saturday")).toBeInTheDocument();
    expect(screen.getByText("Sunday")).toBeInTheDocument();
  });
});
