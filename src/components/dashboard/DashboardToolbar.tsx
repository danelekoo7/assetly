import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { useDashboardStore } from "@/lib/stores/useDashboardStore";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

export default function DashboardToolbar() {
  const { dateRange, showArchived, setDateRange, setShowArchived, openModal } = useDashboardStore();
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [selectedColumnDate, setSelectedColumnDate] = useState<Date>();

  const handleDateRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      setDateRange({ from: range.from, to: range.to });
      setIsDateRangeOpen(false);
    }
  };

  const handleAddColumn = () => {
    if (selectedColumnDate) {
      // Tutaj w przyszłości można dodać logikę dodawania kolumny
      // Na razie tylko zamykamy popover
      setIsAddColumnOpen(false);
      setSelectedColumnDate(undefined);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Date Range Picker */}
      <Popover open={isDateRangeOpen} onOpenChange={setIsDateRangeOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-64 justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange.from && dateRange.to ? (
              <>
                {format(dateRange.from, "PP", { locale: pl })} - {format(dateRange.to, "PP", { locale: pl })}
              </>
            ) : (
              <span>Wybierz zakres dat</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={handleDateRangeSelect}
            numberOfMonths={2}
            locale={pl}
            defaultMonth={dateRange.from}
          />
        </PopoverContent>
      </Popover>

      {/* Add Account Button */}
      <Button onClick={() => openModal("addAccount", null)}>
        <Plus className="mr-2 h-4 w-4" />
        Dodaj konto
      </Button>

      {/* Add Column Button */}
      <Popover open={isAddColumnOpen} onOpenChange={setIsAddColumnOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Dodaj kolumnę
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedColumnDate}
            onSelect={(date) => {
              setSelectedColumnDate(date);
              if (date) {
                handleAddColumn();
              }
            }}
            locale={pl}
          />
        </PopoverContent>
      </Popover>

      {/* Show Archived Switch */}
      <div className="flex items-center gap-2">
        <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
        <label
          htmlFor="show-archived"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Pokaż zarchiwizowane
        </label>
      </div>
    </div>
  );
}
