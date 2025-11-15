# Plan implementacji: Usuwanie kolumny

## Decyzje projektowe

✅ **Potwierdzone przez użytkownika:**
1. Nie blokujemy usuwania ostatniej kolumny - użytkownik może dodać nowe kolumny w dowolnym momencie
2. UI: Menu z 3 kropkami (MoreVertical icon) w nagłówku kolumny
3. Implementacja: Opcja A - Usuwanie całej kolumny (batch DELETE wszystkich value_entries dla daty)

## Zakres funkcjonalności

**Funkcjonalność:**
- Menu z 3 kropkami w prawym górnym rogu każdego nagłówka kolumny (daty)
- Opcja w menu: "Usuń kolumnę"
- Kliknięcie otwiera `ConfirmActionDialog`:
  - Tytuł: "Usuń kolumnę"
  - Opis: "Czy na pewno chcesz usunąć wszystkie wpisy z dnia {data}? Ta operacja jest nieodwracalna i usunie dane dla wszystkich kont w tym dniu."
  - Przyciski: "Anuluj" / "Usuń"
- Po potwierdzeniu: batch DELETE wszystkich `value_entries` dla tej daty
- Toast z komunikatem sukcesu: "Usunięto kolumnę {data}"
- Auto-refresh danych (z pominięciem cache)

## Szczegółowy plan implementacji

### Krok 1: Backend - Endpoint DELETE

**Plik:** `src/pages/api/value-entries.ts`

**Zmiany:**
- Dodać handler `export const DELETE: APIRoute`
- Wymagany query param: `date` (format: YYYY-MM-DD)
- Walidacja:
  - Użytkownik zalogowany (401 jeśli nie)
  - Data w poprawnym formacie (400 jeśli nie)
- Wywołanie `ValueEntryService.deleteEntriesByDate(supabase, userId, date)`
- Zwrot:
  - 200 + `{ deleted_count: number }` jeśli sukces
  - 401 jeśli nie zalogowany
  - 400 jeśli błędna walidacja
  - 500 jeśli błąd serwera

**Przykładowa sygnatura:**
```typescript
/**
 * DELETE /api/value-entries?date=YYYY-MM-DD
 *
 * Deletes all value entries for a specific date across all user's accounts.
 * This operation is irreversible.
 *
 * @query date - Date in YYYY-MM-DD format
 *
 * @returns 200 - { deleted_count: number }
 * @returns 400 - Invalid date format
 * @returns 401 - User not authenticated
 * @returns 500 - Internal server error
 */
export const DELETE: APIRoute = async ({ request, locals }) => {
  // Implementation
}
```

### Krok 2: Backend - Service metoda

**Plik:** `src/lib/services/value-entry.service.ts`

**Zmiany:**
- Dodać metodę `deleteEntriesByDate(supabase, userId, date)`
- Logika:
  1. Pobrać wszystkie konta użytkownika: `SELECT id FROM accounts WHERE user_id = $userId`
  2. Usunąć wpisy dla tych kont i danej daty: 
     ```sql
     DELETE FROM value_entries 
     WHERE account_id IN (account_ids) 
     AND date = $date
     ```
  3. Zwrócić liczbę usuniętych wpisów
- RLS automatycznie ograniczy do kont użytkownika (dodatkowe bezpieczeństwo)

**Przykładowa sygnatura:**
```typescript
/**
 * Delete all value entries for a specific date across all user's accounts
 *
 * @param supabase - Supabase client instance
 * @param userId - ID of the authenticated user
 * @param date - Date in YYYY-MM-DD format
 * @returns Number of deleted entries
 * @throws Error if deletion fails
 */
async function deleteEntriesByDate(
  supabase: SupabaseClient<Database>,
  userId: string,
  date: string
): Promise<number>
```

### Krok 3: Frontend - Store akcja

**Plik:** `src/lib/stores/useDashboardStore.ts`

**Zmiany:**
1. ~~Dodać stan: `isDeletingColumn: boolean` (dla loading state)~~ **USUNIĘTE - patrz sekcja "Uproszczenia MVP" poniżej**
2. Dodać akcję `deleteColumn(date: string): Promise<void>`

