# Plan implementacji: Logika dodawania kolumny (PRIORYTET 2 🟡)

**Data utworzenia:** 11.11.2025  
**Status:** Do implementacji  
**Priorytet:** Wysoki (PRIORYTET 2)

## 1. Przegląd funkcjonalności

### Cel biznesowy
Umożliwić użytkownikowi szybkie dodanie nowej kolumny (daty) do siatki danych, automatycznie kopiując ostatnie wartości ze wszystkich aktywnych kont. To pozwala na wydajną aktualizację stanu finansowego bez konieczności ręcznego wprowadzania wartości dla każdego konta osobno.

### Wymagania z PRD
Z dokumentu `ai/prd.md` (US-008):
> Jako użytkownik, chcę mieć prostą możliwość dodania nowej kolumny z dzisiejszą datą, aby szybko zaktualizować stan moich finansów.
> 
> **Kryteria akceptacji:**
> - Istnieje przycisk "Dodaj dzisiejszą kolumnę" (lub podobny)
> - Po kliknięciu, do tabeli dodawana jest nowa kolumna z bieżącą datą
> - Wartości w nowej kolumnie są automatycznie wypełniane wartościami z ostatniej istniejącej kolumny
> - Jeśli jest to pierwsza kolumna, wartości są ustawiane na 0 lub wartości początkowe kont

### Stan obecny
✅ **Co już istnieje:**
- Przycisk "Dodaj kolumnę" w `DashboardToolbar.tsx` z kalendarzem do wyboru daty
- Endpoint `POST /api/value-entries` dla pojedynczych wpisów
- Mechanizm optymistycznej aktualizacji w `updateValueEntry()`

❌ **Co brakuje:**
- Akcja `addColumn()` w store
- Logika znajdowania ostatnich wartości dla kont
- Podłączenie przycisku do akcji
- Obsługa stanów ładowania i błędów
- Toast notifications dla użytkownika

---

## 2. Architektura rozwiązania

### Podejście: Wykorzystanie istniejącego endpointu vs. Batch endpoint

**Decyzja:** Zaczynamy od wykorzystania istniejącego endpointu `POST /api/value-entries`

**Uzasadnienie:**
1. **MVP First:** Zgodnie z filozofią projektu (6-tygodniowy timeline MVP), priorytetem jest działające rozwiązanie
2. **Mniejsza złożoność:** Istniejący endpoint jest już przetestowany i działa
3. **Wystarczająca wydajność:** Dla typowego użytkownika z 5-15 kontami, sekwencyjne requesty są akceptowalne
4. **Łatwiejszy rollback:** W przypadku błędu jednego konta, pozostałe mogą się udać
5. **Przyszła optymalizacja:** Batch endpoint można dodać jako optymalizację w kolejnej iteracji

**Rozważenie batch endpoint w przyszłości:**
- Gdy liczba kont przekroczy ~20
- Gdy pojawią się problemy z wydajnością
- Po zebraniu feedbacku od użytkowników

### Przepływ danych

```
┌─────────────────────────────────────────────────────────────┐
│                  DODAWANIE KOLUMNY - PRZEPŁYW                │
└─────────────────────────────────────────────────────────────┘

1. USER ACTION
   │
   ├─ Użytkownik klika "Dodaj kolumnę"
   ├─ Wybiera datę z kalendarza
   └─ Data jest przekazana do handleAddColumn(date)
   
2. TOOLBAR (DashboardToolbar.tsx)
   │
   └─ handleAddColumn(date: Date)
      ├─ Wywołuje addColumn(date) z store
      ├─ Zamyka popover
      └─ Resetuje selectedColumnDate
      
3. STORE ACTION (useDashboardStore.ts)
   │
   └─ addColumn(date: Date)
      ├─ [1] Validation
      │   ├─ Sprawdza czy gridData istnieje
      │   ├─ Sprawdza czy data nie jest w przyszłości
      │   └─ Sprawdza czy kolumna z tą datą już nie istnieje
      │
      ├─ [2] Set Loading State
      │   └─ set({ isAddingColumn: true, addColumnError: null })
      │
      ├─ [3] Prepare Data
      │   ├─ Formatuje datę do YYYY-MM-DD
      │   └─ Dla każdego aktywnego konta:
      │       ├─ Znajduje ostatni wpis (findLastEntry)
      │       └─ Przygotowuje UpsertValueEntryCommand
      │
      ├─ [4] Sequential POST Requests
      │   └─ For each account:
      │       ├─ POST /api/value-entries
      │       ├─ Jeśli błąd: zbiera w errorsArray
      │       └─ Jeśli sukces: kontynuuj
      │
      ├─ [5] Handle Results
      │   ├─ Jeśli wszystkie sukces:
      │   │   ├─ fetchData() - odśwież dane
      │   │   ├─ showToast("Sukces")
      │   │   └─ set({ isAddingColumn: false })
      │   │
      │   └─ Jeśli były błędy:
      │       ├─ fetchData() - odśwież (częściowo dodane)
      │       ├─ showToast("Częściowy błąd: X/Y kont")
      │       └─ set({ isAddingColumn: false, addColumnError })
      │
      └─ [6] Catch Global Error
          ├─ showToast("Błąd dodawania kolumny")
          └─ set({ isAddingColumn: false, addColumnError })
```

