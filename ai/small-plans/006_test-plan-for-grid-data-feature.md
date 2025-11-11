# Plan testów dla funkcjonalności Grid Data i Add Column

**Data utworzenia:** 11.11.2025  
**Branch:** `feature/grid-data`  
**Status:** Do implementacji

---

## 📋 Przegląd zmian na branchu

### Committy na branchu feature/grid-data (vs main)

1. **7502b0c** - Update test case to use correct value for cash_flow calculation
2. **e40e152** - Update cash flow and gain/loss logic for liabilities
3. **080f093** - Introduce user modification tracking for cash flow and gain/loss
4. **7b0664b** - Refactored DataGrid components (flexbox, auto-scroll, enhanced error handling)
5. **d86aaaf** - Implement "Add Column" feature with full business requirements
6. **3749dac** - Standardized coding style
7. **3e46a5f/4712e86** - Add Zod schema for query validation in GET /api/grid-data

### Zmodyfikowane i dodane pliki (27 plików, +2886, -135 linii)

**Nowe pliki:**
- `src/lib/services/grid-data.service.ts` (149 linii)
- `src/pages/api/grid-data.ts` (90 linii)
- `src/lib/validation/grid-data.schemas.ts` (32 linii)
- `src/lib/utils/grid-helpers.ts` (23 linii)
- `src/components/ui/sonner.tsx` (32 linii)
- `src/test/lib/utils/grid-helpers.test.ts` (120 linii)
- `e2e/grid-data-api.spec.ts` (90 linii)

**Zmodyfikowane pliki:**
- `src/lib/services/value-entry.service.ts` - nowa logika obliczania cash_flow/gain_loss
- `src/lib/stores/useDashboardStore.ts` - akcja addColumn() i fetchData()
- `src/components/dashboard/EditValueModal.tsx` - zaawansowana logika useReducer
- `src/components/dashboard/DashboardToolbar.tsx` - obsługa dodawania kolumn
- Wszystkie komponenty DataGrid (Cell, Header, Row, SummaryRow)

---

## 🎯 Zakres funkcjonalności do przetestowania

### 1. GridDataService (Backend)
- Pobieranie kont i wartości z Supabase
- Filtrowanie po zakresie dat (from, to)
- Filtrowanie zarchiwizowanych kont
- Formatowanie danych do GridDataDto
- Obliczanie podsumowania (net_worth) dla każdej daty
- Obsługa pustych stanów (brak kont, brak wpisów)

### 2. ValueEntryService (Backend)
- Automatyczne obliczanie cash_flow i gain_loss
- Logika dla różnych typów kont:
  - **cash_asset**: zmiana wartości = cash_flow, gain_loss = 0
  - **investment_asset**: zmiana wartości = gain_loss, cash_flow = 0
  - **liability**: zmiana wartości = -cash_flow (odwrócony znak), gain_loss = 0
- Scenariusz 1: Tylko wartość podana
- Scenariusz 2: Wartość + cash_flow podane → oblicz gain_loss
- Scenariusz 3: Wszystkie 3 podane → walidacja spójności
- Obsługa modyfikacji przez użytkownika (userModified flags)

### 3. Store: addColumn() (Frontend)
- Walidacja: brak kont
- Walidacja: data w przyszłości
- Walidacja: duplikacja kolumny
- Znajdowanie ostatnich wartości (findLastEntry)
- Sekwencyjne tworzenie wpisów dla wszystkich kont
- Obsługa błędów częściowych (niektóre konta OK, niektóre błąd)
- Toast notifications (sukces, partial error, error)
- Odświeżanie danych po zapisie

### 4. Store: fetchData() (Frontend)
- Pobieranie danych z GET /api/grid-data
- Parsowanie GridDataDto
- Obliczanie summaryData (net_worth, assets, liabilities)
- Obsługa błędów sieciowych
- Cache busting (skipCache parameter)

### 5. EditValueModal (Frontend)
- Auto-calculation logic z useReducer
- Śledzenie ostatnio zmodyfikowanego pola
- Logika dla różnych typów kont (investment vs cash vs liability)
- Prefilling danych z istniejącego wpisu
- Walidacja formularza
- Submit i rollback w przypadku błędu

### 6. DashboardToolbar (Frontend)
- Przycisk "Dodaj kolumnę"
- Wybór daty z kalendarza
- Blokada przyszłych dat
- Loading state podczas dodawania
- Toast notifications

### 7. Endpoint GET /api/grid-data (API)
- Walidacja query params (from, to, archived)
- Wywołanie GridDataService
- Zwracanie GridDataDto
- Obsługa błędów (401, 400, 500)

### 8. Endpoint POST /api/value-entries (API)
- Walidacja requestu (Zod schema)
- Wywołanie ValueEntryService
- Zwracanie ValueEntryDto
- Obsługa błędów walidacji

---

## 🧪 Plan testów jednostkowych (Vitest)

### 1. GridDataService (`src/test/services/grid-data.service.test.ts`) ⭐ NOWY

