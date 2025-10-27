import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardToolbar from "@/components/dashboard/DashboardToolbar.tsx";
import { useDashboardStore } from "@/lib/stores/useDashboardStore";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

// Mock the store using vi.mock() with a factory pattern at the top level.
// This allows us to control the store's state for each test.
vi.mock("@/lib/stores/useDashboardStore");

// Mock lucide-react icons to avoid rendering actual icon components in tests
vi.mock("lucide-react", () => ({
  Plus: () => <div data-testid="plus-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
}));

// Define a type for the mock store to ensure type safety
interface MockDashboardStore {
  dateRange: { from?: Date; to?: Date };
  showArchived: boolean;
  setDateRange: () => void;
  setShowArchived: () => void;
  openModal: () => void;
}

describe("DashboardToolbar Initial Rendering", () => {
  // Use a variable to hold the mock store's state, which can be configured in each test.
  let mockStoreState: MockDashboardStore;

  beforeEach(() => {
    // Reset the mock state before each test to ensure isolation.
    mockStoreState = {
      dateRange: { from: undefined, to: undefined },
      showArchived: false,
      setDateRange: vi.fn(),
      setShowArchived: vi.fn(),
      openModal: vi.fn(),
    };

    // The component calls the hook without a selector, so we return the whole state.
    (useDashboardStore as unknown as vi.Mock).mockReturnValue(mockStoreState);
  });

  it("should render correctly with default initial state", () => {
    // Arrange: The default state is set in beforeEach.

    // Act
    render(<DashboardToolbar />);

    // Assert
    // Check for the placeholder text when no date range is selected.
    expect(screen.getByText("Wybierz zakres dat")).toBeInTheDocument();

    // Verify that the "Show Archived" switch is not checked.
    const switchInput = screen.getByLabelText("Pokaż zarchiwizowane");
    expect(switchInput).not.toBeChecked();

    // Ensure all action buttons are visible.
    expect(screen.getByRole("button", { name: /Dodaj konto/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dodaj kolumnę/i })).toBeInTheDocument();
  });

  it("should display the formatted date range when it is set in the store", () => {
    // Arrange: Set a specific date range for this test case.
    const fromDate = new Date("2025-10-01T00:00:00.000Z");
    const toDate = new Date("2025-10-31T00:00:00.000Z");
    mockStoreState.dateRange = { from: fromDate, to: toDate };

    // Re-apply the mock return value with the new state
    (useDashboardStore as unknown as vi.Mock).mockReturnValue(mockStoreState);

    // Act
    render(<DashboardToolbar />);

    // Assert
    // Construct the expected formatted string to ensure the assertion is precise.
    const expectedDateString = `${format(fromDate, "PP", { locale: pl })} - ${format(toDate, "PP", { locale: pl })}`;
    expect(screen.getByText(expectedDateString)).toBeInTheDocument();

    // Ensure the placeholder text is no longer visible.
    expect(screen.queryByText("Wybierz zakres dat")).not.toBeInTheDocument();
  });

  it("should show the switch as checked when showArchived is true", () => {
    // Arrange: Set showArchived to true.
    mockStoreState.showArchived = true;

    // Re-apply the mock return value with the new state
    (useDashboardStore as unknown as vi.Mock).mockReturnValue(mockStoreState);

    // Act
    render(<DashboardToolbar />);

    // Assert
    // Find the switch by its accessible label and verify its state.
    const switchInput = screen.getByLabelText("Pokaż zarchiwizowane");
    expect(switchInput).toBeChecked();
  });
});