**Logika akcji:**
```typescript
deleteColumn: async (date: string) => {
  const { gridData } = get();
  const previousGridData = gridData;

  try {
    // [1] Optimistic update - usunięcie kolumny z UI
    if (gridData) {
      const updatedGridData = { ...gridData };
      updatedGridData.dates = updatedGridData.dates.filter(d => d !== date);
      
      // Remove entries for this date from all accounts
      updatedGridData.accounts = updatedGridData.accounts.map(account => {
        const { [date]: removed, ...remainingEntries } = account.entries;
        return { ...account, entries: remainingEntries };
      });
      
      set({ gridData: updatedGridData });
    }

    // [2] Call API
    const response = await fetch(`/api/value-entries?date=${date}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      // Rollback
      set({ gridData: previousGridData });
      const error = await response.json();
      toast.error('Nie udało się usunąć kolumny', {
        description: error.message,
      });
      throw new Error(error.message || 'Failed to delete column');
    }

    // [3] Success
    const result = await response.json();
    toast.success(`Usunięto kolumnę ${format(new Date(date), 'dd.MM.yyyy', { locale: pl })}`, {
      description: `Usunięto ${result.deleted_count} wpisów`,
    });

    // [4] Refresh data
    await get().fetchData(true); // skip cache
    get().closeModal('confirmAction');

  } catch (error) {
    // Ensure rollback
    set({ gridData: previousGridData });
    throw error;
  }
}
```

3. ~~Dodać `isDeletingColumn: false` do initial state~~ **USUNIĘTE**
4. ~~Dodać `isDeletingColumn` do `resetStore()`~~ **USUNIĘTE**

### Krok 4: Frontend - UI w DataGridHeader

**Plik:** `src/components/dashboard/DataGrid/DataGridHeader.tsx`

**Zmiany:**
1. Import:
```typescript
import { MoreVertical, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useDashboardStore } from '@/lib/stores/useDashboardStore';
import { formatDate } from '@/lib/utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
```

2. ~~Dodać prop:~~ **USUNIĘTE - patrz sekcja "Uproszczenia MVP" poniżej**
```typescript
interface DataGridHeaderProps {
  dates: string[];
  // New prop to enable/disable column deletion (for future flexibility)
  allowDelete?: boolean; // USUNIĘTE
}
```

3. Zmienić renderowanie nagłówków kolumn:
```tsx
{dates.map((date) => (
  <div
    key={date}
    role="columnheader"
    className="relative w-[150px] flex-shrink-0 border-r border-border px-4 py-3 text-right last:border-r-0"
  >
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-foreground">
        {formatDate(date)}
      </span>
      
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
```

4. Dodać handler:
```typescript
const { openModal } = useDashboardStore();

const handleDeleteColumn = (date: string) => {
  openModal('confirmAction', {
    title: 'Usuń kolumnę',
    description: `Czy na pewno chcesz usunąć wszystkie wpisy z dnia ${format(new Date(date), 'dd.MM.yyyy', { locale: pl })}? Ta operacja jest nieodwracalna i usunie dane dla wszystkich kont w tym dniu.`,
    onConfirm: async () => {
      const { deleteColumn } = useDashboardStore.getState();
      await deleteColumn(date);
    },
  });
};
```

### Krok 5: Frontend - Aktualizacja DataGrid

**Plik:** `src/components/dashboard/DataGrid.tsx`

**Zmiany:**
- ~~Przekazać prop `allowDelete` do `DataGridHeader`:~~ **USUNIĘTE - patrz sekcja "Uproszczenia MVP" poniżej**
```tsx
<DataGridHeader dates={gridData.dates} />
```

### Krok 6: Walidacja w schemacie (opcjonalne)

**Plik:** `src/lib/validation/value-entry.schemas.ts`

**Zmiany:**
- Dodać schema dla DELETE endpoint:
```typescript
export const deleteDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});
```

### Krok 7: Testy jednostkowe

**Plik:** `src/test/services/value-entry.service.test.ts`

**Dodać testy:**
```typescript
describe('deleteEntriesByDate', () => {
  it('should delete all entries for a given date', async () => {
    // Test implementation
  });

  it('should return 0 if no entries exist for the date', async () => {
    // Test implementation
  });

  it('should only delete entries for the authenticated user', async () => {
    // Test implementation
  });
});
```

### ~~Krok 8: Testy E2E~~ (POMINIĘTE - zostanie zaimplementowane później)

**UWAGA:** Testy E2E dla tej funkcjonalności zostaną dodane w przyszłości, gdy podstawowe funkcjonalności będą działać poprawnie.

## Podsumowanie kroków

**Backend (3 kroki):**
1. ✅ Endpoint DELETE w `/api/value-entries.ts`
2. ✅ Metoda `deleteEntriesByDate()` w serwisie
3. ✅ Schema walidacji (opcjonalnie)

**Frontend (3 kroki):**
4. ✅ Akcja `deleteColumn()` w store
5. ✅ UI menu z 3 kropkami w `DataGridHeader`
6. ✅ Przekazanie prop do `DataGridHeader` z `DataGrid`

**Testy (1 krok):**
7. ✅ Unit testy dla serwisu
~~8. E2E testy~~ - POMINIĘTE (zaimplementujemy później)

## Harmonogram wykonania (zgodnie z workflow3x3)

### Iteracja 1 - Backend (3 kroki):
1. Backend - Endpoint DELETE w `/api/value-entries.ts`
2. Backend - Service metoda `deleteEntriesByDate()` w `value-entry.service.ts`
3. Backend - Schema walidacji w `value-entry.schemas.ts`

**Feedback użytkownika → przejście do Iteracji 2**

### Iteracja 2 - Frontend (3 kroki):
4. Frontend - Store akcja `deleteColumn()` w `useDashboardStore.ts`
5. Frontend - UI menu z 3 kropkami w `DataGridHeader.tsx`
6. Frontend - Integracja w `DataGrid.tsx`

**Feedback użytkownika → przejście do Iteracji 3**

### Iteracja 3 - Testy i finalizacja (3 kroki):
7. Unit testy dla `deleteEntriesByDate()` w serwisie
8. Uruchomienie linterów (ESLint + Prettier)
9. Uruchomienie testów jednostkowych

**Finalizacja** - Testy E2E zostaną dodane w przyszłości

---

## Uproszczenia MVP (post-implementacja)

**Data:** 15.11.2025

Po implementacji funkcjonalności i code review z użytkownikiem, zgodnie z zasadą YAGNI (You Aren't Gonna Need It), usunięto następujące elementy, które były planowane ale nieużywane w MVP:

### 1. Usunięto prop `allowDelete` z DataGridHeader

**Usunięte pliki:**
- `src/components/dashboard/DataGrid/DataGridHeader.tsx` - prop `allowDelete?: boolean`
- `src/components/dashboard/DataGrid.tsx` - przekazywanie `allowDelete={true}`

**Uzasadnienie:**
- Prop został dodany "na przyszłość" do warunkowego włączania/wyłączania możliwości usuwania kolumn
- W MVP nie ma przypadku użycia, gdzie chcielibyśmy ukryć tę funkcjonalność
- Dodawało to niepotrzebną złożoność bez realnej wartości
- Jeśli w przyszłości będzie potrzebne warunkowe renderowanie, można łatwo to dodać

### 2. Usunięto stan `isDeletingColumn` z useDashboardStore

**Usunięte elementy:**
- `src/lib/stores/useDashboardStore.ts`:
  - Definicja `isDeletingColumn: boolean` w interfejsie `DashboardState`
  - Inicjalizacja `isDeletingColumn: false` w initial state
  - Wywołania `set({ isDeletingColumn: true/false })` w metodzie `deleteColumn`
  - Reset `isDeletingColumn: false` w metodzie `resetStore`

**Uzasadnienie:**
- Stan został dodany z myślą o wyświetlaniu loadera/spinnera podczas usuwania kolumny
- Żaden komponent UI nie wykorzystywał tego stanu
- Operacja usuwania jest bardzo szybka dzięki optymistycznej aktualizacji + toast notification
- Dla MVP to dodatkowa złożoność bez wizualnej wartości
- Jeśli w przyszłości będzie potrzebny loading state (np. dla wolniejszego API), można łatwo go dodać

**Rezultat uproszczeń:**
- ✅ Mniej kodu do utrzymania
- ✅ Prostszy interfejs komponentów
- ✅ Zachowana pełna funkcjonalność usuwania kolumn
- ✅ Zgodność z zasadą YAGNI dla MVP
- ✅ Wszystkie lintery przechodzą pomyślnie
