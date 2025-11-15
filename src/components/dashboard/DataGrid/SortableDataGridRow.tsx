import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DataGridRow from "./DataGridRow";
import type { GridAccountDto, AccountType } from "@/types";

interface SortableDataGridRowProps {
  account: GridAccountDto;
  dates: string[];
  onCellClick: (accountId: string, date: string, accountType: AccountType) => void;
}

export default function SortableDataGridRow({ account, dates, onCellClick }: SortableDataGridRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: account.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
    position: "relative" as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <DataGridRow
        account={account}
        dates={dates}
        onCellClick={onCellClick}
        attributes={attributes}
        listeners={listeners}
      />
    </div>
  );
}
