import { describe, it, expect } from "vitest";
import { findLastEntry } from "@/lib/utils/grid-helpers";
import type { GridEntryDto } from "@/types";

describe("grid-helpers", () => {
  describe("findLastEntry", () => {
    it("should return last entry chronologically", () => {
      // Given: entries with multiple dates
      const entries: Record<string, GridEntryDto> = {
        "2024-01-01": { value: 1000, cash_flow: 0, gain_loss: 0 },
        "2024-01-15": { value: 1500, cash_flow: 500, gain_loss: 0 },
        "2024-02-01": { value: 2000, cash_flow: 0, gain_loss: 500 },
      };
      const allDates = ["2024-01-01", "2024-01-15", "2024-02-01"];

      // When: findLastEntry is called
      const result = findLastEntry(entries, allDates);

      // Then: should return the most recent entry
      expect(result).not.toBeNull();
      expect(result?.date).toBe("2024-02-01");
      expect(result?.entry.value).toBe(2000);
    });

    it("should return null if no entries exist", () => {
      // Given: empty entries
      const entries: Record<string, GridEntryDto> = {};
      const allDates = ["2024-01-01", "2024-01-15", "2024-02-01"];

      // When: findLastEntry is called
      const result = findLastEntry(entries, allDates);

      // Then: should return null
      expect(result).toBeNull();
    });

    it("should return null if allDates is empty", () => {
      // Given: entries but no dates
      const entries: Record<string, GridEntryDto> = {
        "2024-01-01": { value: 1000, cash_flow: 0, gain_loss: 0 },
      };
      const allDates: string[] = [];

      // When: findLastEntry is called
      const result = findLastEntry(entries, allDates);

      // Then: should return null
      expect(result).toBeNull();
    });

    it("should skip dates without entries and find the last available entry", () => {
      // Given: sparse entries (not all dates have entries)
      const entries: Record<string, GridEntryDto> = {
        "2024-01-01": { value: 1000, cash_flow: 0, gain_loss: 0 },
        "2024-01-15": { value: 1500, cash_flow: 500, gain_loss: 0 },
        // Missing entry for 2024-02-01
        // Missing entry for 2024-02-15
      };
      const allDates = ["2024-01-01", "2024-01-15", "2024-02-01", "2024-02-15"];

      // When: findLastEntry is called
      const result = findLastEntry(entries, allDates);

      // Then: should return the last entry that exists (2024-01-15)
      expect(result).not.toBeNull();
      expect(result?.date).toBe("2024-01-15");
      expect(result?.entry.value).toBe(1500);
    });

    it("should return the only entry when there is just one", () => {
      // Given: single entry
      const entries: Record<string, GridEntryDto> = {
        "2024-01-01": { value: 1000, cash_flow: 0, gain_loss: 0 },
      };
      const allDates = ["2024-01-01"];

      // When: findLastEntry is called
      const result = findLastEntry(entries, allDates);

      // Then: should return that single entry
      expect(result).not.toBeNull();
      expect(result?.date).toBe("2024-01-01");
      expect(result?.entry.value).toBe(1000);
    });

    it("should handle entries with different dates than allDates", () => {
      // Given: entries with dates not in allDates
      const entries: Record<string, GridEntryDto> = {
        "2023-12-01": { value: 500, cash_flow: 0, gain_loss: 0 },
        "2024-01-01": { value: 1000, cash_flow: 0, gain_loss: 0 },
      };
      const allDates = ["2024-01-01", "2024-01-15", "2024-02-01"];

      // When: findLastEntry is called
      const result = findLastEntry(entries, allDates);

      // Then: should return the entry that matches allDates
      expect(result).not.toBeNull();
      expect(result?.date).toBe("2024-01-01");
      expect(result?.entry.value).toBe(1000);
    });

    it("should preserve entry structure with all properties", () => {
      // Given: entry with specific values
      const entries: Record<string, GridEntryDto> = {
        "2024-01-01": { value: 1234.56, cash_flow: 100.5, gain_loss: -50.25 },
      };
      const allDates = ["2024-01-01"];

      // When: findLastEntry is called
      const result = findLastEntry(entries, allDates);

      // Then: should preserve all properties
      expect(result).not.toBeNull();
      expect(result?.entry.value).toBe(1234.56);
      expect(result?.entry.cash_flow).toBe(100.5);
      expect(result?.entry.gain_loss).toBe(-50.25);
    });
  });
});
