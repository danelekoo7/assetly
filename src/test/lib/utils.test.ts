import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

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
