import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Archive, Trash2, ArchiveRestore, GripVertical } from "lucide-react";
import { useAccountActions } from "@/hooks/useAccountActions";
import DataGridCell from "./DataGridCell";
import type { GridAccountDto, AccountType, AccountDto } from "@/types";
import { getAccountRowClasses } from "@/lib/utils";

interface DataGridRowProps {
  account: GridAccountDto;
  dates: string[];
  onCellClick: (accountId: string, date: string, accountType: AccountType) => void;
  attributes?: DraggableAttributes;
  listeners?: SyntheticListenerMap;
}

export default function DataGridRow({ account, dates, onCellClick, attributes, listeners }: DataGridRowProps) {
  const { handleEditAccount, handleArchiveAccount, handleRestoreAccount, handleDeleteAccount } = useAccountActions();
  const rowColorClasses = getAccountRowClasses(account.type);

  // Create a synthetic AccountDto for the edit modal, as GridAccountDto has a different shape.
  const accountDto: AccountDto = {
    id: account.id,
    name: account.name,
    type: account.type,
    archived_at: account.archived_at,
    currency: "PLN", // Placeholder, not used in edit modal
    created_at: new Date().toISOString(), // Placeholder, not used in edit modal
  };

  return (
    <div role="row" className={`flex hover:opacity-90 ${rowColorClasses} ${account.archived_at ? "opacity-50" : ""}`}>
      {/* Account Name Cell (Sticky) */}
      <div
        role="gridcell"
        className={`sticky left-0 z-10 w-[35vw] md:w-[200px] flex-shrink-0 flex items-center justify-between border-r border-border px-2 py-3 ${rowColorClasses}`}
      >
        <div className="flex items-center flex-1">
          <div {...attributes} {...listeners} className="cursor-grab touch-none p-2">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 ml-2">
            <div className="font-medium text-foreground">{account.name}</div>
            <div className="text-xs text-muted-foreground">{account.type.includes("asset") ? "Aktywo" : "Pasywo"}</div>
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
            <DropdownMenuItem onClick={() => handleEditAccount(accountDto)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edytuj
            </DropdownMenuItem>
            {account.archived_at ? (
              <DropdownMenuItem onClick={() => handleRestoreAccount(account.id, account.name)}>
                <ArchiveRestore className="mr-2 h-4 w-4" />
                Przywróć
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => handleArchiveAccount(account.id, account.name)}>
                <Archive className="mr-2 h-4 w-4" />
                Archiwizuj
              </DropdownMenuItem>
            )}
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
      {dates.map((date, index) => {
        const entry = account.entries[date];
        const value = entry?.value ?? null;

        // Sprawdź czy wartość jest taka sama jak w poprzedniej kolumnie
        let isSameAsPrevious = false;
        if (index > 0 && value !== null) {
          const previousDate = dates[index - 1];
          const previousValue = account.entries[previousDate]?.value ?? null;
          isSameAsPrevious = previousValue !== null && value === previousValue;
        }

        return (
          <DataGridCell
            key={date}
            accountId={account.id}
            date={date}
            accountType={account.type}
            value={value}
            isSameAsPrevious={isSameAsPrevious}
            onCellClick={onCellClick}
          />
        );
      })}
    </div>
  );
}
