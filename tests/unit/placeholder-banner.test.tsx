import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlaceholderBanner } from "@/components/placeholder-banner";

describe("PlaceholderBanner", () => {
  it("renders the seed-data message", () => {
    render(<PlaceholderBanner />);
    expect(screen.getByTestId("placeholder-banner")).toBeInTheDocument();
    expect(screen.getByText(/seed data/i)).toBeInTheDocument();
    expect(
      screen.getByText(/replace with real data from the onboarding workbook/i),
    ).toBeInTheDocument();
  });

  it("includes the record label when provided", () => {
    render(<PlaceholderBanner recordLabel="Water View room type" />);
    expect(screen.getByText(/for Water View room type/i)).toBeInTheDocument();
  });
});
