import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateJournalModal } from "../components/CreateJournalModal";

const queryClient = new QueryClient();

describe("CreateJournalModal Component", () => {
  it("renders double-entry journal creation interface with debit and credit balance checker", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <CreateJournalModal isOpen={true} onClose={vi.fn()} />
      </QueryClientProvider>
    );

    expect(screen.getByText("Create Double-Entry Journal")).toBeInTheDocument();
    expect(screen.getByText(/Total Debits:/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Credits:/i)).toBeInTheDocument();
    expect(screen.getByText(/Difference:/i)).toBeInTheDocument();
    expect(screen.getByText("Add Leg")).toBeInTheDocument();
  });
});
