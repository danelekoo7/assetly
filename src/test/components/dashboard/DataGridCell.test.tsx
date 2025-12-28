import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DataGridCell from "@/components/dashboard/DataGrid/DataGridCell";

describe("DataGridCell", () => {
  const defaultProps = {
    accountId: "acc-1",
    date: "2024-01-15",
    accountType: "cash_asset" as const,
    value: 1000,
    onCellClick: vi.fn(),
  };

  describe("value rendering", () => {
    it("renders formatted currency value", () => {
      render(<DataGridCell {...defaultProps} value={1234.56} />);

      expect(screen.getByText(/1\s*234,56\s*zł/)).toBeInTheDocument();
    });

    it("renders em-dash for null value", () => {
      render(<DataGridCell {...defaultProps} value={null} />);

      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("renders negative value with red color", () => {
      render(<DataGridCell {...defaultProps} value={-500} />);

      const valueElement = screen.getByText(/-500,00\s*zł/);
      expect(valueElement).toHaveClass("text-red-600");
    });

    it("renders positive value with foreground color", () => {
      render(<DataGridCell {...defaultProps} value={500} />);

      const valueElement = screen.getByText(/500,00\s*zł/);
      expect(valueElement).toHaveClass("text-foreground");
    });
  });

  describe("isSameAsPrevious styling", () => {
    it("adds amber border when isSameAsPrevious is true", () => {
      render(<DataGridCell {...defaultProps} isSameAsPrevious={true} />);

      const cell = screen.getByRole("gridcell");
      expect(cell).toHaveClass("border-l-4");
      expect(cell).toHaveClass("border-l-amber-400");
    });

    it("does not add amber border when isSameAsPrevious is false", () => {
      render(<DataGridCell {...defaultProps} isSameAsPrevious={false} />);

      const cell = screen.getByRole("gridcell");
      expect(cell).not.toHaveClass("border-l-4");
      expect(cell).not.toHaveClass("border-l-amber-400");
    });

    it("does not add amber border when isSameAsPrevious is undefined", () => {
      render(<DataGridCell {...defaultProps} />);

      const cell = screen.getByRole("gridcell");
      expect(cell).not.toHaveClass("border-l-4");
      expect(cell).not.toHaveClass("border-l-amber-400");
    });
  });

  describe("interactions", () => {
    it("calls onCellClick when clicked", async () => {
      const onCellClick = vi.fn();
      const user = userEvent.setup();

      render(<DataGridCell {...defaultProps} onCellClick={onCellClick} />);

      const cell = screen.getByRole("gridcell");
      await user.click(cell);

      expect(onCellClick).toHaveBeenCalledWith("acc-1", "2024-01-15", "cash_asset");
      expect(onCellClick).toHaveBeenCalledTimes(1);
    });

    it("calls onCellClick when Enter is pressed", async () => {
      const onCellClick = vi.fn();
      const user = userEvent.setup();

      render(<DataGridCell {...defaultProps} onCellClick={onCellClick} />);

      const cell = screen.getByRole("gridcell");
      cell.focus();
      await user.keyboard("{Enter}");

      expect(onCellClick).toHaveBeenCalledWith("acc-1", "2024-01-15", "cash_asset");
    });

    it("calls onCellClick when Space is pressed", async () => {
      const onCellClick = vi.fn();
      const user = userEvent.setup();

      render(<DataGridCell {...defaultProps} onCellClick={onCellClick} />);

      const cell = screen.getByRole("gridcell");
      cell.focus();
      await user.keyboard(" ");

      expect(onCellClick).toHaveBeenCalledWith("acc-1", "2024-01-15", "cash_asset");
    });
  });
});
