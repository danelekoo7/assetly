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
      const result = ValueEntryService.calculateCashFlowAndGainLoss(500, 1000, "liability");

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

    // =============================================================================================
    // EXTENDED TESTS FOR LIABILITY WITH NEGATIVE MULTIPLIER
    // =============================================================================================

    describe("liability account with multiplier logic", () => {
      it("should calculate cash_flow with negative multiplier for liability when only value provided", () => {
        // Given: previousValue = 1000, value = 1200, type = 'liability'
        // Liability increase of 200 means cash_flow = -200 (negative because debt increased)
        const result = ValueEntryService.calculateCashFlowAndGainLoss(1200, 1000, "liability");

        expect(result.cash_flow).toBe(-200);
        expect(result.gain_loss).toBe(0);
      });

      it("should apply multiplier correctly when cash_flow provided for liability", () => {
        // Given: previousValue = 1000, value = 1300, cash_flow = 100, type = 'liability'
        // Formula: gain_loss = value - previousValue - (cash_flow * multiplier)
        // For liability multiplier = -1, so: gain_loss = 1300 - 1000 - (100 * -1) = 300 + 100 = 400
        const result = ValueEntryService.calculateCashFlowAndGainLoss(1300, 1000, "liability", 100);

        expect(result.cash_flow).toBe(100);
        expect(result.gain_loss).toBe(400);
      });
    });

    // =============================================================================================
    // EXTENDED TESTS FOR INVESTMENT_ASSET
    // =============================================================================================

    describe("investment_asset account", () => {
      it("should assign change to gain_loss when only value provided", () => {
        // Given: previousValue = 10000, value = 10500, type = 'investment_asset'
        // For investment, change goes to gain_loss
        const result = ValueEntryService.calculateCashFlowAndGainLoss(10500, 10000, "investment_asset");

        expect(result.cash_flow).toBe(0);
        expect(result.gain_loss).toBe(500);
      });

      it("should calculate gain_loss when cash_flow provided", () => {
        // Given: previousValue = 10000, value = 11000, cash_flow = 200
        // Formula: gain_loss = value - previousValue - cash_flow = 11000 - 10000 - 200 = 800
        const result = ValueEntryService.calculateCashFlowAndGainLoss(11000, 10000, "investment_asset", 200);

        expect(result.cash_flow).toBe(200);
        expect(result.gain_loss).toBe(800);
      });
    });

    // =============================================================================================
    // VALIDATION TESTS (SCENARIO 3)
    // =============================================================================================

    describe("validation when all three values provided", () => {
      it("should pass validation when values are consistent", () => {
        // Given: prev = 1000, value = 1300, cf = 200, gl = 100
        // Check: 1000 + 200 + 100 = 1300 ✓
        const result = ValueEntryService.calculateCashFlowAndGainLoss(1300, 1000, "cash_asset", 200, 100);

        expect(result.cash_flow).toBe(200);
        expect(result.gain_loss).toBe(100);
      });

      it("should throw ValidationError when values are inconsistent", () => {
        // Given: prev = 1000, value = 1500, cf = 200, gl = 100
        // Check: 1000 + 200 + 100 = 1300 ≠ 1500 ✗
        expect(() => {
          ValueEntryService.calculateCashFlowAndGainLoss(1500, 1000, "cash_asset", 200, 100);
        }).toThrow(ValidationError);
      });

      it("should allow small floating point tolerance in validation", () => {
        // Given: prev = 1000.00, value = 1300.0001, cf = 200, gl = 100
        // Check: 1000 + 200 + 100 = 1300.0000 (within tolerance of 1300.0001)
        const result = ValueEntryService.calculateCashFlowAndGainLoss(1300.0001, 1000, "cash_asset", 200, 100);

        expect(result.cash_flow).toBe(200);
        expect(result.gain_loss).toBe(100);
      });
    });
  });
});
