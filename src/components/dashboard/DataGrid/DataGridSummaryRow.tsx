import { formatCurrency } from "@/lib/utils";
import type { GridDataDto } from "@/types";

interface DataGridSummaryRowProps {
  gridData: GridDataDto;
}

export default function DataGridSummaryRow({ gridData }: DataGridSummaryRowProps) {
  return (
    <div
      role="row"
      className="sticky bottom-0 z-20 grid grid-cols-[250px_repeat(auto-fit,_minmax(150px,_1fr))] gap-0 border-t-2 border-border bg-muted/80 backdrop-blur supports-[backdrop-filter]:bg-muted/80"
    >
      <div
        role="gridcell"
        className="sticky left-0 z-30 border-r border-border bg-muted/80 px-4 py-3 text-left font-bold text-foreground backdrop-blur supports-[backdrop-filter]:bg-muted/80"
      >
        Wartość netto
      </div>
      {gridData.dates.map((date) => {
        const summary = gridData.summary[date];
        const netWorth = summary?.net_worth ?? 0;

        return (
          <div
            key={date}
            role="gridcell"
            className="border-r border-border px-4 py-3 text-right font-bold last:border-r-0"
          >
            <span className={netWorth >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
              {formatCurrency(netWorth)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
