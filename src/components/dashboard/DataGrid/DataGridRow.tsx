import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Archive, Trash2 } from "lucide-react";
import { useAccountActions } from "@/hooks/useAccountActions";
import DataGridCell from "./DataGridCell";
import type { GridAccountDto, AccountType } from "@/types";

interface DataGridRowProps {
  account: GridAccountDto;
  dates: string[];
  onCellClick: (accountId: string, date: string, accountType: AccountType, previousValue: number) => void;
}

export default function DataGridRow({ account, dates, onCellClick }: DataGridRowProps) {
  const { handleEditAccount, handleArchiveAccount, handleDeleteAccount } = useAccountActions();

  return (
    <div role="row" className="flex hover:bg-muted/30">
      {/* Account Name Cell (Sticky) */}
      <div
        role="gridcell"
        className="sticky left-0 z-10 w-[250px] flex-shrink-0 flex items-center justify-between border-r border-border bg-card px-4 py-3"
      >
        <div className="flex-1">
          <div className="font-medium text-foreground">{account.name}</div>
          <div className="text-xs text-muted-foreground">{account.type.includes("asset") ? "Aktywo" : "Pasywo"}</div>
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
      {dates.map((date) => {
        const entry = account.entries[date];
        const value = entry?.value ?? null;
        return (
          <DataGridCell
            key={date}
            accountId={account.id}
            date={date}
            accountType={account.type}
            value={value}
            onCellClick={onCellClick}
          />
        );
      })}
    </div>
  );
}
