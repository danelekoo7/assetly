# Analiza integracji UI dla dodawania i wyświetlania wartości

**Data:** 10.11.2025

## Stan obecny ✅

**Co już działa:**
- ✅ **Endpoint `POST /api/value-entries`** - w pełni zaimplementowany i przetestowany
  - Service: `ValueEntryService.upsertValueEntry()`
  - Walidacja: `upsertValueEntrySchema`
  - Automatyczne obliczanie `cash_flow` i `gain_loss` w zależności od typu konta
  - Obsługa błędów: `NotFoundError`, `ValidationError`
  
- ✅ **`EditValueModal` (src/components/dashboard/EditValueModal.tsx)** - modal do edycji wartości w komórkach
  - Formularz z trzema polami: wartość, wpłata/wypłata, zysk/strata
  - Automatyczne przeliczanie wartości z użyciem `useReducer`
  - Wyświetlanie kontekstu: nazwa konta, data, poprzednia wartość
  - Walidacja z `zod` i `react-hook-form`
  
- ✅ **`updateValueEntry()` w store (useDashboardStore.ts)** - akcja wysyłająca dane do API
  - Optymistyczna aktualizacja UI
  - Mechanizm rollback w przypadku błędu
  - Automatyczne odświeżanie danych po zapisie
  
- ✅ **Kliknięcie w komórkę siatki** - otwiera modal `EditValueModal`
  - `DataGridCell` obsługuje interakcje (klik, klawiatura)
  - Przekazuje kontekst do `openModal('editValue', ...)`

## Czego brakuje ❌

### 1. **Endpoint GET `/api/grid-data`** (PRIORYTET 1 🔴)

**Problem:** 
- Funkcja `fetchData()` w store tworzy puste `entries: {}` dla każdego konta
- Wartości wprowadzone przez użytkownika nie są wyświetlane po odświeżeniu
- Mock dane są używane tylko lokalnie

**Rozwiązanie:**
Zaimplementować endpoint, który:
1. Pobiera wszystkie konta użytkownika z `accounts` table
2. Pobiera wszystkie `value_entries` dla tych kont w danym zakresie dat
3. Formatuje dane jako `GridDataDto`:
   ```typescript
   {
     dates: string[],           // Unikalne daty z value_entries
     accounts: [                // Konta z entries
       {
         id: string,
         name: string,
         type: AccountType,
         entries: {
           "2024-01-15": {      // Klucz: data (YYYY-MM-DD)
             value: number,
             cash_flow: number,
             gain_loss: number
           }
         }
       }
     ],
     summary: {                 // Podsumowanie dla każdej daty
       "2024-01-15": {
         net_worth: number
       }
     }
   }
   ```

**Pliki do stworzenia:**
- `src/lib/services/grid-data.service.ts` - logika biznesowa
- `src/pages/api/grid-data.ts` - endpoint API
- Query params: `?from=YYYY-MM-DD&to=YYYY-MM-DD&archived=true/false`

---

### 2. **Logika dodawania kolumny** (PRIORYTET 2 🟡)

**Problem:** 
- W `DashboardToolbar.tsx` przycisk "Dodaj kolumnę" ma pustą funkcję `handleAddColumn()`
- Brak możliwości dodania nowej daty do siatki z interfejsu użytkownika

**Rozwiązanie:**
Zaimplementować funkcję, która:
1. Dla wybranej daty pobiera ostatnie wartości dla wszystkich aktywnych kont
2. Tworzy nowe wpisy wartości (`POST /api/value-entries`) dla każdego konta na nową datę
3. Opcjonalnie: stworzyć dedykowany endpoint `POST /api/value-entries/batch` dla wydajności
4. Odświeża dane w store po pomyślnym zapisie

**Pliki do modyfikacji:**
- `src/lib/stores/useDashboardStore.ts` - dodać akcję `addColumn(date: Date)`
- `src/components/dashboard/DashboardToolbar.tsx` - podłączyć `addColumn()` do `handleAddColumn()`

**Przykładowa implementacja w store:**
```typescript
addColumn: async (date: Date) => {
  const { gridData } = get();
  if (!gridData) return;

  // Dla każdego aktywnego konta
  for (const account of gridData.accounts) {
    // Znajdź ostatnią wartość
    const lastEntry = findLastEntry(account.entries);
    
    // Utwórz nowy wpis
    await fetch('/api/value-entries', {
      method: 'POST',
      body: JSON.stringify({
        account_id: account.id,
        date: formatDate(date),
        value: lastEntry?.value ?? 0,
        cash_flow: 0,
        gain_loss: 0
      })
    });
  }
  
  // Odśwież dane
  await get().fetchData();
}
```

---

