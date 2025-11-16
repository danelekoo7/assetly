import { MoreVertical, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

import { formatDate } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/lib/stores/useDashboardStore";

interface DataGridHeaderProps {
  dates: string[];
}

export default function DataGridHeader({ dates }: DataGridHeaderProps) {
  const { openModal } = useDashboardStore();

  const handleDeleteColumn = (date: string) => {
    openModal("confirmAction", {
      title: "Usuń kolumnę",
      description: `Czy na pewno chcesz usunąć wszystkie wpisy z dnia ${format(new Date(date), "dd.MM.yyyy", { locale: pl })}? Ta operacja jest nieodwracalna i usunie dane dla wszystkich kont w tym dniu.`,
      onConfirm: async () => {
        const { deleteColumn } = useDashboardStore.getState();
        await deleteColumn(date);
      },
    });
  };

  return (
    <div role="row" className="sticky top-0 z-20 flex bg-muted/50 backdrop-blur supports-[backdrop-filter]:bg-muted/50">
      <div
        role="columnheader"
        className="sticky left-0 z-30 w-[35vw] md:w-[200px] flex-shrink-0 border-r border-border bg-muted px-4 py-3 text-left text-sm font-semibold text-foreground"
      >
        Konto
      </div>
      <div className="flex">
        {dates.map((date) => (
          <div
            key={date}
            role="columnheader"
            className="relative w-[25vw] md:w-[150px] flex-shrink-0 border-r border-border px-4 py-3 text-right"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">{formatDate(date)}</span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-muted"
                    aria-label={`Opcje dla kolumny ${formatDate(date)}`}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => handleDeleteColumn(date)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Usuń kolumnę
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
