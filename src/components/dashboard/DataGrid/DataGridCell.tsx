import { formatCurrency, getAccountRowClasses } from "@/lib/utils";
import type { AccountType } from "@/types";

interface DataGridCellProps {
  accountId: string;
  date: string;
  accountType: AccountType;
  value: number | null;
  onCellClick: (accountId: string, date: string, accountType: AccountType) => void;
}

export default function DataGridCell({ accountId, date, accountType, value, onCellClick }: DataGridCellProps) {
  const handleInteraction = () => {
    onCellClick(accountId, date, accountType);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleInteraction();
    }
  };

  const cellColorClasses = getAccountRowClasses(accountType);

  return (
    <div
      role="gridcell"
      className={`w-[150px] flex-shrink-0 cursor-pointer border-r border-border px-4 py-3 text-right transition-colors hover:opacity-90 last:border-r-0 ${cellColorClasses}`}
      onClick={handleInteraction}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {value !== null ? (
        <span className={value >= 0 ? "text-foreground" : "text-red-600 dark:text-red-400"}>
          {formatCurrency(value)}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </div>
  );
}
