import { formatCurrency, getAccountRowClasses } from "@/lib/utils";
import type { AccountType } from "@/types";

interface DataGridCellProps {
  accountId: string;
  date: string;
  accountType: AccountType;
  value: number | null;
  isSameAsPrevious?: boolean;
  onCellClick: (accountId: string, date: string, accountType: AccountType) => void;
}

export default function DataGridCell({
  accountId,
  date,
  accountType,
  value,
  isSameAsPrevious,
  onCellClick,
}: DataGridCellProps) {
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
  const sameValueClasses = isSameAsPrevious ? "border-l-4 border-l-amber-400" : "";

  return (
    <div
      role="gridcell"
      className={`w-[25vw] md:w-[150px] flex-shrink-0 cursor-pointer border-r border-border px-4 py-3 text-right transition-colors hover:opacity-90 ${cellColorClasses} ${sameValueClasses}`}
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
