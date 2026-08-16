import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRoleStore } from "../store/roleStore";
import { usePermission, useHasAnyPermission, useHasAllPermissions } from "../hooks/usePermission";

describe("usePermission hooks", () => {
  beforeEach(() => {
    useRoleStore.getState().setRoleContext(
      { id: "r-1", name: "Waiter", code: "WAITER", description: "", is_system: true },
      [],
      ["orders.create", "orders.view", "tables.view"]
    );
  });

  it("evaluates single permission correctly", () => {
    const { result: hasCreate } = renderHook(() => usePermission("orders.create"));
    expect(hasCreate.current).toBe(true);

    const { result: hasRefund } = renderHook(() => usePermission("billing.refund"));
    expect(hasRefund.current).toBe(false);
  });

  it("evaluates any permission correctly", () => {
    const { result: hasAnyValid } = renderHook(() =>
      useHasAnyPermission(["billing.refund", "orders.create"])
    );
    expect(hasAnyValid.current).toBe(true);

    const { result: hasAnyInvalid } = renderHook(() =>
      useHasAnyPermission(["billing.refund", "inventory.manage"])
    );
    expect(hasAnyInvalid.current).toBe(false);
  });

  it("evaluates all permissions correctly", () => {
    const { result: hasAllValid } = renderHook(() =>
      useHasAllPermissions(["orders.create", "tables.view"])
    );
    expect(hasAllValid.current).toBe(true);

    const { result: hasAllInvalid } = renderHook(() =>
      useHasAllPermissions(["orders.create", "billing.refund"])
    );
    expect(hasAllInvalid.current).toBe(false);
  });
});
