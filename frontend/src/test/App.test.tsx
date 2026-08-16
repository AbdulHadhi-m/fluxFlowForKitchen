import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../app/App";

describe("Frontend Application Shell", () => {
  it("renders the login landing screen when unauthenticated", async () => {
    render(<App />);
    expect(await screen.findByText("Staff Sign In")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("name@restaurant.com")).toBeInTheDocument();
  });
});