```typescript
describe('GridDataService', () => {
  describe('getGridData', () => {
    // Happy path
    it('should return formatted GridDataDto with accounts and entries', async () => {
      // Given: mock Supabase z 2 kontami i 3 datami
      // When: getGridData wywołane
      // Then: zwraca GridDataDto z poprawną strukturą
    });

    it('should filter archived accounts when showArchived is false', async () => {
      // Given: mock z 1 active + 1 archived account
      // When: getGridData({ showArchived: false })
      // Then: zwraca tylko active account
    });

    it('should include archived accounts when showArchived is true', async () => {
      // Given: mock z 1 active + 1 archived account
      // When: getGridData({ showArchived: true })
      // Then: zwraca oba konta
    });

    it('should filter entries by date range (from)', async () => {
      // Given: entries od 2024-01-01 do 2024-03-01
      // When: getGridData({ from: '2024-02-01' })
      // Then: zwraca tylko entries >= 2024-02-01
    });

    it('should filter entries by date range (to)', async () => {
      // Given: entries od 2024-01-01 do 2024-03-01
      // When: getGridData({ to: '2024-02-01' })
      // Then: zwraca tylko entries <= 2024-02-01
    });

    it('should calculate summary net_worth correctly', async () => {
      // Given: 1 asset (1000) + 1 liability (500)
      // When: getGridData()
      // Then: summary['date'].net_worth = 1000 - 500 = 500
    });

    it('should handle multiple account types in net_worth calculation', async () => {
      // Given: 2 assets (1000, 2000) + 1 liability (500)
      // When: getGridData()
      // Then: summary net_worth = 1000 + 2000 - 500 = 2500
    });

    // Edge cases
    it('should return empty GridDataDto when no accounts exist', async () => {
      // Given: mock Supabase z pustą tabelą accounts
      // When: getGridData()
      // Then: { dates: [], accounts: [], summary: {} }
    });

    it('should return accounts with empty entries when no value_entries exist', async () => {
      // Given: mock z 1 kontem, 0 wpisów
      // When: getGridData()
      // Then: { dates: [], accounts: [{ entries: {} }], summary: {} }
    });

    it('should sort dates chronologically', async () => {
      // Given: entries z datami: 2024-03-01, 2024-01-01, 2024-02-01
      // When: getGridData()
      // Then: dates = ['2024-01-01', '2024-02-01', '2024-03-01']
    });

    it('should extract unique dates from entries', async () => {
      // Given: 2 konta, obie z wpisami na te same daty
      // When: getGridData()
      // Then: dates zawiera każdą datę tylko raz
    });

    // Error handling
    it('should throw error when accounts query fails', async () => {
      // Given: mock Supabase returning error
      // When: getGridData()
      // Then: throws Error with message
    });

    it('should throw error when value_entries query fails', async () => {
      // Given: mock accounts OK, value_entries error
      // When: getGridData()
      // Then: throws Error with message
    });
  });
});
```

**Priorytet:** 🔴 Wysoki (nowa funkcjonalność, core logic)

---

### 2. ValueEntryService - rozszerzenie testów (`src/test/services/value-entry.service.test.ts`) ⭐ ROZSZERZYĆ

**Istniejące testy:** Zaktualizowane w commicie 7502b0c

**Nowe testy do dodania:**

```typescript
describe('ValueEntryService', () => {
  describe('calculateCashFlowAndGainLoss', () => {
    
    // NOWE: Testy dla liability z odwróconym znakiem
    describe('liability account with multiplier logic', () => {
      it('should calculate cash_flow with negative multiplier for liability when only value provided', () => {
        // Given: previousValue = 1000, value = 1200, type = 'liability'
        // When: calculateCashFlowAndGainLoss(1200, 1000, 'liability')
        // Then: { cash_flow: -200, gain_loss: 0 } (odwrócony znak!)
      });

      it('should apply multiplier correctly when cash_flow provided for liability', () => {
        // Given: previousValue = 1000, value = 1300, cash_flow = 100, type = 'liability'
        // When: calculateCashFlowAndGainLoss(1300, 1000, 'liability', 100)
        // Then: { cash_flow: 100, gain_loss: 1300 - 1000 - (100 * -1) = 200 }
      });
    });

    // NOWE: Testy dla investment_asset
    describe('investment_asset account', () => {
      it('should assign change to gain_loss when only value provided', () => {
        // Given: previousValue = 10000, value = 10500, type = 'investment_asset'
        // When: calculateCashFlowAndGainLoss(10500, 10000, 'investment_asset')
        // Then: { cash_flow: 0, gain_loss: 500 }
      });

      it('should calculate gain_loss when cash_flow provided', () => {
        // Given: previousValue = 10000, value = 11000, cash_flow = 200
        // When: calculateCashFlowAndGainLoss(11000, 10000, 'investment_asset', 200)
        // Then: { cash_flow: 200, gain_loss: 11000 - 10000 - 200 = 800 }
      });
    });

    // NOWE: Testy walidacji (Scenario 3)
    describe('validation when all three values provided', () => {
      it('should pass validation when values are consistent', () => {
        // Given: prev = 1000, value = 1300, cf = 200, gl = 100 (1000 + 200 + 100 = 1300)
        // When: calculateCashFlowAndGainLoss(1300, 1000, 'cash_asset', 200, 100)
        // Then: returns { cash_flow: 200, gain_loss: 100 } (no error)
      });

      it('should throw ValidationError when values are inconsistent', () => {
        // Given: prev = 1000, value = 1500, cf = 200, gl = 100 (1000 + 200 + 100 = 1300 ≠ 1500)
        // When: calculateCashFlowAndGainLoss(1500, 1000, 'cash_asset', 200, 100)
        // Then: throws ValidationError with message
      });

      it('should allow small floating point tolerance in validation', () => {
        // Given: prev = 1000.00, value = 1300.0001, cf = 200, gl = 100 (within tolerance)
        // When: calculateCashFlowAndGainLoss(1300.0001, 1000, 'cash_asset', 200, 100)
        // Then: no error (tolerance = 0.0001)
      });
    });
  });
});
```

