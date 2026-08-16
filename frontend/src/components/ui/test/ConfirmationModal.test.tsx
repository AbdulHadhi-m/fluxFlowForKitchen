import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmationModal } from "../../ui/confirmation-modal";

describe("ConfirmationModal Component", () => {
  it("renders modal and handles confirm and cancel callbacks", () => {
    const handleConfirm = vi.fn();
    const handleClose = vi.fn();

    render(
      <ConfirmationModal
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Void Order"
        description="Are you sure you want to void order ORD-123?"
        confirmLabel="Void Order"
      />
    );

    expect(screen.getByRole("heading", { name: "Void Order" })).toBeInTheDocument();
    expect(screen.getByText("Are you sure you want to void order ORD-123?")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancel"));
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Void Order" }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });
});