---

## 3. Szczegółowa specyfikacja techniczna

### 3.1. Nowy stan w store

**Plik:** `src/lib/stores/useDashboardStore.ts`

```typescript
interface DashboardState {
  // ... existing state ...
  
  // NEW: Loading state for adding column
  isAddingColumn: boolean;
  addColumnError: Error | null;
  
  // ... existing actions ...
  
  // NEW: Action for adding column
  addColumn: (date: Date) => Promise<void>;
}
```

### 3.2. Funkcja pomocnicza: findLastEntry

**Lokalizacja:** Wewnątrz `useDashboardStore.ts` lub nowy plik `src/lib/utils/grid-helpers.ts`

**Cel:** Znaleźć ostatni wpis wartości dla danego konta

```typescript
/**
 * Znajduje ostatni wpis wartości dla danego konta
 * na podstawie istniejących dat w gridData.
 * 
 * @param entries - Obiekt z wpisami konta (key: date string)
 * @param allDates - Wszystkie daty z gridData, posortowane
 * @returns Ostatni wpis lub null
 */
function findLastEntry(
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
```

**Alternatywa:** Jeśli konto nie ma żadnych wpisów, użyj wartości początkowej (initial_value) z konta

### 3.3. Implementacja akcji addColumn

**Plik:** `src/lib/stores/useDashboardStore.ts`

```typescript
addColumn: async (date: Date) => {
  const { gridData, showArchived } = get();
  
  // [1] Validation
  if (!gridData || gridData.accounts.length === 0) {
    throw new Error("Brak kont do zaktualizowania");
  }
  
  const dateStr = format(date, 'yyyy-MM-dd'); // date-fns
  
  // Check if column already exists
  if (gridData.dates.includes(dateStr)) {
    throw new Error(`Kolumna z datą ${format(date, 'dd.MM.yyyy', { locale: pl })} już istnieje`);
  }
  
  // Check if date is not in the future
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date > today) {
    throw new Error("Nie można dodać kolumny z datą w przyszłości");
  }
  
  // [2] Set loading state
  set({ isAddingColumn: true, addColumnError: null });
  
  try {
    // [3] Prepare data
    const commands: UpsertValueEntryCommand[] = [];
    const errors: { accountName: string; error: string }[] = [];
    
    for (const account of gridData.accounts) {
      // Find last entry for this account
      const lastEntry = findLastEntry(account.entries, gridData.dates);
      
      // Determine initial value
      let value = 0;
      let cash_flow = 0;
      let gain_loss = 0;
      
      if (lastEntry) {
        value = lastEntry.entry.value;
        cash_flow = 0; // Start with 0 change
        gain_loss = 0; // Start with 0 change
      }
      // If no last entry, value stays 0 (or we could fetch from account.initial_value)
      
      commands.push({
        account_id: account.id,
        date: dateStr,
        value,
        cash_flow,
        gain_loss,
      });
    }
    
    // [4] Sequential POST requests
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      const account = gridData.accounts[i];
      
      try {
        const response = await fetch("/api/value-entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(command),
        });
        
        if (!response.ok) {
          const error = await response.json();
          errors.push({
            accountName: account.name,
            error: error.message || "Nieznany błąd",
          });
        }
      } catch (err) {
        errors.push({
          accountName: account.name,
          error: err instanceof Error ? err.message : "Błąd sieciowy",
        });
      }
    }
    
    // [5] Handle results
    await get().fetchData(); // Refresh data regardless of partial errors
    
    if (errors.length === 0) {
      // Full success
      // TODO: Show toast notification (requires toast library)
      console.log(`✅ Pomyślnie dodano kolumnę ${format(date, 'dd.MM.yyyy', { locale: pl })}`);
      set({ isAddingColumn: false });
    } else if (errors.length < commands.length) {
      // Partial success
      const errorMsg = `Częściowy błąd: ${errors.length}/${commands.length} kont nie zostało zaktualizowanych`;
      console.warn(errorMsg, errors);
      set({ 
        isAddingColumn: false, 
        addColumnError: new Error(errorMsg) 
      });
      // TODO: Show toast with error details
    } else {
      // Complete failure
      throw new Error("Nie udało się dodać kolumny dla żadnego konta");
    }
    
  } catch (error) {
    // [6] Global error handler
    const errorMsg = error instanceof Error ? error.message : "Wystąpił błąd podczas dodawania kolumny";
    console.error("Error in addColumn:", error);
    set({ 
      isAddingColumn: false, 
      addColumnError: error instanceof Error ? error : new Error(errorMsg) 
    });
    throw error; // Re-throw for component to handle
  }
},
```