**Priorytet:** 🔴 Wysoki (zmieniona logika biznesowa)

---

### 3. useDashboardStore - addColumn() (`src/test/stores/useDashboardStore.addColumn.test.ts`) ⭐ NOWY

```typescript
describe('useDashboardStore - addColumn', () => {
  
  describe('validation', () => {
    it('should throw error and show toast if no accounts exist', async () => {
      // Given: store z pustym gridData (no accounts)
      // When: addColumn(new Date())
      // Then: toast.error called, throws Error
    });

    it('should throw error and show toast if date is in the future', async () => {
      // Given: store z kontami
      // When: addColumn(tomorrow)
      // Then: toast.error called, throws Error
    });

    it('should show warning toast and return early if column already exists', async () => {
      // Given: store z gridData.dates = ['2024-01-01']
      // When: addColumn(new Date('2024-01-01'))
      // Then: toast.warning called, no API calls, returns without error
    });

    it('should allow adding column with today\'s date', async () => {
      // Given: store z kontami, dzisiejsza data nie istnieje
      // When: addColumn(new Date())
      // Then: no validation errors
    });
  });

  describe('creating entries', () => {
    it('should create entries for all active accounts', async () => {
      // Given: store z 3 active accounts
      // When: addColumn(date)
      // Then: 3 POST /api/value-entries calls
    });

    it('should copy value from last entry using findLastEntry', async () => {
      // Given: account z entries { '2024-01-01': { value: 1000 } }
      // When: addColumn('2024-02-01')
      // Then: POST body contains value: 1000
    });

    it('should set cash_flow and gain_loss to 0 for new entries', async () => {
      // Given: account z ostatnim wpisem
      // When: addColumn(date)
      // Then: POST body contains cash_flow: 0, gain_loss: 0
    });

    it('should use value 0 if account has no previous entries', async () => {
      // Given: account bez entries
      // When: addColumn(date)
      // Then: POST body contains value: 0
    });
  });

  describe('error handling', () => {
    it('should handle partial errors gracefully', async () => {
      // Given: mock API returns 200 for 2 accounts, 400 for 1 account
      // When: addColumn(date)
      // Then: toast.warning called, fetchData called, addColumnError set
    });

    it('should show success toast when all accounts succeed', async () => {
      // Given: mock API returns 200 for all accounts
      // When: addColumn(date)
      // Then: toast.success called, isAddingColumn = false
    });

    it('should throw error and show toast when all accounts fail', async () => {
      // Given: mock API returns 400 for all accounts
      // When: addColumn(date)
      // Then: toast.error called, throws Error
    });

    it('should call fetchData with skipCache after adding column', async () => {
      // Given: successful addColumn
      // When: addColumn(date)
      // Then: fetchData(true) called (cache busting)
    });
  });

  describe('loading state', () => {
    it('should set isAddingColumn to true during operation', async () => {
      // Given: store initial state
      // When: addColumn(date) called (before completion)
      // Then: isAddingColumn = true
    });

    it('should reset isAddingColumn to false after success', async () => {
      // Given: successful operation
      // When: addColumn(date) completes
      // Then: isAddingColumn = false
    });

    it('should reset isAddingColumn to false after error', async () => {
      // Given: failed operation
      // When: addColumn(date) throws error
      // Then: isAddingColumn = false
    });
  });
});
```

**Priorytet:** 🔴 Wysoki (nowa funkcjonalność, complex logic)

---

### 4. useDashboardStore - fetchData() (`src/test/stores/useDashboardStore.fetchData.test.ts`) ⭐ NOWY

```typescript
describe('useDashboardStore - fetchData', () => {
  
  it('should fetch grid data from API', async () => {
    // Given: mock fetch returning GridDataDto
    // When: fetchData()
    // Then: GET /api/grid-data?archived=false called
  });

  it('should include archived query param based on showArchived state', async () => {
    // Given: store.showArchived = true
    // When: fetchData()
    // Then: GET /api/grid-data?archived=true called
  });

  it('should add cache-busting timestamp when skipCache is true', async () => {
    // Given: store
    // When: fetchData(true)
    // Then: GET /api/grid-data?archived=false&_t=<timestamp> called
  });

  it('should calculate summary data from grid data', async () => {
    // Given: GridDataDto z latestDate i 2 kont (asset + liability)
    // When: fetchData()
    // Then: summaryData correctly calculated
  });

  it('should set empty data instead of error on fetch failure', async () => {
    // Given: mock fetch returns 500
    // When: fetchData()
    // Then: gridData = empty, summaryData = empty, no error thrown
  });

  it('should set isLoading to true during fetch', async () => {
    // Given: before fetchData
    // When: fetchData() (in progress)
    // Then: isLoading = true
  });

  it('should set isLoading to false after fetch completes', async () => {
    // Given: fetchData called
    // When: fetchData() completes
    // Then: isLoading = false
  });

  it('should handle network errors gracefully', async () => {
    // Given: mock fetch throws network error
    // When: fetchData()
    // Then: empty data set, no error thrown
  });
});
```

**Priorytet:** 🟡 Średni (modyfikacja istniejącej funkcji)

---

### 5. grid-helpers (`src/test/lib/utils/grid-helpers.test.ts`) ✅ ISTNIEJE

**Status:** Testy już zaimplementowane (7 testów, wszystkie passing)

