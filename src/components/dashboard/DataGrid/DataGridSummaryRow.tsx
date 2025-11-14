import { formatCurrency } from "@/lib/utils";
import type { GridDataDto } from "@/types";

interface DataGridSummaryRowProps {
  gridData: GridDataDto;
}

export default function DataGridSummaryRow({ gridData }: DataGridSummaryRowProps) {
  return (
    <div
      role="row"
      className="sticky bottom-0 z-20 flex border-t-2 border-border bg-muted backdrop-blur supports-[backdrop-filter]:bg-muted"
    >
      <div
        role="gridcell"
        className="sticky left-0 z-30 w-[250px] flex-shrink-0 border-r border-border bg-muted px-4 py-3 text-left font-bold text-foreground"
      >
        Wartość netto
      </div>
      <div className="flex">
        {gridData.dates.map((date) => {
          const summary = gridData.summary.by_date[date];
          const netWorth = summary?.net_worth ?? 0;

          return (
            <div
              key={date}
              role="gridcell"
              className="w-[150px] flex-shrink-0 border-r border-border px-4 py-3 text-right font-bold last:border-r-0"
            >
              <span className={netWorth >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                {formatCurrency(netWorth)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
