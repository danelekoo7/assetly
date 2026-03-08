import { useCallback, useEffect, useRef } from "react";
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
  const headerRef = useRef<HTMLDivElement>(null);
  const accounts = getFilteredAccounts();

  // Sync header horizontal position with body scroll via CSS transform.
  // This is necessary because the header lives outside the overflow-x:auto
  // scroll container (so that sticky top-[61px] works at page level).
  const handleBodyScroll = useCallback(() => {
    const scrollLeft = scrollRef.current?.scrollLeft ?? 0;
    requestAnimationFrame(() => {
      if (headerRef.current) {
        headerRef.current.style.transform = `translateX(-${scrollLeft}px)`;
      }
    });
  }, []);

  // Auto-scroll to the right (newest dates) on mount and when data changes
  useEffect(() => {
    if (gridData && scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
      // Setting scrollLeft doesn't fire a scroll event, so sync header manually
      handleBodyScroll();
    }
  }, [gridData, handleBodyScroll]);

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
    <div role="grid" aria-label="Siatka danych finansowych" className="rounded-lg border border-border">
      {/*
       * Sticky header wrapper.
       * overflow-x:clip clips visual overflow without creating a scroll container,
       * so position:sticky works relative to the page (not this element).
       * The header content is translated horizontally via JS to stay in sync
       * with the body's scrollLeft.
       */}
      <div role="rowgroup" className="sticky top-[var(--navbar-height)] z-20 [overflow-x:clip]">
        <div ref={headerRef}>
          <DataGridHeader dates={gridData.dates} />
        </div>
      </div>

      {/* Body scroll container — only horizontal scroll here */}
      <div ref={scrollRef} className="overflow-x-auto" onScroll={handleBodyScroll}>
        <div role="rowgroup" className="inline-block min-w-full divide-y divide-border bg-card">
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
    </div>
  );
}
