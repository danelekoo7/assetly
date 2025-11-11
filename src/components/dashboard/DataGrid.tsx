import { useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStore } from "@/lib/stores/useDashboardStore";
import type { GridDataDto, AccountType } from "@/types";
import DataGridHeader from "./DataGrid/DataGridHeader";
import DataGridRow from "./DataGrid/DataGridRow";
import DataGridSummaryRow from "./DataGrid/DataGridSummaryRow";

interface DataGridProps {
  gridData: GridDataDto | null;
  isLoading: boolean;
}

export default function DataGrid({ gridData, isLoading }: DataGridProps) {
  const { openModal } = useDashboardStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the right (newest dates) on mount and when data changes
  useEffect(() => {
    if (gridData && scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [gridData]);

  const handleCellClick = (accountId: string, date: string, accountType: AccountType, previousValue: number) => {
    openModal("editValue", {
      accountId,
      date,
      accountType,
      previousValue,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!gridData || gridData.accounts.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Brak kont do wyświetlenia. Dodaj swoje pierwsze konto, aby zacząć śledzić finanse.
        </p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="overflow-x-auto rounded-lg border border-border">
      <div role="grid" className="min-w-full divide-y divide-border bg-card" aria-label="Siatka danych finansowych">
        <DataGridHeader dates={gridData.dates} />

        {gridData.accounts.map((account) => (
          <DataGridRow key={account.id} account={account} dates={gridData.dates} onCellClick={handleCellClick} />
        ))}

        <DataGridSummaryRow gridData={gridData} />
      </div>
    </div>
  );
}
