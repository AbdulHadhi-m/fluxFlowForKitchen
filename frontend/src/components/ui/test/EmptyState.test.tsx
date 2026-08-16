import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmptyState } from "../../ui/empty-state";
import { Inbox } from "lucide-react";

describe("EmptyState Component", () => {
  it("renders empty state title, description and triggers action button", () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        icon={Inbox}
        title="No Orders Found"
        description="There are currently no active dining orders."
        actionLabel="Create New Order"
        onAction={handleAction}
      />
    );

    expect(screen.getByText("No Orders Found")).toBeInTheDocument();
    expect(screen.getByText("There are currently no active dining orders.")).toBeInTheDocument();

    const actionBtn = screen.getByText("Create New Order");
    fireEvent.click(actionBtn);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});