```typescript
describe('findLastEntry', () => {
  ✅ should return the last entry chronologically
  ✅ should return null if no entries exist
  ✅ should return null if allDates is empty
  ✅ should skip dates without entries and find the last available entry
  ✅ should return the only entry if there is just one
  ✅ should handle entries with dates not in allDates
  ✅ should return the full entry structure
});
```

**Akcja:** Brak (testy już są)

---

### 6. EditValueModal (Component) (`src/test/components/dashboard/EditValueModal.test.tsx`) ⭐ NOWY

```typescript
describe('EditValueModal', () => {
  
  describe('auto-calculation logic', () => {
    it('should auto-calculate cash_flow for cash_asset when only value changed', () => {
      // Given: modal open, previousValue = 1000, type = cash_asset
      // When: user sets value = 1200
      // Then: cash_flow = 200, gain_loss = 0 (auto-filled)
    });

    it('should auto-calculate gain_loss for investment_asset when only value changed', () => {
      // Given: modal open, previousValue = 10000, type = investment_asset
      // When: user sets value = 10500
      // Then: cash_flow = 0, gain_loss = 500 (auto-filled)
    });

    it('should use negative multiplier for liability', () => {
      // Given: previousValue = 1000, type = liability
      // When: user sets value = 1200
      // Then: cash_flow = -200, gain_loss = 0
    });

    it('should recalculate gain_loss when user manually changes cash_flow', () => {
      // Given: value = 1500, previousValue = 1000
      // When: user manually sets cash_flow = 300
      // Then: gain_loss auto-calculated = 1500 - 1000 - 300 = 200
    });

    it('should recalculate cash_flow when user manually changes gain_loss', () => {
      // Given: value = 1500, previousValue = 1000
      // When: user manually sets gain_loss = 200
      // Then: cash_flow auto-calculated = 1500 - 1000 - 200 = 300
    });

    it('should track which field was last modified', () => {
      // Given: modal open
      // When: user changes value, then cash_flow
      // Then: lastModified = 'cash_flow'
    });
  });

  describe('form submission', () => {
    it('should call updateValueEntry with correct command', async () => {
      // Given: form filled with value, cash_flow, gain_loss
      // When: user clicks "Zapisz"
      // Then: updateValueEntry called with UpsertValueEntryCommand
    });

    it('should show loading state during submission', async () => {
      // Given: form submitted
      // When: updateValueEntry in progress
      // Then: button shows "Zapisywanie...", disabled
    });

    it('should show error message if submission fails', async () => {
      // Given: mock updateValueEntry throws error
      // When: form submitted
      // Then: error message displayed below form
    });

    it('should close modal after successful submission', async () => {
      // Given: form submitted successfully
      // When: updateValueEntry resolves
      // Then: closeModal called
    });
  });

  describe('prefilling data', () => {
    it('should prefill form with existing entry data', () => {
      // Given: gridData contains entry for account+date
      // When: modal opens
      // Then: form fields contain existing values
    });

    it('should use previousValue if no entry exists', () => {
      // Given: gridData has no entry for this date
      // When: modal opens
      // Then: value field shows previousValue
    });
  });

  describe('context display', () => {
    it('should display account name from gridData', () => {
      // Given: modal open for account "mBank"
      // When: rendered
      // Then: shows "Konto: mBank"
    });

    it('should display formatted date', () => {
      // Given: date = '2024-01-15'
      // When: rendered
      // Then: shows "Data: 15 stycznia 2024"
    });

    it('should display formatted previous value', () => {
      // Given: previousValue = 1234.56
      // When: rendered
      // Then: shows "1 234,56 zł"
    });
  });
});
```

**Priorytet:** 🟡 Średni (złożony komponent, ale logika już zaimplementowana)

---

### 7. DashboardToolbar (Component) (`src/test/components/dashboard/DashboardToolbar.test.tsx`) ⭐ ROZSZERZYĆ

**Istniejący plik:** `src/test/components/dashboard/DashboardToolbar.test.tsx`

**Nowe testy do dodania:**

```typescript
describe('DashboardToolbar - Add Column', () => {
  
  it('should open calendar popover when "Dodaj kolumnę" clicked', () => {
    // Given: toolbar rendered
    // When: user clicks "Dodaj kolumnę"
    // Then: calendar popover opens
  });

  it('should disable future dates in calendar', () => {
    // Given: calendar open
    // When: rendered
    // Then: dates after today are disabled
  });

  it('should call addColumn when date selected from calendar', async () => {
    // Given: calendar open, mock addColumn
    // When: user selects date
    // Then: addColumn(date) called
  });

  it('should show loading state during addColumn', async () => {
    // Given: isAddingColumn = true
    // When: rendered
    // Then: button shows "Dodawanie...", disabled
  });

  it('should close popover after successful addColumn', async () => {
    // Given: date selected, addColumn succeeds
    // When: addColumn resolves
    // Then: popover closes
  });

  it('should keep popover open if addColumn fails', async () => {
    // Given: date selected, addColumn throws error
    // When: addColumn rejects
    // Then: popover stays open (user can retry)
  });
});
```

**Priorytet:** 🟢 Niski (prosta integracja z store)

---

## 🌐 Plan testów E2E (Playwright)

### 1. Grid Data API Endpoint (`e2e/grid-data-api.spec.ts`) ✅ ISTNIEJE

**Status:** Testy już zaimplementowane (90 linii)

**Zakres:**
- GET /api/grid-data zwraca poprawne dane
- Filtrowanie po archived
- Filtrowanie po zakresie dat (from, to)
- Autoryzacja (401 bez tokena)

**Akcja:** Uruchomić i zweryfikować czy wszystkie testy przechodzą

