import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DateRangePicker } from "../components/DateRangePicker";

describe("DateRangePicker Component", () => {
  it("renders presets and calls onPresetChange", () => {
    const handlePresetChange = vi.fn();
    render(
      <DateRangePicker
        preset="LAST_7_DAYS"
        onPresetChange={handlePresetChange}
        onCustomRangeChange={vi.fn()}
      />
    );

    expect(screen.getByText("Last 7 Days")).toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Today"));
    expect(handlePresetChange).toHaveBeenCalledWith("TODAY");
  });
});
