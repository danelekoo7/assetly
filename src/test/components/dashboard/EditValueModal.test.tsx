import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditValueModal from "@/components/dashboard/EditValueModal";
import { useDashboardStore } from "@/lib/stores/useDashboardStore";
import type { GridDataDto } from "@/types";

// Mock the store
vi.mock("@/lib/stores/useDashboardStore");

// Mock date-fns to have predictable date formatting
vi.mock("date-fns", async () => {
  const actual = await vi.importActual("date-fns");
  return {
    ...actual,
    format: (date: Date, formatStr: string) => {
      if (formatStr === "PPP") {
        return "15 stycznia 2024";
      }
      return date.toISOString();
    },
  };
});

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

interface MockDashboardStore {
  activeModals: {
    editValue: {
      accountId: string;
      date: string;
      accountType: string;
      previousValue: number;
    } | null;
  };
  closeModal: ReturnType<typeof vi.fn>;
  updateValueEntry: ReturnType<typeof vi.fn>;
  gridData: GridDataDto | null;
}

describe("EditValueModal - Auto-calculation Logic", () => {
  let mockStoreState: MockDashboardStore;
  const user = userEvent.setup();

  beforeEach(() => {
    // Reset mock state before each test
    mockStoreState = {
      activeModals: {
        editValue: null,
      },
      closeModal: vi.fn(),
      updateValueEntry: vi.fn().mockResolvedValue(undefined),
      gridData: {
        dates: ["2024-01-01", "2024-01-15"],
        accounts: [
          {
            id: "acc1",
            name: "Test Cash Account",
            type: "cash_asset",
            entries: {
              "2024-01-01": {
                value: 1000,
                cash_flow: 0,
                gain_loss: 0,
              },
            },
          },
          {
            id: "acc2",
            name: "Test Investment Account",
            type: "investment_asset",
            entries: {
              "2024-01-01": {
                value: 10000,
                cash_flow: 0,
                gain_loss: 0,
              },
            },
          },
          {
            id: "acc3",
            name: "Test Liability",
            type: "liability",
            entries: {
              "2024-01-01": {
                value: 1000,
                cash_flow: 0,
                gain_loss: 0,
              },
            },
          },
        ],
        summary: {},
      },
    };

    (useDashboardStore as unknown as vi.Mock).mockReturnValue(mockStoreState);
  });

  it("should auto-calculate cash_flow for cash_asset when only value changed", async () => {
    // Arrange: Open modal for cash_asset account
    mockStoreState.activeModals.editValue = {
      accountId: "acc1",
      date: "2024-01-15",
      accountType: "cash_asset",
      previousValue: 1000,
    };
    (useDashboardStore as unknown as vi.Mock).mockReturnValue(mockStoreState);

    // Act
    render(<EditValueModal />);

    // Wait for modal to be visible
    await waitFor(() => {
      expect(screen.getByText("Edytuj wartość")).toBeInTheDocument();
    });

    // User sets value = 1200
    const valueInput = screen.getByLabelText("Nowa wartość *");
    await user.clear(valueInput);
    await user.type(valueInput, "1200");

    // Assert: cash_flow should be auto-calculated to 200, gain_loss to 0
    await waitFor(() => {
      const cashFlowInput = screen.getByLabelText("Wpłata / Wypłata") as HTMLInputElement;
      const gainLossInput = screen.getByLabelText("Zysk / Strata") as HTMLInputElement;

      expect(parseFloat(cashFlowInput.value)).toBe(200);
      expect(parseFloat(gainLossInput.value)).toBe(0);
    });
  });

  it("should auto-calculate gain_loss for investment_asset when only value changed", async () => {
    // Arrange: Open modal for investment_asset account
    mockStoreState.activeModals.editValue = {
      accountId: "acc2",
      date: "2024-01-15",
      accountType: "investment_asset",
      previousValue: 10000,
    };
    (useDashboardStore as unknown as vi.Mock).mockReturnValue(mockStoreState);

    // Act
    render(<EditValueModal />);

    await waitFor(() => {
      expect(screen.getByText("Edytuj wartość")).toBeInTheDocument();
    });

    // User sets value = 10500
    const valueInput = screen.getByLabelText("Nowa wartość *");
    await user.clear(valueInput);
    await user.type(valueInput, "10500");

    // Assert: cash_flow should be 0, gain_loss should be auto-calculated to 500
    await waitFor(() => {
      const cashFlowInput = screen.getByLabelText("Wpłata / Wypłata") as HTMLInputElement;
      const gainLossInput = screen.getByLabelText("Zysk / Strata") as HTMLInputElement;

      expect(parseFloat(cashFlowInput.value)).toBe(0);
      expect(parseFloat(gainLossInput.value)).toBe(500);
    });
  });

  it("should use negative multiplier for liability", async () => {
    // Arrange: Open modal for liability account
    mockStoreState.activeModals.editValue = {
      accountId: "acc3",
      date: "2024-01-15",
      accountType: "liability",
      previousValue: 1000,
    };
    (useDashboardStore as unknown as vi.Mock).mockReturnValue(mockStoreState);

    // Act
    render(<EditValueModal />);

    await waitFor(() => {
      expect(screen.getByText("Edytuj wartość")).toBeInTheDocument();
    });

    // User sets value = 1200 (liability increased by 200)
    const valueInput = screen.getByLabelText("Nowa wartość *");
    await user.clear(valueInput);
    await user.type(valueInput, "1200");

    // Assert: cash_flow should be -200 (negative multiplier), gain_loss = 0
    await waitFor(() => {
      const cashFlowInput = screen.getByLabelText("Wpłata / Wypłata") as HTMLInputElement;
      const gainLossInput = screen.getByLabelText("Zysk / Strata") as HTMLInputElement;

      expect(parseFloat(cashFlowInput.value)).toBe(-200);
      expect(parseFloat(gainLossInput.value)).toBe(0);
    });
  });

  it("should recalculate gain_loss when user manually changes cash_flow", async () => {
    // Arrange: Open modal for cash_asset
    mockStoreState.activeModals.editValue = {
      accountId: "acc1",
      date: "2024-01-15",
      accountType: "cash_asset",
      previousValue: 1000,
    };
    (useDashboardStore as unknown as vi.Mock).mockReturnValue(mockStoreState);

    // Act
    render(<EditValueModal />);

    await waitFor(() => {
      expect(screen.getByText("Edytuj wartość")).toBeInTheDocument();
    });

    // User sets value = 1500
    const valueInput = screen.getByLabelText("Nowa wartość *");
    await user.clear(valueInput);
    await user.type(valueInput, "1500");

    // Wait for initial auto-calculation
    await waitFor(() => {
      const cashFlowInput = screen.getByLabelText("Wpłata / Wypłata") as HTMLInputElement;
      expect(parseFloat(cashFlowInput.value)).toBe(500);
    });

    // User manually changes cash_flow to 300
    const cashFlowInput = screen.getByLabelText("Wpłata / Wypłata");
    await user.clear(cashFlowInput);
    await user.type(cashFlowInput, "300");

    // Assert: gain_loss should recalculate to 200 (1500 - 1000 - 300)
    await waitFor(() => {
      const gainLossInput = screen.getByLabelText("Zysk / Strata") as HTMLInputElement;
      expect(parseFloat(gainLossInput.value)).toBe(200);
    });
  });

  it("should recalculate cash_flow when user manually changes gain_loss", async () => {
    // Arrange: Open modal for cash_asset
    mockStoreState.activeModals.editValue = {
      accountId: "acc1",
      date: "2024-01-15",
      accountType: "cash_asset",
      previousValue: 1000,
    };
    (useDashboardStore as unknown as vi.Mock).mockReturnValue(mockStoreState);

    // Act
    render(<EditValueModal />);

    await waitFor(() => {
      expect(screen.getByText("Edytuj wartość")).toBeInTheDocument();
    });

    // User sets value = 1500
    const valueInput = screen.getByLabelText("Nowa wartość *");
    await user.clear(valueInput);
    await user.type(valueInput, "1500");

    // Wait for initial auto-calculation
    await waitFor(() => {
      const cashFlowInput = screen.getByLabelText("Wpłata / Wypłata") as HTMLInputElement;
      expect(parseFloat(cashFlowInput.value)).toBe(500);
    });

    // User manually changes gain_loss to 200
    const gainLossInput = screen.getByLabelText("Zysk / Strata");
    await user.clear(gainLossInput);
    await user.type(gainLossInput, "200");

    // Assert: cash_flow should recalculate to 300 (1500 - 1000 - 200)
    await waitFor(() => {
      const cashFlowInput = screen.getByLabelText("Wpłata / Wypłata") as HTMLInputElement;
      expect(parseFloat(cashFlowInput.value)).toBe(300);
    });
  });

  it("should track which field was last modified", async () => {
    // Arrange: Open modal
    mockStoreState.activeModals.editValue = {
      accountId: "acc1",
      date: "2024-01-15",
      accountType: "cash_asset",
      previousValue: 1000,
    };
    (useDashboardStore as unknown as vi.Mock).mockReturnValue(mockStoreState);

    // Act
    render(<EditValueModal />);

    await waitFor(() => {
      expect(screen.getByText("Edytuj wartość")).toBeInTheDocument();
    });

    // Change value first
    const valueInput = screen.getByLabelText("Nowa wartość *");
    await user.clear(valueInput);
    await user.type(valueInput, "1500");

    // Wait for auto-calculation
    await waitFor(() => {
      const cashFlowInput = screen.getByLabelText("Wpłata / Wypłata") as HTMLInputElement;
      expect(parseFloat(cashFlowInput.value)).toBe(500);
    });

    // Then manually change cash_flow
    const cashFlowInput = screen.getByLabelText("Wpłata / Wypłata");
    await user.clear(cashFlowInput);
    await user.type(cashFlowInput, "300");

    // Assert: gain_loss should recalculate based on the fact that cash_flow was last modified
    await waitFor(() => {
      const gainLossInput = screen.getByLabelText("Zysk / Strata") as HTMLInputElement;
      expect(parseFloat(gainLossInput.value)).toBe(200);
    });

    // This confirms the component is tracking lastModified correctly
  });
});