---

### 2. Add Column - Full Flow (`e2e/add-column-flow.spec.ts`) ⭐ NOWY

```typescript
test.describe('Add Column Feature', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login and navigate to dashboard
    await page.goto('/login');
    // ... login steps
    await page.waitForURL('/');
  });

  test('should successfully add new column with current date', async ({ page }) => {
    // 1. Verify initial state (no column for today)
    const today = format(new Date(), 'dd.MM.yyyy');
    await expect(page.locator(`[data-testid="column-header-${today}"]`)).not.toBeVisible();

    // 2. Click "Dodaj kolumnę" button
    await page.click('button:has-text("Dodaj kolumnę")');

    // 3. Calendar popover should open
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // 4. Select today's date
    await page.click(`[data-today="true"]`);

    // 5. Verify loading state
    await expect(page.locator('button:has-text("Dodawanie...")')).toBeVisible();

    // 6. Verify success toast
    await expect(page.locator('.sonner-toast:has-text("Pomyślnie dodano kolumnę")')).toBeVisible();

    // 7. Verify new column appears in grid
    await expect(page.locator(`[data-testid="column-header-${today}"]`)).toBeVisible();

    // 8. Verify values are copied from last column
    // (Check that all cells in new column have same values as previous column)
  });

  test('should prevent adding duplicate date', async ({ page }) => {
    // 1. Add column for specific date
    await page.click('button:has-text("Dodaj kolumnę")');
    await page.click(`[data-date="2024-01-15"]`);
    await page.waitForSelector('.sonner-toast:has-text("Pomyślnie")');

    // 2. Try to add same date again
    await page.click('button:has-text("Dodaj kolumnę")');
    await page.click(`[data-date="2024-01-15"]`);

    // 3. Verify warning toast
    await expect(page.locator('.sonner-toast:has-text("już istnieje")')).toBeVisible();

    // 4. Verify no duplicate column created
    const headers = page.locator('[data-testid^="column-header-"]');
    const count = await headers.count();
    // Count should not increase
  });

  test('should disable future dates in calendar', async ({ page }) => {
    // 1. Open calendar
    await page.click('button:has-text("Dodaj kolumnę")');

    // 2. Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 3. Verify future date is disabled
    await expect(page.locator(`[data-date="${format(tomorrow, 'yyyy-MM-dd')}"]`)).toBeDisabled();
  });

  test('should show error when adding column with no accounts', async ({ page }) => {
    // 1. Ensure no accounts exist (delete all if any)
    // ... cleanup steps

    // 2. Try to add column
    await page.click('button:has-text("Dodaj kolumnę")');
    await page.click(`[data-today="true"]`);

    // 3. Verify error toast
    await expect(page.locator('.sonner-toast:has-text("Brak kont")')).toBeVisible();
  });

  test('should handle partial errors gracefully', async ({ page }) => {
    // 1. Mock API to return error for one account
    await page.route('**/api/value-entries', (route) => {
      // Return 400 for first request, 200 for others
    });

    // 2. Add column
    await page.click('button:has-text("Dodaj kolumnę")');
    await page.click(`[data-today="true"]`);

    // 3. Verify warning toast with partial success message
    await expect(page.locator('.sonner-toast:has-text("Częściowo dodano")')).toBeVisible();

    // 4. Verify data was refreshed (some cells populated)
  });

  test('should support keyboard navigation', async ({ page }) => {
    // 1. Tab to "Dodaj kolumnę" button
    await page.keyboard.press('Tab'); // Navigate to button
    await page.keyboard.press('Enter'); // Open popover

    // 2. Navigate calendar with arrow keys
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Enter'); // Select date

    // 3. Verify column added
    // ...
  });

  test('should auto-scroll to new column after adding', async ({ page }) => {
    // 1. Add many columns to force horizontal scroll
    // ...

    // 2. Add new column
    await page.click('button:has-text("Dodaj kolumnę")');
    await page.click(`[data-today="true"]`);

    // 3. Verify scroll position moved to latest column
    const scrollLeft = await page.evaluate(() => {
      return document.querySelector('[data-testid="data-grid"]')?.scrollLeft;
    });
    expect(scrollLeft).toBeGreaterThan(0);
  });
});
```

**Priorytet:** 🔴 Wysoki (core user flow)

---

### 3. Edit Value in Cell (`e2e/edit-value-flow.spec.ts`) ⭐ NOWY

