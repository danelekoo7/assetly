import { describe, it, expect } from "vitest";
import { cn, formatCurrency } from "@/lib/utils";

describe("cn", () => {
  it("should merge tailwind classes correctly", () => {
    const result = cn("bg-red-500", "p-4", "bg-blue-500");
    expect(result).toBe("p-4 bg-blue-500");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    const result = cn("p-4", isActive && "bg-green-500");
    expect(result).toBe("p-4 bg-green-500");
  });
});

describe("formatCurrency", () => {
  it("should format four-digit numbers with thousand separator", () => {
    const result = formatCurrency(1234.56);
    // pl-PL uses non-breaking space (U+00A0) as thousand separator
    expect(result).toMatch(/1\s234,56/);
    // Check that it's specifically a non-breaking space
    expect(result).toBe("1\u00A0234,56\u00A0zł");
  });

  it("should format five-digit numbers with thousand separator", () => {
    const result = formatCurrency(12345.67);
    expect(result).toBe("12\u00A0345,67\u00A0zł");
  });

  it("should format six-digit numbers with thousand separator", () => {
    const result = formatCurrency(123456.78);
    expect(result).toBe("123\u00A0456,78\u00A0zł");
  });

  it("should format numbers with exactly 2 decimal places", () => {
    const result = formatCurrency(1234.5);
    expect(result).toBe("1\u00A0234,50\u00A0zł");
  });

  it("should handle negative numbers", () => {
    const result = formatCurrency(-1234.56);
    expect(result).toBe("-1\u00A0234,56\u00A0zł");
  });

  it("should handle zero", () => {
    const result = formatCurrency(0);
    expect(result).toBe("0,00\u00A0zł");
  });
});
