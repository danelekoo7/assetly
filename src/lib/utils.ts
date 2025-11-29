import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { AccountType } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(value);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

/**
 * Returns background color classes based on account type.
 * Assets get light green background, liabilities get light red background.
 */
export const getAccountRowClasses = (accountType: AccountType): string => {
  if (accountType === "liability") {
    return "bg-red-50 dark:bg-red-950/30";
  }
  // For both investment_asset and cash_asset
  return "bg-green-50 dark:bg-green-950/30";
};
