import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateSupplierModal } from "../components/CreateSupplierModal";

const queryClient = new QueryClient();

describe("CreateSupplierModal Component", () => {
  it("renders CreateSupplierModal fields", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <CreateSupplierModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          isLoading={false}
        />
      </QueryClientProvider>
    );

    expect(screen.getByText("Add Vendor Master")).toBeInTheDocument();
    expect(screen.getByText("Vendor Name")).toBeInTheDocument();
    expect(screen.getByText("Contact Person")).toBeInTheDocument();
    expect(screen.getByText("Supplier Classification")).toBeInTheDocument();
    expect(screen.getByText("Payment Terms")).toBeInTheDocument();
  });
});
