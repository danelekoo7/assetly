import { formatDate } from "@/lib/utils";

interface DataGridHeaderProps {
  dates: string[];
}

export default function DataGridHeader({ dates }: DataGridHeaderProps) {
  return (
    <div
      role="row"
      className="sticky top-0 z-20 grid grid-cols-[250px_repeat(auto-fit,_minmax(150px,_1fr))] gap-0 bg-muted/50 backdrop-blur supports-[backdrop-filter]:bg-muted/50"
    >
      <div
        role="columnheader"
        className="sticky left-0 z-30 border-r border-border bg-muted/50 px-4 py-3 text-left text-sm font-semibold text-foreground backdrop-blur supports-[backdrop-filter]:bg-muted/50"
      >
        Konto
      </div>
      {dates.map((date) => (
        <div
          key={date}
          role="columnheader"
          className="border-r border-border px-4 py-3 text-right text-sm font-semibold text-foreground last:border-r-0"
        >
          {formatDate(date)}
        </div>
      ))}
    </div>
  );
}
