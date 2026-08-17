import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateAccountModal } from "../components/CreateAccountModal";

const queryClient = new QueryClient();

describe("CreateAccountModal Component", () => {
  it("renders GL account creation form fields", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <CreateAccountModal isOpen={true} onClose={vi.fn()} />
      </QueryClientProvider>
    );

    expect(screen.getByText("Add General Ledger Account")).toBeInTheDocument();
    expect(screen.getByText("Account Code")).toBeInTheDocument();
    expect(screen.getByText("Account Title")).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Normal Balance")).toBeInTheDocument();
  });
});
