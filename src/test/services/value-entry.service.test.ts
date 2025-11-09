import { describe, it, expect } from "vitest";

import ValueEntryService from "@/lib/services/value-entry.service";
import { ValidationError } from "@/lib/errors";

describe("ValueEntryService", () => {
  describe("calculateCashFlowAndGainLoss", () => {
    it("should calculate cash_flow for cash_asset when only value provided", () => {
      const result = ValueEntryService.calculateCashFlowAndGainLoss(1500, 1000, "cash_asset");

      expect(result.cash_flow).toBe(500);
      expect(result.gain_loss).toBe(0);
    });

    it("should calculate cash_flow for liability when only value provided", () => {
      const result = ValueEntryService.calculateCashFlowAndGainLoss(1500, 1000, "liability");

      expect(result.cash_flow).toBe(500);
      expect(result.gain_loss).toBe(0);
    });

    it("should calculate gain_loss for investment_asset when only value provided", () => {
      const result = ValueEntryService.calculateCashFlowAndGainLoss(1500, 1000, "investment_asset");

      expect(result.cash_flow).toBe(0);
      expect(result.gain_loss).toBe(500);
    });

    it("should calculate gain_loss when value and cash_flow provided", () => {
      const result = ValueEntryService.calculateCashFlowAndGainLoss(1700, 1000, "investment_asset", 500);

      expect(result.cash_flow).toBe(500);
      expect(result.gain_loss).toBe(200);
    });

    it("should accept all three values when data is consistent", () => {
      const result = ValueEntryService.calculateCashFlowAndGainLoss(1700, 1000, "investment_asset", 500, 200);

      expect(result.cash_flow).toBe(500);
      expect(result.gain_loss).toBe(200);
    });

    it("should throw ValidationError when all three values provided but inconsistent", () => {
      expect(() => {
        ValueEntryService.calculateCashFlowAndGainLoss(
          1700,
          1000,
          "investment_asset",
          500,
          300 // Inconsistent: 1000 + 500 + 300 = 1800 ≠ 1700
        );
      }).toThrow(ValidationError);
    });

    it("should handle negative cash_flow (withdrawal)", () => {
      const result = ValueEntryService.calculateCashFlowAndGainLoss(500, 1000, "cash_asset");

      expect(result.cash_flow).toBe(-500);
      expect(result.gain_loss).toBe(0);
    });

    it("should handle negative gain_loss (investment loss)", () => {
      const result = ValueEntryService.calculateCashFlowAndGainLoss(800, 1000, "investment_asset");

      expect(result.cash_flow).toBe(0);
      expect(result.gain_loss).toBe(-200);
    });

    it("should handle floating point precision with tolerance", () => {
      // 1000 + 500.1234 + 199.8766 = 1700.0000
      const result = ValueEntryService.calculateCashFlowAndGainLoss(1700, 1000, "investment_asset", 500.1234, 199.8766);

      expect(result.cash_flow).toBe(500.1234);
      expect(result.gain_loss).toBe(199.8766);
    });
  });
});
