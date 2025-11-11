import type { GridEntryDto } from "@/types";

/**
 * Znajduje ostatni wpis wartości dla danego konta
 * na podstawie istniejących dat w gridData.
 *
 * @param entries - Obiekt z wpisami konta (key: date string w formacie YYYY-MM-DD)
 * @param allDates - Wszystkie daty z gridData, posortowane chronologicznie
 * @returns Ostatni wpis lub null jeśli brak wpisów
 */
export function findLastEntry(
  entries: Record<string, GridEntryDto>,
  allDates: string[]
): { date: string; entry: GridEntryDto } | null {
  // Iteruj od końca tablicy dat (najnowsze)
  for (let i = allDates.length - 1; i >= 0; i--) {
    const date = allDates[i];
    if (entries[date]) {
      return { date, entry: entries[date] };
    }
  }
  return null;
}