### 3.4. Modyfikacja DashboardToolbar

**Plik:** `src/components/dashboard/DashboardToolbar.tsx`

```typescript
export default function DashboardToolbar() {
  const { 
    dateRange, 
    showArchived, 
    setDateRange, 
    setShowArchived, 
    openModal,
    addColumn,        // NEW
    isAddingColumn,   // NEW
  } = useDashboardStore();
  
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [selectedColumnDate, setSelectedColumnDate] = useState<Date>();

  // ... existing handlers ...

  const handleAddColumn = async () => {
    if (selectedColumnDate) {
      try {
        await addColumn(selectedColumnDate);
        
        // Success: close popover and reset
        setIsAddColumnOpen(false);
        setSelectedColumnDate(undefined);
        
        // TODO: Show success toast
        // toast.success(`Dodano kolumnę ${format(selectedColumnDate, 'dd.MM.yyyy', { locale: pl })}`);
        
      } catch (error) {
        // Error: keep popover open, show error
        console.error("Failed to add column:", error);
        
        // TODO: Show error toast
        // toast.error(error instanceof Error ? error.message : "Nie udało się dodać kolumny");
      }
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* ... existing elements ... */}

      {/* Add Column Button - UPDATED */}
      <Popover open={isAddColumnOpen} onOpenChange={setIsAddColumnOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline"
            disabled={isAddingColumn} // NEW: Disable during loading
          >
            <Plus className="mr-2 h-4 w-4" />
            {isAddingColumn ? "Dodawanie..." : "Dodaj kolumnę"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedColumnDate}
            onSelect={(date) => {
              setSelectedColumnDate(date);
              if (date) {
                handleAddColumn(); // Now async
              }
            }}
            locale={pl}
            disabled={(date) => {
              // Disable future dates
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return date > today;
            }}
          />
        </PopoverContent>
      </Popover>

      {/* ... rest of toolbar ... */}
    </div>
  );
}
```

---

## 4. Walidacja i obsługa błędów

### 4.1. Walidacje przed zapisem

1. **Brak kont:** Jeśli `gridData.accounts.length === 0`
   - Komunikat: "Dodaj najpierw konta, aby móc tworzyć wpisy wartości"
   - Akcja: Nie wywołuj API, pokaż toast

2. **Data w przyszłości:** Jeśli `date > today`
   - Komunikat: "Nie można dodać kolumny z datą w przyszłości"
   - Akcja: Zablokuj w kalendarzu (prop `disabled`)

3. **Kolumna już istnieje:** Jeśli `gridData.dates.includes(dateStr)`
   - Komunikat: "Kolumna z datą DD.MM.YYYY już istnieje"
   - Akcja: Pokaż toast, nie wywołuj API

### 4.2. Obsługa błędów API

**Scenariusze:**

| Scenariusz | Status | Akcja |
|------------|--------|-------|
| Wszystkie konta OK | 200 dla wszystkich | ✅ Toast sukcesu, odśwież dane |
| Częściowy błąd | 200 dla niektórych, 4xx/5xx dla innych | ⚠️ Toast z ostrzeżeniem + lista błędów, odśwież dane |
| Pełny błąd | 4xx/5xx dla wszystkich | ❌ Toast błędu, odśwież dane (brak zmian) |
| Błąd sieciowy | Network error | ❌ Toast "Sprawdź połączenie", nie odświeżaj |

### 4.3. Komunikaty użytkownika

