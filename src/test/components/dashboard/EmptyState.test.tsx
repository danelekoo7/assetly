import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EmptyState from "@/components/dashboard/EmptyState";
import { useDashboardStore } from "@/lib/stores/useDashboardStore";

// Mock the store
vi.mock("@/lib/stores/useDashboardStore");

interface MockDashboardStore {
  openModal: ReturnType<typeof vi.fn>;
}

describe("EmptyState", () => {
  const mockOpenModal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    const mockStoreState: MockDashboardStore = {
      openModal: mockOpenModal,
    };
    vi.mocked(useDashboardStore).mockReturnValue(mockStoreState as ReturnType<typeof useDashboardStore>);
  });

  it("renders welcome message and description", () => {
    render(<EmptyState />);

    expect(screen.getByText("Witaj w Assetly!")).toBeInTheDocument();
    expect(screen.getByText(/Zacznij śledzić swoją wartość netto/i)).toBeInTheDocument();
    expect(screen.getByText(/Dodaj swoje aktywa/i)).toBeInTheDocument();
  });

  it("renders CTA button with correct text and icon", () => {
    render(<EmptyState />);

    const button = screen.getByRole("button", { name: /Dodaj swoje pierwsze konto/i });
    expect(button).toBeInTheDocument();
  });

  it("opens addAccount modal when CTA button is clicked", async () => {
    const user = userEvent.setup();
    render(<EmptyState />);

    const button = screen.getByRole("button", { name: /Dodaj swoje pierwsze konto/i });
    await user.click(button);

    expect(mockOpenModal).toHaveBeenCalledWith("addAccount");
    expect(mockOpenModal).toHaveBeenCalledTimes(1);
  });
});
