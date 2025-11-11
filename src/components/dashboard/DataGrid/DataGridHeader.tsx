import { formatDate } from "@/lib/utils";

interface DataGridHeaderProps {
  dates: string[];
}

export default function DataGridHeader({ dates }: DataGridHeaderProps) {
  return (
    <div role="row" className="sticky top-0 z-20 flex bg-muted/50 backdrop-blur supports-[backdrop-filter]:bg-muted/50">
      <div
        role="columnheader"
        className="sticky left-0 z-30 w-[250px] flex-shrink-0 border-r border-border bg-muted px-4 py-3 text-left text-sm font-semibold text-foreground"
      >
        Konto
      </div>
      <div className="flex">
        {dates.map((date) => (
          <div
            key={date}
            role="columnheader"
            className="w-[150px] flex-shrink-0 border-r border-border px-4 py-3 text-right text-sm font-semibold text-foreground last:border-r-0"
          >
            {formatDate(date)}
          </div>
        ))}
      </div>
    </div>
  );
}