**Sukces:**
```
✅ Dodano kolumnę 15.11.2025
Zaktualizowano 5 kont
```

**Częściowy błąd:**
```
⚠️ Częściowo dodano kolumnę
3/5 kont zaktualizowano pomyślnie

Błędy:
• mBank: Konto nie znalezione
• XTB: Nieprawidłowa wartość
```

**Pełny błąd:**
```
❌ Nie udało się dodać kolumny
Wszystkie konta zwróciły błąd. Spróbuj ponownie później.
```

---

## 5. UX i dostępność

### 5.1. Stany wizualne

**Loading state:**
- Przycisk "Dodaj kolumnę" zmienia tekst na "Dodawanie..."
- Przycisk jest disabled
- Opcjonalnie: spinner obok tekstu

**Sukces:**
- Toast notification z checkmarkiem
- Nowa kolumna pojawia się w siatce
- Automatyczny scroll do nowej kolumny (opcjonalnie)

**Błąd:**
- Toast notification z ikoną błędu
- Szczegóły błędu dostępne po kliknięciu (jeśli częściowy)

### 5.2. Accessibility

- **Aria-live region** dla toast notifications
- **Disabled state** przycisku podczas ładowania z odpowiednim `aria-disabled`
- **Focus management:** Po zamknięciu popovera, focus wraca do przycisku
- **Keyboard navigation:** Calendar jest w pełni dostępny klawiaturą (Shadcn/ui domyślnie)

### 5.3. Mobile responsiveness

- Przycisk "Dodaj kolumnę" ma wystarczający touch target (min. 44x44px)
- Calendar w popoverze jest responsywny
- Toast notifications nie blokują interfejsu na małych ekranach

---

## 6. Testy

### 6.1. Testy jednostkowe (Vitest)

**Plik:** `src/test/stores/useDashboardStore.addColumn.test.ts`

```typescript
describe('useDashboardStore - addColumn', () => {
  it('should throw error if no accounts exist', async () => {
    // Given: empty gridData
    // When: addColumn called
    // Then: expect error "Brak kont"
  });
  
  it('should throw error if date is in future', async () => {
    // Given: gridData with accounts
    // When: addColumn with tomorrow's date
    // Then: expect error "przyszłość"
  });
  
  it('should throw error if column already exists', async () => {
    // Given: gridData with date "2024-11-15"
    // When: addColumn with same date
    // Then: expect error "już istnieje"
  });
  
  it('should create entries with last values', async () => {
    // Given: gridData with accounts having last entries
    // When: addColumn called
    // Then: expect POST with copied values
  });
  
  it('should handle partial errors gracefully', async () => {
    // Given: API returns 200 for some, 400 for others
    // When: addColumn called
    // Then: expect fetchData called, error state set
  });
});
```

**Plik pomocniczy:** `src/lib/utils/grid-helpers.test.ts`

```typescript
describe('findLastEntry', () => {
  it('should return last entry chronologically', () => {
    // Test sorting logic
  });
  
  it('should return null if no entries exist', () => {
    // Test empty entries
  });
});
```

### 6.2. Testy E2E (Playwright)

**Plik:** `e2e/add-column.spec.ts`

```typescript
test.describe('Add Column functionality', () => {
  test('should add new column with current date', async ({ page }) => {
    // 1. Login
    // 2. Add test account
    // 3. Click "Dodaj kolumnę"
    // 4. Select today's date
    // 5. Verify new column appears in grid
    // 6. Verify values are copied from last entry
  });
  
  test('should prevent adding duplicate dates', async ({ page }) => {
    // 1. Add column for date X
    // 2. Try to add column for date X again
    // 3. Verify error toast appears
    // 4. Verify column was not duplicated
  });
  
  test('should handle partial errors correctly', async ({ page }) => {
    // Mock API to return error for one account
    // Verify warning toast
    // Verify partial data appears
  });
  
  test('should be keyboard accessible', async ({ page }) => {
    // Navigate with Tab
    // Open calendar with Enter
    // Select date with Arrow keys
    // Confirm with Enter
  });
});
```

---

## 7. Instalacja zależności

### Toast Notifications Library

**Decyzja:** Zainstalować `sonner` (zgodnie z Shadcn/ui)

```bash
npx shadcn@latest add sonner
```

**Użycie w komponencie:**

