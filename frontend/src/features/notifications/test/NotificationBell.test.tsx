import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationBell } from "../components/NotificationBell";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

describe("NotificationBell Component", () => {
  it("renders bell button and toggles dropdown on click", () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <NotificationBell />
        </BrowserRouter>
      </QueryClientProvider>
    );

    const bellBtn = screen.getByLabelText("Open notifications");
    expect(bellBtn).toBeInTheDocument();

    fireEvent.click(bellBtn);
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("View all in Notification Center")).toBeInTheDocument();
  });
});
