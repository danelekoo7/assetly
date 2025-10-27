import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Archive, Trash2 } from "lucide-react";
import { useDashboardStore } from "@/lib/stores/useDashboardStore";
import type { GridDataDto, AccountType } from "@/types";

interface DataGridProps {
  gridData: GridDataDto | null;
  isLoading: boolean;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("pl-PL", {
    month: "short",
    year: "numeric",
  });
};

export default function DataGrid({ gridData, isLoading }: DataGridProps) {
  const { openModal } = useDashboardStore();

  const handleCellClick = (accountId: string, date: string, accountType: AccountType, previousValue: number) => {
    openModal("editValue", {
      accountId,
      date,
      accountType,
      previousValue,
    });
  };

  const handleEditAccount = (account: { id: string; name: string; type: AccountType }) => {
    openModal("editAccount", { account });
  };

  const handleArchiveAccount = (accountId: string, accountName: string) => {
    openModal("confirmAction", {
      title: "Archiwizuj konto",
      description: `Czy na pewno chcesz zarchiwizować konto "${accountName}"?`,
      onConfirm: () => {
        // TODO: Implement archive logic
      },
    });
  };

  const handleDeleteAccount = (accountId: string, accountName: string) => {
    openModal("confirmAction", {
      title: "Usuń konto",
      description: `Czy na pewno chcesz usunąć konto "${accountName}"? Ta operacja jest nieodwracalna.`,
      onConfirm: () => {
        // TODO: Implement delete logic
      },
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
    <div className="overflow-x-auto rounded-lg border border-border">
      <div role="grid" className="min-w-full divide-y divide-border bg-card" aria-label="Siatka danych finansowych">
        {/* Header Row */}
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
          {gridData.dates.map((date) => (
            <div
              key={date}
              role="columnheader"
              className="border-r border-border px-4 py-3 text-right text-sm font-semibold text-foreground last:border-r-0"
            >
              {formatDate(date)}
            </div>
          ))}
        </div>

        {/* Account Rows */}
        {gridData.accounts.map((account) => (
          <div
            key={account.id}
            role="row"
            className="grid grid-cols-[250px_repeat(auto-fit,_minmax(150px,_1fr))] gap-0 hover:bg-muted/30"
          >
            {/* Account Name Cell (Sticky) */}
            <div
              role="gridcell"
              className="sticky left-0 z-10 flex items-center justify-between border-r border-border bg-card px-4 py-3"
            >
              <div className="flex-1">
                <div className="font-medium text-foreground">{account.name}</div>
                <div className="text-xs text-muted-foreground">
                  {account.type.includes("asset") ? "Aktywo" : "Pasywo"}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="sr-only">Otwórz menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEditAccount(account)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edytuj
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleArchiveAccount(account.id, account.name)}>
                    <Archive className="mr-2 h-4 w-4" />
                    Archiwizuj
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDeleteAccount(account.id, account.name)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Usuń
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Value Cells */}
            {gridData.dates.map((date) => {
              const entry = account.entries[date];
              const value = entry?.value ?? null;

              return (
                <div
                  key={date}
                  role="gridcell"
                  className="cursor-pointer border-r border-border px-4 py-3 text-right transition-colors hover:bg-accent last:border-r-0"
                  onClick={() => handleCellClick(account.id, date, account.type, value ?? 0)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleCellClick(account.id, date, account.type, value ?? 0);
                    }
                  }}
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
            })}
          </div>
        ))}

        {/* Summary Row (Sticky at bottom) */}
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
                <span
                  className={netWorth >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}
                >
                  {formatCurrency(netWorth)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