```typescript
test.describe('Edit Value in Cell', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Login and ensure test data exists
  });

  test('should open EditValueModal when cell clicked', async ({ page }) => {
    // 1. Click on a cell
    await page.click('[data-testid="grid-cell-account1-2024-01-15"]');

    // 2. Verify modal opens
    await expect(page.locator('dialog:has-text("Edytuj wartość")')).toBeVisible();

    // 3. Verify context info displayed
    await expect(page.locator('text=Konto:')).toBeVisible();
    await expect(page.locator('text=Data:')).toBeVisible();
    await expect(page.locator('text=Poprzednia wartość:')).toBeVisible();
  });

  test('should auto-calculate cash_flow for cash_asset', async ({ page }) => {
    // 1. Open modal for cash_asset account with previousValue = 1000
    await page.click('[data-testid="grid-cell-cashaccount-2024-01-15"]');

    // 2. Enter new value = 1200
    await page.fill('input[name="value"]', '1200');

    // 3. Verify cash_flow auto-calculated = 200
    await expect(page.locator('input[name="cash_flow"]')).toHaveValue('200.00');

    // 4. Verify gain_loss = 0
    await expect(page.locator('input[name="gain_loss"]')).toHaveValue('0.00');
  });

  test('should auto-calculate gain_loss for investment_asset', async ({ page }) => {
    // 1. Open modal for investment_asset with previousValue = 10000
    await page.click('[data-testid="grid-cell-investment-2024-01-15"]');

    // 2. Enter new value = 10500
    await page.fill('input[name="value"]', '10500');

    // 3. Verify gain_loss auto-calculated = 500
    await expect(page.locator('input[name="gain_loss"]')).toHaveValue('500.00');

    // 4. Verify cash_flow = 0
    await expect(page.locator('input[name="cash_flow"]')).toHaveValue('0.00');
  });

  test('should recalculate when user manually edits cash_flow', async ({ page }) => {
    // 1. Open modal
    await page.click('[data-testid="grid-cell-account-2024-01-15"]');

    // 2. Enter value = 1500
    await page.fill('input[name="value"]', '1500');

    // 3. Manually change cash_flow = 300
    await page.fill('input[name="cash_flow"]', '300');

    // 4. Verify gain_loss recalculated = 200
    await expect(page.locator('input[name="gain_loss"]')).toHaveValue('200.00');
  });

  test('should save value entry and update grid', async ({ page }) => {
    // 1. Open modal
    await page.click('[data-testid="grid-cell-account-2024-01-15"]');

    // 2. Fill form
    await page.fill('input[name="value"]', '1234.56');

    // 3. Click "Zapisz"
    await page.click('button:has-text("Zapisz")');

    // 4. Verify modal closes
    await expect(page.locator('dialog:has-text("Edytuj wartość")')).not.toBeVisible();

    // 5. Verify cell value updated in grid
    await expect(page.locator('[data-testid="grid-cell-account-2024-01-15"]')).toContainText('1 234,56');
  });

  test('should show error if API call fails', async ({ page }) => {
    // 1. Mock API to return error
    await page.route('**/api/value-entries', (route) => route.abort());

    // 2. Open modal and submit
    await page.click('[data-testid="grid-cell-account-2024-01-15"]');
    await page.fill('input[name="value"]', '1234');
    await page.click('button:has-text("Zapisz")');

    // 3. Verify error message
    await expect(page.locator('text=Wystąpił błąd')).toBeVisible();

    // 4. Verify modal stays open
    await expect(page.locator('dialog:has-text("Edytuj wartość")')).toBeVisible();
  });

  test('should rollback optimistic update if save fails', async ({ page }) => {
    // 1. Get original cell value
    const originalValue = await page.locator('[data-testid="grid-cell-account-2024-01-15"]').textContent();

    // 2. Mock API to fail
    await page.route('**/api/value-entries', (route) => route.abort());

    // 3. Edit value
    await page.click('[data-testid="grid-cell-account-2024-01-15"]');
    await page.fill('input[name="value"]', '9999');
    await page.click('button:has-text("Zapisz")');

    // 4. Wait for error
    await page.waitForSelector('text=Wystąpił błąd');

    // 5. Verify cell value rolled back to original
    await expect(page.locator('[data-testid="grid-cell-account-2024-01-15"]')).toHaveText(originalValue);
  });
});
```

**Priorytet:** 🔴 Wysoki (core user flow)

---

### 4. DataGrid Display and Interactions (`e2e/data-grid.spec.ts`) ⭐ NOWY

```typescript
test.describe('DataGrid Component', () => {
  
  test('should display accounts in rows', async ({ page }) => {
    // Verify account names rendered
  });

  test('should display dates in column headers', async ({ page }) => {
    // Verify dates formatted as DD.MM.YYYY
  });

  test('should display values in cells', async ({ page }) => {
    // Verify values formatted as currency
  });

  test('should display summary row at bottom', async ({ page }) => {
    // Verify net_worth calculation
  });

  test('should have sticky first column (account names)', async ({ page }) => {
    // Scroll horizontally, verify names column stays visible
  });

  test('should have sticky header row', async ({ page }) => {
    // Scroll vertically, verify header stays visible
  });

  test('should have sticky summary row at bottom', async ({ page }) => {
    // Scroll vertically, verify summary stays visible
  });

  test('should auto-scroll to latest column on load', async ({ page }) => {
    // Given: grid with many columns
    // When: page loads
    // Then: scroll position at far right
  });

  test('should show dropdown menu on account name click', async ({ page }) => {
    // Click account name → verify menu with Edytuj/Archiwizuj/Usuń
  });

  test('should highlight row on hover', async ({ page }) => {
    // Hover over row → verify hover state
  });

  test('should highlight cell on hover', async ({ page }) => {
    // Hover over cell → verify hover state
  });

  test('should color negative values in red', async ({ page }) => {
    // Verify cells with negative values have red text
  });
});
```

**Priorytet:** 🟡 Średni (visual tests)

---

### 5. Full User Journey (`e2e/full-user-journey.spec.ts`) ⭐ NOWY