```typescript
import { toast } from "sonner";

// Success
toast.success("Dodano kolumnę 15.11.2025");

// Error
toast.error("Nie udało się dodać kolumny");

// Warning (partial error)
toast.warning("Częściowo dodano kolumnę", {
  description: "3/5 kont zaktualizowano pomyślnie"
});
```

**Integracja w Layout:**

```tsx
// src/layouts/Layout.astro lub IntegratedDashboardPage.tsx
import { Toaster } from "sonner";

<Toaster position="top-right" richColors />
```

---

## 8. Checklist implementacji

### Backend (✅ Gotowy)
- [x] Endpoint `POST /api/value-entries` istnieje i działa
- [x] Walidacja `upsertValueEntrySchema`
- [x] Service `ValueEntryService.upsertValueEntry()`

### Frontend - Utilities
- [ ] Utworzyć `src/lib/utils/grid-helpers.ts`
  - [ ] Implementacja `findLastEntry()`
  - [ ] Testy jednostkowe dla `findLastEntry()`

### Frontend - Store
- [ ] Zaktualizować `src/lib/stores/useDashboardStore.ts`
  - [ ] Dodać `isAddingColumn: boolean` do state
  - [ ] Dodać `addColumnError: Error | null` do state
  - [ ] Zaimplementować akcję `addColumn(date: Date)`
    - [ ] Walidacja (brak kont, data w przyszłości, duplikat)
    - [ ] Przygotowanie commands dla każdego konta
    - [ ] Sekwencyjne wywołania POST /api/value-entries
    - [ ] Zbieranie błędów częściowych
    - [ ] Odświeżanie danych przez `fetchData()`
    - [ ] Obsługa błędów globalnych
  - [ ] Testy jednostkowe dla `addColumn()`

### Frontend - Komponenty
- [ ] Zaktualizować `src/components/dashboard/DashboardToolbar.tsx`
  - [ ] Podłączyć `addColumn` i `isAddingColumn` z store
  - [ ] Zaimplementować async `handleAddColumn()`
  - [ ] Dodać disabled state do przycisku podczas ładowania
  - [ ] Dodać disable dla przyszłych dat w kalendarzu
  - [ ] Dodać toast notifications (sukces/błąd)
  - [ ] Obsługa błędów w try-catch

### UI/UX
- [ ] Zainstalować `sonner` dla toast notifications
  - [ ] `npx shadcn@latest add sonner`
- [ ] Dodać `<Toaster />` do głównego layoutu
- [ ] Zaimplementować komunikaty toast
  - [ ] Sukces: "Dodano kolumnę DD.MM.YYYY"
  - [ ] Częściowy błąd: "Częściowo dodano kolumnę (X/Y)"
  - [ ] Pełny błąd: "Nie udało się dodać kolumny"
- [ ] (Opcjonalnie) Dodać auto-scroll do nowej kolumny po dodaniu

### Testy
- [ ] Testy jednostkowe dla `grid-helpers.ts`
  - [ ] Test `findLastEntry()` - success case
  - [ ] Test `findLastEntry()` - empty entries
- [ ] Testy jednostkowe dla `useDashboardStore.addColumn()`
  - [ ] Test walidacji: brak kont
  - [ ] Test walidacji: data w przyszłości
  - [ ] Test walidacji: duplikat kolumny
  - [ ] Test sukcesu: wszystkie konta OK
  - [ ] Test częściowego błędu
  - [ ] Test pełnego błędu
- [ ] Testy E2E dla przepływu dodawania kolumny
  - [ ] Dodanie kolumny z dzisiejszą datą
  - [ ] Weryfikacja kopiowania wartości
  - [ ] Próba dodania duplikatu
  - [ ] Dostępność klawiatury

### Dokumentacja
- [ ] Zaktualizować `ai/conversations-summary/value-entries-ui-integration-analysis.md`
  - [ ] Zaznaczyć punkt 2 jako zrealizowany
- [ ] Dodać komentarze JSDoc do nowych funkcji
- [ ] Zaktualizować CLAUDE.md jeśli potrzebne

---

## 9. Przyszłe optymalizacje (poza MVP)

### 9.1. Batch Endpoint (Performance)

**Kiedy rozważyć:**
- Gdy użytkownicy mają >20 kont
- Gdy pojawią się skargi na wydajność
- Gdy metryki pokazują długie czasy dodawania kolumn

**Implementacja:**

**Backend:**
```typescript
// src/pages/api/value-entries/batch.ts
export const POST = async ({ request, cookies }: APIContext) => {
  const commands: UpsertValueEntryCommand[] = await request.json();
  
  // Validate array
  // Batch insert in single transaction
  // Return success/failure per item
};
```

