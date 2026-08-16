import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserPreferencesForm } from "../components/UserPreferencesForm";

describe("UserPreferencesForm Component", () => {
  it("renders display preferences selection controls", () => {
    render(
      <UserPreferencesForm
        initialData={{
          id: "pref-1",
          theme: "DARK",
          time_format: "12H",
          date_format: "DD/MM/YYYY",
          table_density: "COMFORTABLE",
        }}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText("Display & UI Preferences")).toBeInTheDocument();
    expect(screen.getByText("Theme Mode")).toBeInTheDocument();
    expect(screen.getByText("Time Display Format")).toBeInTheDocument();
  });
});
