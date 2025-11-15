import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { useDashboardStore } from "@/lib/stores/useDashboardStore";
import { format, subMonths, startOfYear, endOfYear } from "date-fns";
import { pl } from "date-fns/locale";
import { type DateRange } from "react-day-picker";

interface Preset {
  label: string;
  range: { from: Date; to: Date } | { from: undefined; to: undefined };
}

export default function DashboardToolbar() {
  const { dateRange, showArchived, setDateRange, setShowArchived, openModal, addColumn, isAddingColumn } =
    useDashboardStore();
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [localDateRange, setLocalDateRange] = useState<DateRange | undefined>(dateRange);
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [selectedColumnDate, setSelectedColumnDate] = useState<Date>();

  const handleDateRangeOpenChange = (open: boolean) => {
    if (open) {
      setLocalDateRange(dateRange);
    }
    setIsDateRangeOpen(open);
  };

  const applyDateRange = () => {
    if (localDateRange) {
      setDateRange({ from: localDateRange.from, to: localDateRange.to });
    }
    setIsDateRangeOpen(false);
  };

  const handlePresetSelect = (preset: Preset) => {
    if (preset.range.from && preset.range.to) {
      setDateRange({ from: preset.range.from, to: preset.range.to });
    } else {
      setDateRange({ from: undefined, to: undefined });
    }
    setIsDateRangeOpen(false);
  };

  const presets: Preset[] = [
    {
      label: "Ostatnie 3 miesiące",
      range: { from: subMonths(new Date(), 3), to: new Date() },
    },
    {
      label: "Ostatnie 12 miesięcy",
      range: { from: subMonths(new Date(), 12), to: new Date() },
    },
    {
      label: "Bieżący rok",
      range: { from: startOfYear(new Date()), to: endOfYear(new Date()) },
    },
    {
      label: "Cały okres",
      range: { from: undefined, to: undefined },
    },
  ];

  const handleOpenAddColumn = (open: boolean) => {
    if (open) {
      // When opening popover, set default date to today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setSelectedColumnDate(today);
    } else {
      // When closing popover, reset selected date
      setSelectedColumnDate(undefined);
    }
    setIsAddColumnOpen(open);
  };

  const handleAddColumn = async () => {
    if (selectedColumnDate) {
      try {
        await addColumn(selectedColumnDate);

        // Success: close popover and reset
        setIsAddColumnOpen(false);
        setSelectedColumnDate(undefined);
      } catch (error) {
        // Error: keep popover open
        // Toast notification is already handled in store
        // eslint-disable-next-line no-console
        console.error("Failed to add column:", error);
      }
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Date Range Picker */}
      <Popover open={isDateRangeOpen} onOpenChange={handleDateRangeOpenChange}>
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
          <div className="flex">
            <div className="flex flex-col space-y-2 border-r p-4">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  className="justify-start"
                  onClick={() => handlePresetSelect(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <div>
              <Calendar
                mode="range"
                selected={localDateRange}
                onSelect={setLocalDateRange}
                numberOfMonths={2}
                locale={pl}
                defaultMonth={dateRange.from}
              />
              <div className="border-t p-3">
                <Button onClick={applyDateRange} className="w-full">
                  Zastosuj
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Add Account Button */}
      <Button onClick={() => openModal("addAccount", null)}>
        <Plus className="mr-2 h-4 w-4" />
        Dodaj konto
      </Button>

      {/* Add Column Button */}
      <Popover open={isAddColumnOpen} onOpenChange={handleOpenAddColumn}>
        <PopoverTrigger asChild>
          <Button variant="outline" disabled={isAddingColumn}>
            <Plus className="mr-2 h-4 w-4" />
            {isAddingColumn ? "Dodawanie..." : "Dodaj kolumnę"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div>
            <Calendar
              mode="single"
              selected={selectedColumnDate}
              onSelect={setSelectedColumnDate}
              locale={pl}
              disabled={(date) => {
                // Disable future dates
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return date > today;
              }}
            />
            <div className="border-t p-3">
              <Button onClick={handleAddColumn} disabled={!selectedColumnDate || isAddingColumn} className="w-full">
                {isAddingColumn ? "Dodawanie..." : "OK"}
              </Button>
            </div>
          </div>
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