describe("EditValueModal - Form Submission", () => {
  let mockStoreState: MockDashboardStore;
  const user = userEvent.setup();

  beforeEach(() => {
    mockStoreState = {
      activeModals: {
        editValue: {
          accountId: "acc1",
          date: "2024-01-15",
          accountType: "cash_asset",
          previousValue: 1000,
        },
      },
      closeModal: vi.fn(),
      updateValueEntry: vi.fn().mockResolvedValue(undefined),
      gridData: {
        dates: ["2024-01-01", "2024-01-15"],
        accounts: [
          {
            id: "acc1",
            name: "Test Account",
            type: "cash_asset",
            entries: {
              "2024-01-01": {
                value: 1000,
                cash_flow: 0,
                gain_loss: 0,
              },
            },
          },
        ],
        summary: {},
      },
    };

    (useDashboardStore as unknown as vi.Mock).mockReturnValue(mockStoreState);
  });

  it("should call updateValueEntry with correct command", async () => {
    // Arrange
    render(<EditValueModal />);

    await waitFor(() => {
      expect(screen.getByText("Edytuj wartość")).toBeInTheDocument();
    });

    // Act: Fill form with value, cash_flow, gain_loss
    const valueInput = screen.getByLabelText("Nowa wartość *");
    await user.clear(valueInput);
    await user.type(valueInput, "1234.56");

    // Wait for auto-calculation
    await waitFor(() => {
      const cashFlowInput = screen.getByLabelText("Wpłata / Wypłata") as HTMLInputElement;
      expect(parseFloat(cashFlowInput.value || "0")).toBeCloseTo(234.56, 1);
    });

    // Click "Zapisz"
    const saveButton = screen.getByRole("button", { name: /Zapisz/i });
    await user.click(saveButton);

    // Assert: updateValueEntry called with correct command
    await waitFor(
      () => {
        expect(mockStoreState.updateValueEntry).toHaveBeenCalled();
        const callArgs = mockStoreState.updateValueEntry.mock.calls[0][0];
        expect(callArgs.account_id).toBe("acc1");
        expect(callArgs.date).toBe("2024-01-15");
        expect(callArgs.value).toBeCloseTo(1234.56, 1);
      },
      { timeout: 3000 }
    );
  });

  it("should show loading state during submission", async () => {
    // Arrange: Make updateValueEntry slow to resolve
    mockStoreState.updateValueEntry = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(resolve, 100);
        })
    );
    (useDashboardStore as unknown as vi.Mock).mockReturnValue(mockStoreState);

    render(<EditValueModal />);

    await waitFor(() => {
      expect(screen.getByText("Edytuj wartość")).toBeInTheDocument();
    });

    // Act: Fill form and submit
    const valueInput = screen.getByLabelText("Nowa wartość *");
    await user.clear(valueInput);
    await user.type(valueInput, "1200");

    const saveButton = screen.getByRole("button", { name: /Zapisz/i });
    await user.click(saveButton);

    // Assert: Button shows "Zapisywanie..." and is disabled
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Zapisywanie.../i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Zapisywanie.../i })).toBeDisabled();
    });
  });

  it("should show error message if submission fails", async () => {
    // Arrange: Make updateValueEntry throw error
    mockStoreState.updateValueEntry = vi.fn().mockRejectedValue(new Error("API Error: Failed to save"));
    (useDashboardStore as unknown as vi.Mock).mockReturnValue(mockStoreState);

    render(<EditValueModal />);

    await waitFor(() => {
      expect(screen.getByText("Edytuj wartość")).toBeInTheDocument();
    });

    // Act: Fill form and submit
    const valueInput = screen.getByLabelText("Nowa wartość *");
    await user.clear(valueInput);
    await user.type(valueInput, "1200");

    const saveButton = screen.getByRole("button", { name: /Zapisz/i });
    await user.click(saveButton);

    // Assert: Error message displayed
    await waitFor(() => {
      expect(screen.getByText(/API Error: Failed to save/i)).toBeInTheDocument();
    });

    // Modal should stay open (not closed)
    expect(screen.getByText("Edytuj wartość")).toBeInTheDocument();
  });

  it("should close modal after successful submission", async () => {
    // Arrange
    render(<EditValueModal />);

    await waitFor(() => {
      expect(screen.getByText("Edytuj wartość")).toBeInTheDocument();
    });

    // Act: Fill form and submit
    const valueInput = screen.getByLabelText("Nowa wartość *");
    await user.clear(valueInput);
    await user.type(valueInput, "1200");

    const saveButton = screen.getByRole("button", { name: /Zapisz/i });
    await user.click(saveButton);

    // Assert: closeModal called after updateValueEntry resolves
    await waitFor(() => {
      expect(mockStoreState.closeModal).toHaveBeenCalledWith("editValue");
    });
  });
});