### 3. **Endpoint GET `/api/dashboard/summary`** (PRIORYTET 3 🟢, opcjonalnie)

**Problem:** 
- Store ustawia hardcoded `summaryData` z zerami
- KPI na pulpicie nie pokazują rzeczywistych wartości

**Rozwiązanie:**
Zaimplementować endpoint obliczający:
- `net_worth` = suma aktywów - suma pasywów (z ostatnich wpisów)
- `total_assets` = suma wszystkich aktywów
- `total_liabilities` = suma wszystkich pasywów
- `cumulative_cash_flow` = suma wszystkich `cash_flow` z wszystkich kont
- `cumulative_gain_loss` = suma wszystkich `gain_loss` z wszystkich kont

**Pliki do stworzenia:**
- `src/lib/services/dashboard.service.ts`
- `src/pages/api/dashboard/summary.ts`

**Uwaga:** Można to również obliczyć po stronie klienta z danych `GridDataDto`, ale dedykowany endpoint jest bardziej elastyczny na przyszłość.

---

## Kolejność implementacji

### Faza 1: Backend - Pobieranie danych ⬅️ **TU ZACZYNAMY**
```
1. Zaimplementować GridDataService.getGridData()
   └─ Pobieranie kont i value_entries z Supabase
   └─ Formatowanie do GridDataDto
   └─ Obliczanie podsumowań (net_worth) dla każdej daty

2. Utworzyć endpoint GET /api/grid-data
   └─ Walidacja query params (from, to, archived)
   └─ Wywołanie GridDataService
   └─ Zwrócenie GridDataDto
```

### Faza 2: Frontend - Połączenie z API
```
3. Aktualizacja fetchData() w useDashboardStore
   └─ Usunąć mock data
   └─ Dodać wywołanie fetch('/api/grid-data?...')
   └─ Obsługa błędów i stanów ładowania
```

### Faza 3: Dodawanie kolumn
```
4. Implementacja addColumn() w store
   └─ Logika tworzenia nowych wpisów dla wszystkich kont
   └─ Batch creation lub pojedyncze requesty do POST /api/value-entries
   └─ Odświeżenie danych po zapisie

5. Podłączenie DashboardToolbar
   └─ Wywołanie addColumn() z handleAddColumn()
   └─ Obsługa błędów i feedback dla użytkownika
```

### Faza 4: KPI Dashboard (opcjonalnie)
```
6. Zaimplementować DashboardService.getSummary()
7. Utworzyć endpoint GET /api/dashboard/summary
8. Aktualizacja fetchData() w store do pobierania summary
```

---

## Checklist implementacji

### Backend
- [ ] Utworzyć `src/lib/services/grid-data.service.ts`
  - [ ] Metoda `getGridData(userId, from, to, showArchived)`
  - [ ] Zapytania do Supabase (accounts + value_entries)
  - [ ] Formatowanie do `GridDataDto`
  - [ ] Obliczanie `summary` (net_worth dla każdej daty)
- [ ] Utworzyć `src/pages/api/grid-data.ts`
  - [ ] Handler `GET` z `export const prerender = false`
  - [ ] Walidacja query params z Zod
  - [ ] Wywołanie GridDataService
  - [ ] Obsługa błędów (401, 400, 500)
- [ ] (Opcjonalnie) Utworzyć dedykowany endpoint dla batch insert
  - [ ] `POST /api/value-entries/batch`
  - [ ] Przyjmuje array of `UpsertValueEntryCommand`

### Frontend - Store
- [ ] Zaktualizować `fetchData()` w `useDashboardStore.ts`
  - [ ] Usunąć mock data
  - [ ] Dodać `fetch('/api/grid-data?from=...&to=...&archived=...')`
  - [ ] Parsowanie odpowiedzi jako `GridDataDto`
  - [ ] Obsługa błędów sieciowych
- [ ] Zaimplementować `addColumn(date: Date)` w store
  - [ ] Iteracja po wszystkich kontach z `gridData`
  - [ ] Znajdowanie ostatniego wpisu dla każdego konta
  - [ ] Tworzenie nowych wpisów poprzez `POST /api/value-entries`
  - [ ] Odświeżenie danych poprzez `fetchData()`
  - [ ] Obsługa błędów z rollback

### Frontend - Komponenty
- [ ] Zaktualizować `DashboardToolbar.tsx`
  - [ ] Podłączyć `addColumn` z store do `handleAddColumn()`
  - [ ] Dodać obsługę ładowania (disable button podczas zapisu)
  - [ ] Toast notification po sukcesie/błędzie
- [ ] (Opcjonalnie) Dodać wskaźnik ładowania w `DataGrid`
  - [ ] Skeleton podczas pobierania danych
  - [ ] Lepsze komunikaty o błędach