```typescript
test.describe('Complete User Journey', () => {
  
  test('new user flow: create account → add column → edit value → verify chart', async ({ page }) => {
    // 1. Login as new user
    await page.goto('/login');
    // ... login

    // 2. Add first account
    await page.click('button:has-text("Dodaj konto")');
    await page.fill('input[name="name"]', 'Test Account');
    await page.selectOption('select[name="type"]', 'cash_asset');
    await page.fill('input[name="initial_value"]', '1000');
    await page.click('button[type="submit"]');

    // 3. Add first column (today)
    await page.click('button:has-text("Dodaj kolumnę")');
    await page.click('[data-today="true"]');
    await page.waitForSelector('.sonner-toast:has-text("Pomyślnie")');

    // 4. Edit value in cell
    await page.click('[data-testid^="grid-cell"]');
    await page.fill('input[name="value"]', '1200');
    await page.click('button:has-text("Zapisz")');

    // 5. Verify chart updated
    await expect(page.locator('[data-testid="net-worth-chart"]')).toBeVisible();
    // Verify chart has data point

    // 6. Verify KPI updated
    await expect(page.locator('[data-testid="kpi-net-worth"]')).toContainText('1 200');
  });

  test('existing user flow: add column → update multiple accounts', async ({ page }) => {
    // 1. Login with existing data
    // 2. Add new column
    // 3. Update 3 different accounts
    // 4. Verify summary calculations
  });
});
```

**Priorytet:** 🟢 Niski (integration smoke test)

---

## 📊 Podsumowanie planu testów

### Testy jednostkowe

| Test Suite | Status | Priorytet | Liczba testów |
|------------|--------|-----------|---------------|
| ✅ grid-helpers.test.ts | Istnieje | - | 7 |
| ⭐ grid-data.service.test.ts | Do zaimplementowania | 🔴 Wysoki | ~13 |
| ⭐ value-entry.service.test.ts | Do rozszerzenia | 🔴 Wysoki | +8 nowych |
| ⭐ useDashboardStore.addColumn.test.ts | Do zaimplementowania | 🔴 Wysoki | ~13 |
| ⭐ useDashboardStore.fetchData.test.ts | Do zaimplementowania | 🟡 Średni | ~8 |
| ⭐ EditValueModal.test.tsx | Do zaimplementowania | 🟡 Średni | ~12 |
| ⭐ DashboardToolbar.test.tsx | Do rozszerzenia | 🟢 Niski | +6 nowych |

**Razem:** ~67 testów jednostkowych

---

### Testy E2E

| Test Suite | Status | Priorytet | Liczba testów |
|------------|--------|-----------|---------------|
| ✅ grid-data-api.spec.ts | Istnieje | - | ~4 |
| ⭐ add-column-flow.spec.ts | Do zaimplementowania | 🔴 Wysoki | 7 |
| ⭐ edit-value-flow.spec.ts | Do zaimplementowania | 🔴 Wysoki | 7 |
| ⭐ data-grid.spec.ts | Do zaimplementowania | 🟡 Średni | 10 |
| ⭐ full-user-journey.spec.ts | Do zaimplementowania | 🟢 Niski | 2 |

**Razem:** ~30 testów E2E

---

## 🚀 Kolejność implementacji

### Faza 1: Backend Unit Tests (Priorytet 🔴)
1. `grid-data.service.test.ts` - 13 testów
2. `value-entry.service.test.ts` - rozszerzenie o 8 testów

**Szacowany czas:** 4-6h

---

### Faza 2: Store Unit Tests (Priorytet 🔴)
3. `useDashboardStore.addColumn.test.ts` - 13 testów
4. `useDashboardStore.fetchData.test.ts` - 8 testów

**Szacowany czas:** 4-6h

---

### Faza 3: E2E Critical Flows (Priorytet 🔴)
5. `add-column-flow.spec.ts` - 7 testów
6. `edit-value-flow.spec.ts` - 7 testów

**Szacowany czas:** 6-8h

---

### Faza 4: Frontend Unit Tests (Priorytet 🟡)
7. `EditValueModal.test.tsx` - 12 testów
8. `DashboardToolbar.test.tsx` - rozszerzenie o 6 testów

**Szacowany czas:** 4-6h

---

### Faza 5: E2E Extended (Priorytet 🟡🟢)
9. `data-grid.spec.ts` - 10 testów
10. `full-user-journey.spec.ts` - 2 testy

**Szacowany czas:** 4-6h

---

## 📝 Notatki do testów

### Mockowanie Supabase w testach jednostkowych

```typescript
// Test helper dla GridDataService
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  })),
};
```

### Test data fixtures

```typescript
// fixtures/accounts.ts
export const mockAccounts = [
  { id: 'acc1', name: 'mBank', type: 'cash_asset' },
  { id: 'acc2', name: 'XTB', type: 'investment_asset' },
  { id: 'acc3', name: 'Kredyt', type: 'liability' },
];

// fixtures/value-entries.ts
export const mockValueEntries = [
  { account_id: 'acc1', date: '2024-01-01', value: 1000, cash_flow: 0, gain_loss: 0 },
  // ...
];
```

### Page Objects dla E2E

```typescript
// e2e/page-objects/dashboard.page.ts
export class DashboardPage {
  async addColumn(date: Date) { /* ... */ }
  async editCell(accountId: string, date: string) { /* ... */ }
  async getColumnHeader(date: string) { /* ... */ }
}
```

---

## ✅ Kryteria akceptacji testów

### Unit Tests
- [ ] Wszystkie testy przechodzą (green)
- [ ] Code coverage backend: >80%
- [ ] Code coverage frontend: >70%
- [ ] Brak flakey tests
- [ ] Czas wykonania <30s

### E2E Tests
- [ ] Wszystkie critical flows (🔴) przechodzą
- [ ] Testy stabilne (3 uruchomienia bez błędów)
- [ ] Czas wykonania całego suite <5 min
- [ ] Screenshots/videos dla failed tests

---

## 🔧 Komendy do uruchamiania testów

