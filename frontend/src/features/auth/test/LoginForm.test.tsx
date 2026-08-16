import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LoginForm } from "../components/LoginForm";

const queryClient = new QueryClient();

describe("LoginForm Component", () => {
  it("renders login form fields and submit button", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <LoginForm />
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByPlaceholderText("name@restaurant.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign In to Terminal/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Forgot password\?/i })).toBeInTheDocument();
  });
});
