import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import DataGridRow from "@/components/dashboard/DataGrid/DataGridRow";
import type { GridAccountDto } from "@/types";

// Mock useAccountActions hook
vi.mock("@/hooks/useAccountActions", () => ({
  useAccountActions: () => ({
    handleEditAccount: vi.fn(),
    handleArchiveAccount: vi.fn(),
    handleRestoreAccount: vi.fn(),
    handleDeleteAccount: vi.fn(),
  }),
}));

// Mock DataGridCell to inspect props
vi.mock("@/components/dashboard/DataGrid/DataGridCell", () => ({
  default: vi.fn(({ value, isSameAsPrevious, date }) => (
    <div data-testid={`cell-${date}`} data-same-as-previous={isSameAsPrevious}>
      {value !== null ? value : "—"}
    </div>
  )),
}));

describe("DataGridRow", () => {
  const mockOnCellClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isSameAsPrevious calculation", () => {
    it("sets isSameAsPrevious=false for first column", () => {
      const account: GridAccountDto = {
        id: "acc-1",
        name: "Bank Account",
        type: "cash_asset",
        archived_at: null,
        entries: {
          "2024-01-01": { value: 1000, cash_flow: null, gain_loss: null },
        },
      };

      render(<DataGridRow account={account} dates={["2024-01-01"]} onCellClick={mockOnCellClick} />);

      const cell = screen.getByTestId("cell-2024-01-01");
      expect(cell).toHaveAttribute("data-same-as-previous", "false");
    });

    it("sets isSameAsPrevious=true when values are equal", () => {
      const account: GridAccountDto = {
        id: "acc-1",
        name: "Bank Account",
        type: "cash_asset",
        archived_at: null,
        entries: {
          "2024-01-01": { value: 1000, cash_flow: null, gain_loss: null },
          "2024-02-01": { value: 1000, cash_flow: null, gain_loss: null },
        },
      };

      render(<DataGridRow account={account} dates={["2024-01-01", "2024-02-01"]} onCellClick={mockOnCellClick} />);

      const firstCell = screen.getByTestId("cell-2024-01-01");
      const secondCell = screen.getByTestId("cell-2024-02-01");

      expect(firstCell).toHaveAttribute("data-same-as-previous", "false");
      expect(secondCell).toHaveAttribute("data-same-as-previous", "true");
    });

    it("sets isSameAsPrevious=false when values are different", () => {
      const account: GridAccountDto = {
        id: "acc-1",
        name: "Bank Account",
        type: "cash_asset",
        archived_at: null,
        entries: {
          "2024-01-01": { value: 1000, cash_flow: null, gain_loss: null },
          "2024-02-01": { value: 2000, cash_flow: null, gain_loss: null },
        },
      };

      render(<DataGridRow account={account} dates={["2024-01-01", "2024-02-01"]} onCellClick={mockOnCellClick} />);

      const secondCell = screen.getByTestId("cell-2024-02-01");
      expect(secondCell).toHaveAttribute("data-same-as-previous", "false");
    });

    it("sets isSameAsPrevious=false when current value is null", () => {
      const account: GridAccountDto = {
        id: "acc-1",
        name: "Bank Account",
        type: "cash_asset",
        archived_at: null,
        entries: {
          "2024-01-01": { value: 1000, cash_flow: null, gain_loss: null },
        },
      };

      render(<DataGridRow account={account} dates={["2024-01-01", "2024-02-01"]} onCellClick={mockOnCellClick} />);

      const secondCell = screen.getByTestId("cell-2024-02-01");
      expect(secondCell).toHaveAttribute("data-same-as-previous", "false");
    });

    it("sets isSameAsPrevious=false when previous value is null", () => {
      const account: GridAccountDto = {
        id: "acc-1",
        name: "Bank Account",
        type: "cash_asset",
        archived_at: null,
        entries: {
          "2024-02-01": { value: 1000, cash_flow: null, gain_loss: null },
        },
      };

      render(<DataGridRow account={account} dates={["2024-01-01", "2024-02-01"]} onCellClick={mockOnCellClick} />);

      const secondCell = screen.getByTestId("cell-2024-02-01");
      expect(secondCell).toHaveAttribute("data-same-as-previous", "false");
    });

    it("handles multiple consecutive same values", () => {
      const account: GridAccountDto = {
        id: "acc-1",
        name: "Bank Account",
        type: "cash_asset",
        archived_at: null,
        entries: {
          "2024-01-01": { value: 1000, cash_flow: null, gain_loss: null },
          "2024-02-01": { value: 1000, cash_flow: null, gain_loss: null },
          "2024-03-01": { value: 1000, cash_flow: null, gain_loss: null },
          "2024-04-01": { value: 2000, cash_flow: null, gain_loss: null },
        },
      };

      render(
        <DataGridRow
          account={account}
          dates={["2024-01-01", "2024-02-01", "2024-03-01", "2024-04-01"]}
          onCellClick={mockOnCellClick}
        />
      );

      expect(screen.getByTestId("cell-2024-01-01")).toHaveAttribute("data-same-as-previous", "false");
      expect(screen.getByTestId("cell-2024-02-01")).toHaveAttribute("data-same-as-previous", "true");
      expect(screen.getByTestId("cell-2024-03-01")).toHaveAttribute("data-same-as-previous", "true");
      expect(screen.getByTestId("cell-2024-04-01")).toHaveAttribute("data-same-as-previous", "false");
    });
  });

  describe("account name rendering", () => {
    it("renders account name", () => {
      const account: GridAccountDto = {
        id: "acc-1",
        name: "My Savings",
        type: "cash_asset",
        archived_at: null,
        entries: {},
      };

      render(<DataGridRow account={account} dates={[]} onCellClick={mockOnCellClick} />);

      expect(screen.getByText("My Savings")).toBeInTheDocument();
    });

    it("renders 'Aktywo' label for asset types", () => {
      const account: GridAccountDto = {
        id: "acc-1",
        name: "Investment",
        type: "investment_asset",
        archived_at: null,
        entries: {},
      };

      render(<DataGridRow account={account} dates={[]} onCellClick={mockOnCellClick} />);

      expect(screen.getByText("Aktywo")).toBeInTheDocument();
    });

    it("renders 'Pasywo' label for liability types", () => {
      const account: GridAccountDto = {
        id: "acc-1",
        name: "Mortgage",
        type: "liability",
        archived_at: null,
        entries: {},
      };

      render(<DataGridRow account={account} dates={[]} onCellClick={mockOnCellClick} />);

      expect(screen.getByText("Pasywo")).toBeInTheDocument();
    });
  });
});
