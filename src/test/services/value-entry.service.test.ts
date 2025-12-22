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

    // =============================================================================================
    // SCENARIO 2B: ONLY GAIN_LOSS PROVIDED (calculate cash_flow)
    // =============================================================================================

    describe("Scenario 2b: calculate cash_flow when only gain_loss provided", () => {
      it("should calculate cash_flow for cash_asset when only gain_loss provided", () => {
        // Given: previousValue = 5006, value = 4500, gain_loss = 100
        // Formula: cash_flow = (value - previousValue - gain_loss) * cfMultiplier
        // For cash_asset cfMultiplier = 1: cash_flow = (4500 - 5006 - 100) * 1 = -606
        const result = ValueEntryService.calculateCashFlowAndGainLoss(4500, 5006, "cash_asset", null, 100);

        expect(result.cash_flow).toBe(-606);
        expect(result.gain_loss).toBe(100);
      });

      it("should calculate cash_flow for cash_asset with positive gain_loss", () => {
        // Given: previousValue = 1000, value = 1500, gain_loss = 200
        // cash_flow = (1500 - 1000 - 200) * 1 = 300
        const result = ValueEntryService.calculateCashFlowAndGainLoss(1500, 1000, "cash_asset", null, 200);

        expect(result.cash_flow).toBe(300);
        expect(result.gain_loss).toBe(200);
      });

      it("should calculate cash_flow for cash_asset with negative gain_loss (loss)", () => {
        // Given: previousValue = 1000, value = 800, gain_loss = -100
        // cash_flow = (800 - 1000 - (-100)) * 1 = -100
        const result = ValueEntryService.calculateCashFlowAndGainLoss(800, 1000, "cash_asset", null, -100);

        expect(result.cash_flow).toBe(-100);
        expect(result.gain_loss).toBe(-100);
      });

      it("should calculate cash_flow for liability when only gain_loss provided", () => {
        // Given: previousValue = 1000, value = 1300, gain_loss = 100
        // Formula: cash_flow = (value - previousValue - gain_loss) * cfMultiplier
        // For liability cfMultiplier = -1: cash_flow = (1300 - 1000 - 100) * -1 = -200
        const result = ValueEntryService.calculateCashFlowAndGainLoss(1300, 1000, "liability", null, 100);

        expect(result.cash_flow).toBe(-200);
        expect(result.gain_loss).toBe(100);
      });

      it("should calculate cash_flow for investment_asset when only gain_loss provided", () => {
        // Given: previousValue = 10000, value = 11000, gain_loss = 500
        // Formula: cash_flow = (value - previousValue - gain_loss) * cfMultiplier
        // For investment_asset cfMultiplier = 1: cash_flow = (11000 - 10000 - 500) * 1 = 500
        const result = ValueEntryService.calculateCashFlowAndGainLoss(11000, 10000, "investment_asset", null, 500);

        expect(result.cash_flow).toBe(500);
        expect(result.gain_loss).toBe(500);
      });

      it("should handle zero gain_loss", () => {
        // Given: previousValue = 1000, value = 1200, gain_loss = 0
        // cash_flow = (1200 - 1000 - 0) * 1 = 200
        const result = ValueEntryService.calculateCashFlowAndGainLoss(1200, 1000, "cash_asset", null, 0);

        expect(result.cash_flow).toBe(200);
        expect(result.gain_loss).toBe(0);
      });

      it("should distinguish between null and 0 for gain_loss", () => {
        // With gain_loss = null, it should go to Scenario 1 (auto-calculate based on account type)
        const resultWithNull = ValueEntryService.calculateCashFlowAndGainLoss(1200, 1000, "cash_asset", null, null);
        expect(resultWithNull.cash_flow).toBe(200);
        expect(resultWithNull.gain_loss).toBe(0);

        // With gain_loss = 0, it should go to Scenario 2b (use provided gain_loss)
        const resultWithZero = ValueEntryService.calculateCashFlowAndGainLoss(1200, 1000, "cash_asset", null, 0);
        expect(resultWithZero.cash_flow).toBe(200);
        expect(resultWithZero.gain_loss).toBe(0);

        // Both should give same result in this case, but the code path is different
      });
    });

    // =============================================================================================
    // SCENARIO FROM BUG REPORT
    // =============================================================================================
    it("should correctly calculate gain_loss when updating an existing entry based on the chronologically previous entry", () => {
      // This test simulates the bug report scenario:
      // 1. Entry on 10.11 with value 500
      // 2. Entry on 15.11 with value 600
      // 3. User edits the 15.11 entry to 800
      // The calculation should be based on the 500 from 10.11, not the 600 from 15.11's previous state.

      // Arrange
      const previousValueFromChronologicallyEarlierEntry = 500; // This is the value from 10.11
      const newValueForExistingEntry = 800; // User updates the value to 800
      const accountType = "investment_asset";

      // Act
      // We simulate the service's behavior. The service correctly fetches the previous value (500).
      // We are testing the calculation logic that receives this correctly fetched value.
      const result = ValueEntryService.calculateCashFlowAndGainLoss(
        newValueForExistingEntry,
        previousValueFromChronologicallyEarlierEntry,
        accountType,
        null, // User did not manually enter cash_flow
        null // User did not manually enter gain_loss
      );

      // Assert
      // For an investment asset, the change should be reflected in gain_loss.
      // Expected gain_loss = 800 (new value) - 500 (previous entry's value) = 300
      expect(result.cash_flow).toBe(0);
      expect(result.gain_loss).toBe(300);
    });
  });
});