### Testy
- [ ] Testy jednostkowe dla `GridDataService`
- [ ] Testy jednostkowe dla `addColumn()` w store
- [ ] Testy E2E dla przepływu:
  - [ ] Dodanie konta
  - [ ] Dodanie kolumny
  - [ ] Edycja wartości w komórce
  - [ ] Weryfikacja, że wartości są zapisane i widoczne po odświeżeniu

---

## Diagram przepływu danych

```
┌─────────────────────────────────────────────────────────────────┐
│                    DODAWANIE I WYŚWIETLANIE WARTOŚCI             │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│   USER INTERACTION   │
└──────────────────────┘
         │
         ├─────────── 1. Kliknięcie komórki ──────────────┐
         │                                                 │
         ▼                                                 ▼
┌────────────────────┐                        ┌──────────────────────┐
│  DataGridCell      │                        │  EditValueModal      │
│  onClick()         │ ──────────────────────▶│  - Formularz         │
└────────────────────┘                        │  - Auto-calc logic   │
                                              └──────────────────────┘
                                                        │
                                                        │ 2. Submit
                                                        ▼
                                              ┌──────────────────────┐
                                              │  useDashboardStore   │
                                              │  updateValueEntry()  │
                                              │  - Optimistic update │
                                              │  - Rollback on error │
                                              └──────────────────────┘
                                                        │
                                                        │ 3. POST request
                                                        ▼
                                              ┌──────────────────────┐
                                              │  POST /api/          │
                                              │    value-entries     │
                                              └──────────────────────┘
                                                        │
                                                        │ 4. Upsert DB
                                                        ▼
                                              ┌──────────────────────┐
                                              │  ValueEntryService   │
                                              │  .upsertValueEntry() │
                                              └──────────────────────┘
                                                        │
                                              ┌─────────┴─────────┐
                                              │                   │
                                         SUCCESS              ERROR
                                              │                   │
                                              ▼                   ▼
                                      ┌─────────────┐    ┌─────────────┐
                                      │  fetchData()│    │  Rollback   │
                                      │  (refresh)  │    │  Show error │
                                      └─────────────┘    └─────────────┘
                                              │
                                              │ 5. GET request
                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ❌ BRAKUJĄCY ENDPOINT                        │
│                     GET /api/grid-data                          │
│  - Pobiera konta + value_entries                               │
│  - Formatuje do GridDataDto                                    │
│  - Zwraca dane do store                                        │
└─────────────────────────────────────────────────────────────────┘
                                              │
                                              │ 6. Update state
                                              ▼
                                      ┌──────────────────┐
                                      │  gridData        │
                                      │  (Zustand state) │
                                      └──────────────────┘
                                              │
                                              │ 7. Re-render
                                              ▼
                                      ┌──────────────────┐
                                      │  DataGrid        │
                                      │  (shows values)  │
                                      └──────────────────┘
```

---

## Uwagi techniczne

### Optymalizacja zapytań do bazy danych
W `GridDataService.getGridData()` należy:
1. Użyć JOIN między `accounts` i `value_entries`
2. Filtrować po `user_id` (automatycznie przez RLS)
3. Filtrować po zakresie dat (`date >= from AND date <= to`)
4. Sortować `value_entries` po dacie rosnąco

```sql
SELECT 
  a.id, a.name, a.type,
  ve.date, ve.value, ve.cash_flow, ve.gain_loss
FROM accounts a
LEFT JOIN value_entries ve ON a.id = ve.account_id
WHERE a.user_id = auth.uid()
  AND (NOT a.archived_at IS NOT NULL OR $show_archived)
  AND ve.date >= $from AND ve.date <= $to
ORDER BY ve.date ASC
```

### Obsługa pustych stanów
- Jeśli użytkownik ma konta, ale nie ma żadnych wpisów wartości → pokazać pusty grid z komunikatem
- Jeśli użytkownik nie ma kont → pokazać empty state z przyciskiem "Dodaj pierwsze konto"

### Performance considerations
- Dla dużych zakresów dat rozważyć paginację lub limitowanie
- Dodać cache na poziomie przeglądarki (React Query lub SWR w przyszłości)
- Rozważyć debouncing dla filtrów zakresu dat

---

## Status

- ✅ **Backend dla zapisu wartości** - gotowy
- ✅ **Frontend dla edycji wartości** - gotowy  
- ❌ **Backend dla pobierania danych** - do implementacji
- ❌ **Dodawanie kolumn** - do implementacji
- ⚠️ **KPI Dashboard** - opcjonalnie

**Następny krok:** Implementacja `GET /api/grid-data` i `GridDataService`
