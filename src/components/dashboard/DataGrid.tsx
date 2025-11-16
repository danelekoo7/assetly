import { useEffect, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { toast } from "sonner";
import { useDashboardStore } from "@/lib/stores/useDashboardStore";
import type { GridDataDto, AccountType } from "@/types";
import DataGridHeader from "./DataGrid/DataGridHeader";
import DataGridSummaryRow from "./DataGrid/DataGridSummaryRow";
import SortableDataGridRow from "./DataGrid/SortableDataGridRow";

interface DataGridProps {
  gridData: GridDataDto | null;
}

export default function DataGrid({ gridData }: DataGridProps) {
  const { openModal, updateGridDataOptimistic, getFilteredAccounts } = useDashboardStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const accounts = getFilteredAccounts();

  // Auto-scroll to the right (newest dates) on mount and when data changes
  useEffect(() => {
    if (gridData && scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [gridData]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = accounts.findIndex((acc) => acc.id === active.id);
      const newIndex = accounts.findIndex((acc) => acc.id === over.id);

      const newAccountsOrder = arrayMove(accounts, oldIndex, newIndex);

      // Optimistic update in Zustand store
      if (gridData) {
        updateGridDataOptimistic({ ...gridData, accounts: newAccountsOrder });
      }

      // Call API to save the new order
      try {
        const response = await fetch("/api/accounts/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountIds: newAccountsOrder.map((acc) => acc.id) }),
        });

        if (!response.ok) {
          // Revert on failure
          await response.text();
          if (gridData) {
            updateGridDataOptimistic({ ...gridData, accounts: gridData.accounts });
          }
          toast.error("Nie udało się zapisać nowej kolejności kont.");
        }
      } catch {
        // Revert on error
        if (gridData) {
          updateGridDataOptimistic({ ...gridData, accounts: gridData.accounts });
        }
        toast.error("Wystąpił błąd podczas zmiany kolejności kont.");
      }
    }
  };

  const handleCellClick = (accountId: string, date: string, accountType: AccountType) => {
    if (!gridData) return;

    const account = gridData.accounts.find((acc) => acc.id === accountId);
    if (!account) return;

    const dateIndex = gridData.dates.indexOf(date);
    let previousValue = 0;

    if (dateIndex > 0) {
      const previousDate = gridData.dates[dateIndex - 1];
      previousValue = account.entries[previousDate]?.value ?? 0;
    }

    openModal("editValue", {
      accountId,
      date,
      accountType,
      previousValue,
    });
  };

  if (!gridData || gridData.accounts.length === 0) {
    // This case should not be reached if IntegratedDashboardPage handles the empty state,
    // but it's a good fallback.
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
      <div
        role="grid"
        className="inline-block min-w-full divide-y divide-border bg-card"
        aria-label="Siatka danych finansowych"
      >
        <DataGridHeader dates={gridData.dates} />
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={accounts.map((acc) => acc.id)} strategy={verticalListSortingStrategy}>
            {accounts.map((account) => (
              <SortableDataGridRow
                key={account.id}
                account={account}
                dates={gridData.dates}
                onCellClick={handleCellClick}
              />
            ))}
          </SortableContext>
        </DndContext>
        <DataGridSummaryRow gridData={gridData} />
      </div>
    </div>
  );
}
