import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useRoleStore } from "../store/roleStore";
import { Can } from "../components/Can";

describe("Can Component", () => {
  beforeEach(() => {
    useRoleStore.getState().setRoleContext(
      { id: "r-1", name: "Waiter", code: "WAITER", description: "", is_system: true },
      [],
      ["orders.create", "tables.view"]
    );
  });

  it("renders children when permission is present", () => {
    render(
      <Can permission="orders.create" fallback={<div>Access Denied</div>}>
        <div>Create Order Action</div>
      </Can>
    );

    expect(screen.getByText("Create Order Action")).toBeInTheDocument();
    expect(screen.queryByText("Access Denied")).not.toBeInTheDocument();
  });

  it("renders fallback when permission is missing", () => {
    render(
      <Can permission="billing.refund" fallback={<div>Refund Unauthorized</div>}>
        <div>Process Refund</div>
      </Can>
    );

    expect(screen.getByText("Refund Unauthorized")).toBeInTheDocument();
    expect(screen.queryByText("Process Refund")).not.toBeInTheDocument();
  });
});