```bash
# Unit tests
npm run test:unit                          # Wszystkie
npm run test:unit -- grid-data.service     # Konkretny plik
npm run test:unit:watch                    # Watch mode
npm run test:unit:ui                       # Vitest UI

# E2E tests
npm run test:e2e                           # Wszystkie
npm run test:e2e -- add-column-flow        # Konkretny plik
npm run test:e2e:headed                    # Z widoczną przeglądarką
npm run test:e2e:ui                        # Playwright UI

# Coverage
npm run test:unit -- --coverage           # Z coverage report
```

---

## 📚 Dodatkowe zasoby

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Testing Library Cheatsheet](https://testing-library.com/docs/react-testing-library/cheatsheet/)
- Project: `ai/automated-tests-plan.md` - ogólny plan testów dla całego projektu

---

**Dokument utworzony:** 11.11.2025, 17:44  
**Ostatnia aktualizacja:** 11.11.2025, 19:11  
**Autor:** Claude AI  
**Branch:** feature/grid-data  
**Committy przeanalizowane:** 7502b0c...2b86365 (8 głównych commitów)

---

## 📈 Postęp Implementacji (Stan na 11.11.2025, 19:11)

### ✅ Zaimplementowane Testy Jednostkowe (Faza 1) - 100% UKOŃCZONE

**1. GridDataService** - `src/test/services/grid-data.service.test.ts`
- ✅ Status: 13/13 testów przechodzi
- ✅ Czas wykonania: ~21ms
- ✅ Linter: 0 błędów
- ✅ Data implementacji: 11.11.2025

**Pokrycie:**
- Happy path (4 testy): struktura danych, obliczanie net_worth, typy kont, sortowanie dat
- Filtering (4 testy): archived accounts, date range (from/to)
- Edge cases (3 testy): puste konta, puste wpisy, unikalne daty
- Error handling (2 testy): błędy zapytań accounts i value_entries

**2. ValueEntryService** - `src/test/services/value-entry.service.test.ts`
- ✅ Status: 16/16 testów przechodzi (9 istniejących + 7 nowych)
- ✅ Czas wykonania: ~12ms
- ✅ Linter: 0 błędów
- ✅ Data rozszerzenia: 11.11.2025

**Nowe testy (7):**
- Liability with multiplier (2 testy): odwrócony znak cash_flow
- Investment_asset (2 testy): gain_loss calculation
- Validation Scenario 3 (3 testy): spójność danych, floating point tolerance

---

### ✅ Zaimplementowane Testy Jednostkowe (Faza 2) - 100% UKOŃCZONE

**3. useDashboardStore.addColumn** - `src/test/stores/useDashboardStore.addColumn.test.ts`
- ✅ Status: 15/15 testów przechodzi
- ✅ Czas wykonania: ~67ms
- ✅ Linter: 0 błędów
- ✅ Data implementacji: 11.11.2025, 19:04

**Pokrycie:**
- Validation (4 testy): brak kont, data w przyszłości, duplikacja kolumny, dzisiejsza data
- Creating entries (4 testy): tworzenie dla wszystkich kont, kopiowanie wartości, ustawienie na 0, wartość domyślna
- Error handling (4 testy): partial errors, success toast, complete failure, cache busting
- Loading state (3 testy): isAddingColumn=true, reset po sukcesie, reset po błędzie

**4. useDashboardStore.fetchData** - `src/test/stores/useDashboardStore.fetchData.test.ts`
- ✅ Status: 8/8 testów przechodzi
- ✅ Czas wykonania: ~33ms
- ✅ Linter: 0 błędów
- ✅ Data implementacji: 11.11.2025, 19:08

**Pokrycie:**
- Basic functionality (4 testy): fetch z API, archived query param, cache-busting timestamp, calculate summary data
- Error handling (2 testy): fetch failure (empty data), network errors gracefully
- Loading state (2 testy): isLoading=true podczas fetch, isLoading=false po zakończeniu

---

### 📊 Statystyki

**Postęp ogólny:**
- ✅ **Faza 1 (Backend Unit Tests) - 29 testów - 100% UKOŃCZONE**
- ✅ **Faza 2 (Store Unit Tests) - 23 testy - 100% UKOŃCZONE**
- ✅ **RAZEM: 52 testy jednostkowe przechodzą (78% planu)**
- ⏳ Faza 3 (E2E Critical Flows) - do zrobienia (14 testów)
- ⏳ Faza 4 (Frontend Unit Tests) - do zrobienia (18 testów)
- ⏳ Faza 5 (E2E Extended) - do zrobienia (12 testów)

**Wynik testów (ostatnie uruchomienie):**
```bash
✓ src/test/stores/useDashboardStore.fetchData.test.ts (8 tests) 33ms
✓ src/test/stores/useDashboardStore.addColumn.test.ts (15 tests) 67ms

Test Files  2 passed (2)
Tests       23 passed (23)
Duration    8.94s
```

**Następne kroki według priorytetu:**
- ⏳ Faza 3: E2E Critical Flows (Priorytet 🔴 Wysoki)
  - add-column-flow.spec.ts (7 testów)
  - edit-value-flow.spec.ts (7 testów)
- ⏳ Faza 4: Frontend Unit Tests (Priorytet 🟡 Średni)
  - EditValueModal.test.tsx (12 testów)
  - DashboardToolbar.test.tsx - rozszerzenie (6 testów)
- ⏳ Faza 5: E2E Extended (Priorytet 🟡 Niski)
  - data-grid.spec.ts (10 testów)
  - full-user-journey.spec.ts (2 testy)
