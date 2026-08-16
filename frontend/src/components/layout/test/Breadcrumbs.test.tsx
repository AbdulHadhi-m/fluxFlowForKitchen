import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Breadcrumbs } from "../Breadcrumbs";
import { MemoryRouter } from "react-router-dom";

describe("Breadcrumbs Component", () => {
  it("renders dashboard root breadcrumb on dashboard route", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Breadcrumbs />
      </MemoryRouter>
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders nested breadcrumb links correctly", () => {
    render(
      <MemoryRouter initialEntries={["/orders/history"]}>
        <Breadcrumbs />
      </MemoryRouter>
    );

    expect(screen.getByText("Orders")).toBeInTheDocument();
    expect(screen.getByText("Order History")).toBeInTheDocument();
  });
});