describe("EditValueModal - Prefilling Data", () => {
  let mockStoreState: MockDashboardStore;

  beforeEach(() => {
    mockStoreState = {
      activeModals: {
        editValue: null,
      },
      closeModal: vi.fn(),
      updateValueEntry: vi.fn().mockResolvedValue(undefined),
      gridData: {
        dates: ["2024-01-01", "2024-01-15"],
        accounts: [
          {
            id: "acc1",
            name: "Test Account",
            type: "cash_asset",
            entries: {
              "2024-01-15": {
                value: 1500,
                cash_flow: 300,
                gain_loss: 200,
              },
            },
          },
        ],
        summary: {},
      },
    };

    (useDashboardStore as unknown as vi.Mock).mockReturnValue(mockStoreState);
  });

  it("should prefill form with existing entry data", async () => {
    // Arrange: Open modal for date with existing entry
    mockStoreState.activeModals.editValue = {
      accountId: "acc1",
      date: "2024-01-15",
      accountType: "cash_asset",
      previousValue: 1000,
    };
    (useDashboardStore as unknown as vi.Mock).mockReturnValue(mockStoreState);

    // Act
    render(<EditValueModal />);

    // Assert: Form fields contain existing values
    await waitFor(() => {
      const valueInput = screen.getByLabelText("Nowa wartość *") as HTMLInputElement;
      const cashFlowInput = screen.getByLabelText("Wpłata / Wypłata") as HTMLInputElement;
      const gainLossInput = screen.getByLabelText("Zysk / Strata") as HTMLInputElement;

      expect(valueInput.value).toBe("1500");
      expect(cashFlowInput.value).toBe("300");
      expect(gainLossInput.value).toBe("200");
    });
  });

  it("should use previousValue if no entry exists", async () => {
    // Arrange: Open modal for date without existing entry
    mockStoreState.activeModals.editValue = {
      accountId: "acc1",
      date: "2024-02-01", // Date that doesn't have an entry
      accountType: "cash_asset",
      previousValue: 1000,
    };
    (useDashboardStore as unknown as vi.Mock).mockReturnValue(mockStoreState);

    // Act
    render(<EditValueModal />);

    // Assert: Value field shows previousValue (1000)
    await waitFor(() => {
      const valueInput = screen.getByLabelText("Nowa wartość *") as HTMLInputElement;
      expect(valueInput.value).toBe("1000");
    });
  });
});
