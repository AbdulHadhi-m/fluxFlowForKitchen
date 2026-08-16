import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CreateSupplierModal } from "../components/CreateSupplierModal";

describe("CreateSupplierModal Component", () => {
  it("renders CreateSupplierModal fields", () => {
    render(
      <CreateSupplierModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByText("Add Supplier / Vendor")).toBeInTheDocument();
    expect(screen.getByText("Supplier / Vendor Name")).toBeInTheDocument();
    expect(screen.getByText("Contact Person")).toBeInTheDocument();
  });
});