**Frontend:**
```typescript
// In store
const response = await fetch("/api/value-entries/batch", {
  method: "POST",
  body: JSON.stringify(commands),
});
```

### 9.2. Optimistic UI dla addColumn

Zamiast czekać na odpowiedź API, od razu dodaj kolumnę do `gridData` i rollbackuj w razie błędu.

**Zalety:**
- Natychmiastowy feedback dla użytkownika
- Lepsze UX

**Wady:**
- Większa złożoność
- Trudniejszy rollback przy częściowych błędach

### 9.3. Background sync

Dla użytkowników z dużą liczbą kont, przenieś operację do background task i pokaż progress bar.

### 9.4. Bulk operations UI

Pozwól użytkownikowi dodać wiele kolumn na raz (np. cały tydzień).

---

## 10. Ryzyka i mitigacje

| Ryzyko | Prawdopodobieństwo | Wpływ | Mitigacja |
|--------|-------------------|-------|-----------|
| Sekwencyjne requesty są zbyt wolne dla wielu kont | Średnie | Średni | Monitorować performance, mieć gotowy plan batch endpoint |
| Częściowe błędy dezorientują użytkownika | Niskie | Średni | Jasne komunikaty toast z listą błędów |
| Duplikacja dat przez race condition | Bardzo niskie | Niski | Walidacja po stronie backendu (unique constraint) |
| Brak internet connection podczas operacji | Średnie | Wysoki | Obsługa network errors, komunikat "Sprawdź połączenie" |

---

## 11. Metryki sukcesu

### Funkcjonalne
- ✅ Użytkownik może dodać kolumnę w <3 kliknięciach
- ✅ Wartości są poprawnie kopiowane z ostatnich wpisów
- ✅ Błędy są jasno komunikowane
- ✅ Loading states są widoczne

### Techniczne
- ✅ Dodawanie kolumny z 10 kontami zajmuje <2s
- ✅ 95% operacji kończy się sukcesem (z danych analitycznych)
- ✅ Brak błędów 500 w logach

### UX
- ✅ Użytkownicy nie zgłaszają problemów z duplikacją kolumn
- ✅ Ankieta: >80% użytkowników ocenia funkcję jako "łatwą w użyciu"

---

## 12. Kolejność realizacji (Step-by-step)

### Dzień 1: Przygotowanie
1. Zainstalować `sonner` i dodać `<Toaster />` do layoutu
2. Utworzyć `grid-helpers.ts` z `findLastEntry()`
3. Napisać testy dla `findLastEntry()`

### Dzień 2: Backend (store)
4. Dodać nowy state do `useDashboardStore`
5. Zaimplementować akcję `addColumn()`
6. Napisać testy jednostkowe dla `addColumn()`

### Dzień 3: Frontend (UI)
7. Zaktualizować `DashboardToolbar.tsx`
8. Dodać toast notifications
9. Przetestować manualnie w przeglądarce

### Dzień 4: Testy E2E
10. Napisać testy E2E dla przepływu dodawania kolumny
11. Uruchomić wszystkie testy (unit + e2e)
12. Poprawić błędy

### Dzień 5: Dopracowanie
13. Code review
14. Testy na różnych rozdzielczościach ekranu
15. Testy dostępności (keyboard navigation)
16. Aktualizacja dokumentacji

---

## 13. Pytania do rozstrzygnięcia

- [ ] **Toast position:** Top-right czy bottom-right? (Sugestia: top-right dla consistency z modals)
- [ ] **Auto-scroll:** Czy automatycznie scrollować do nowo dodanej kolumny? (Sugestia: TAK, poprawia UX)
- [ ] **Default date:** Czy przycisk "Dodaj kolumnę" powinien mieć wariant szybki "Dodaj dzisiaj" bez kalendarza? (Sugestia: NIE dla MVP, można dodać później)
- [ ] **Confirmation dialog:** Czy pytać użytkownika o potwierdzenie przed dodaniem kolumny? (Sugestia: NIE, operacja jest bezpieczna i odwracalna)

---

## 14. Status implementacji

**Aktualny status:** 📋 Zaplanowane  
**Przypisane do:** [Developer name]  
**Target date:** [Date]  
**Dependencies:** ✅ Punkt 1 (GET /api/grid-data) - zrealizowany

**Następny krok:** Rozpocząć implementację zgodnie z "Kolejnością realizacji"
