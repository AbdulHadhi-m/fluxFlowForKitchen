import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "../store/authStore";

describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it("should initialize in unauthenticated state", () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });

  it("should update state on setAuth", () => {
    const mockUser = {
      id: "u-123",
      email: "test@fluxiflow.com",
      first_name: "Test",
      last_name: "User",
      full_name: "Test User",
      is_active: true,
      is_staff: false,
      last_login: null,
      created_at: new Date().toISOString(),
    };

    useAuthStore.getState().setAuth(mockUser, "mock-access-token");
    const state = useAuthStore.getState();

    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.email).toBe("test@fluxiflow.com");
    expect(state.accessToken).toBe("mock-access-token");
  });

  it("should clear state on clearAuth", () => {
    useAuthStore.getState().clearAuth();
    const state = useAuthStore.getState();

    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });
});
