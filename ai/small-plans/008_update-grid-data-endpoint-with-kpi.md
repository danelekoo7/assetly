# Plan Aktualizacji: GET /grid-data - Dodanie KPI

**Data utworzenia:** 14.11.2025  
**Status:** Do implementacji  
**Typ:** Rozszerzenie istniejącego endpointu  
**Priorytet:** Średni (eliminuje potrzebę osobnego endpointu `/dashboard/summary`)

---

## 1. Przegląd zmian

### 1.1. Kontekst

W commicie `870b787` została zaktualizowana specyfikacja API w pliku `ai/api-plan.md`. Główna zmiana dotyczy endpointu `GET /grid-data`, który został rozszerzony o obliczanie kluczowych wskaźników wydajności (KPI) dla dashboardu.

**Cel zmian:**

- Zintegrowanie KPI z endpointem `/grid-data` aby zapewnić spójność danych między siatką a KPI
- Eliminacja potrzeby osobnego endpointu `/dashboard/summary`
- Uproszczenie logiki frontendowej - jeden endpoint dostarcza wszystkie dane dla dashboardu

### 1.2. Porównanie: Stary vs Nowy Endpoint

#### PRZED zmianami (obecny stan):

```typescript
// Struktura odpowiedzi
{
  "dates": ["2023-10-27", "2023-10-28"],
  "accounts": [...],
  "summary": {
    "2023-10-27": { "net_worth": 20000 },
    "2023-10-28": { "net_worth": 20600 }
  }
}

// Typ TypeScript
interface GridDataDto {
  dates: string[];
  accounts: GridAccountDto[];
  summary: Record<string, GridSummaryDto>; // GridSummaryDto = { net_worth: number }
}
```

#### PO zmianach (docelowy stan):

```typescript
// Struktura odpowiedzi
{
  "dates": ["2023-10-27", "2023-10-28"],
  "accounts": [...],
  "summary": {
    "by_date": {
      "2023-10-27": { "net_worth": 20000 },
      "2023-10-28": { "net_worth": 20600 }
    },
    "kpi": {
      "net_worth": 20600.0,           // Stan na ostatnią datę
      "total_assets": 20600.0,         // Stan na ostatnią datę
      "total_liabilities": 0.0,        // Stan na ostatnią datę
      "cumulative_cash_flow": 600.0,   // Suma w zakresie dat
      "cumulative_gain_loss": 250.0    // Suma w zakresie dat
    }
  }
}

// Nowy typ TypeScript
interface GridDataDto {
  dates: string[];
  accounts: GridAccountDto[];
  summary: {
    by_date: Record<string, GridSummaryDto>; // GridSummaryDto = { net_worth: number }
    kpi: {
      net_worth: number;
      total_assets: number;
      total_liabilities: number;
      cumulative_cash_flow: number;
      cumulative_gain_loss: number;
    };
  };
}
```

### 1.3. Kluczowe różnice

| Aspekt                     | Przed                                    | Po                                         |
| -------------------------- | ---------------------------------------- | ------------------------------------------ |
| **Struktura summary**      | Płaska: `Record<string, GridSummaryDto>` | Zagnieżdżona: `{ by_date: ..., kpi: ... }` |
| **Net worth per date**     | `summary[date].net_worth`                | `summary.by_date[date].net_worth`          |
| **KPI**                    | Brak                                     | Nowy obiekt `summary.kpi` z 5 metrykami    |
| **Złożoność obliczeniowa** | O(D × N)                                 | O(D × N) + O(N) dla KPI                    |
| **Rozmiar odpowiedzi**     | ~10KB                                    | ~10KB + ~150 bytes dla KPI                 |

---

## 2. Szczegółowy zakres zmian

### 2.1. Aktualizacja typu w `src/types.ts`

**Plik:** `src/types.ts`

**PRZED:**

```typescript
export interface GridSummaryDto {
  net_worth: number;
}

export interface GridDataDto {
  dates: string[];
  accounts: GridAccountDto[];
  summary: Record<string, GridSummaryDto>;
}
```

**PO:**

```typescript
export interface GridSummaryDto {
  net_worth: number;
}

// NOWY interfejs dla KPI
export interface GridKpiDto {
  net_worth: number; // Stan na ostatnią datę w zakresie
  total_assets: number; // Stan na ostatnią datę w zakresie
  total_liabilities: number; // Stan na ostatnią datę w zakresie
  cumulative_cash_flow: number; // Suma wszystkich cash_flow w zakresie
  cumulative_gain_loss: number; // Suma wszystkich gain_loss w zakresie
}

// ZAKTUALIZOWANY interfejs GridDataDto
export interface GridDataDto {
  dates: string[];
  accounts: GridAccountDto[];
  summary: {
    by_date: Record<string, GridSummaryDto>; // Net worth dla każdej daty (do wykresu)
    kpi: GridKpiDto; // Agregowane metryki dla zakresu
  };
}
```

**Uzasadnienie zmian:**

- `by_date`: Zachowuje poprzednią funkcjonalność (dane do wykresu net worth)
- `kpi`: Nowy obiekt zawierający metryki dashboard
- **Breaking change**: Zmiana struktury `summary` wymaga aktualizacji frontendu

---

### 2.2. Aktualizacja serwisu `GridDataService`

**Plik:** `src/lib/services/grid-data.service.ts`

#### 2.2.1. Dodanie logiki obliczania KPI

**Lokalizacja w funkcji `getGridData`:** Po kroku obliczania `summary` (krok 2.6)

**Nowy kod do dodania:**

```typescript
// Krok 2.6: Oblicz summary (net_worth) dla każdej daty
const summaryByDate: Record<string, GridSummaryDto> = {};

dates.forEach((date) => {
  let netWorth = 0;

  gridAccounts.forEach((account) => {
    const entry = account.entries[date];
    if (entry) {
      if (account.type === "liability") {
        netWorth -= entry.value; // Pasywa odejmujemy
      } else {
        netWorth += entry.value; // Aktywa dodajemy
      }
    }
  });

  summaryByDate[date] = { net_worth: netWorth };
});

// NOWY KROK 2.7: Oblicz KPI
let total_assets = 0;
let total_liabilities = 0;
let cumulative_cash_flow = 0;
let cumulative_gain_loss = 0;

// Znajdź ostatnią datę w zakresie
const lastDate = dates.length > 0 ? dates[dates.length - 1] : null;

if (lastDate) {
  // Oblicz total_assets i total_liabilities na podstawie ostatniej daty
  gridAccounts.forEach((account) => {
    const lastEntry = account.entries[lastDate];
    if (lastEntry) {
      if (account.type === "liability") {
        total_liabilities += lastEntry.value;
      } else {
        // cash_asset lub investment_asset
        total_assets += lastEntry.value;
      }
    }
  });
}

// Oblicz cumulative_cash_flow i cumulative_gain_loss
// Suma wszystkich wpisów w zakresie dat (dla wszystkich kont)
dates.forEach((date) => {
  gridAccounts.forEach((account) => {
    const entry = account.entries[date];
    if (entry) {
      cumulative_cash_flow += entry.cash_flow ?? 0;
      cumulative_gain_loss += entry.gain_loss ?? 0;
    }
  });
});

const kpi: GridKpiDto = {
  net_worth: total_assets - total_liabilities,
  total_assets,
  total_liabilities,
  cumulative_cash_flow,
  cumulative_gain_loss,
};

// Krok 2.8: Zwróć zaktualizowany GridDataDto
return {
  dates,
  accounts: gridAccounts,
  summary: {
    by_date: summaryByDate,
    kpi,
  },
};
```

#### 2.2.2. Uzasadnienie logiki obliczeniowej

**KPI bazujące na ostatniej dacie** (`net_worth`, `total_assets`, `total_liabilities`):

- Reprezentują **aktualny stan** na koniec wybranego okresu
- Użytkownik widzi swój majątek **na dzień** (ostatnia data w zakresie)
- Logika: iteruj po kontach, pobierz wpis z `lastDate`, zsumuj według typu

**KPI skumulowane** (`cumulative_cash_flow`, `cumulative_gain_loss`):

- Reprezentują **całkowity ruch** w wybranym okresie
- Użytkownik widzi ile wpłacił/wypłacił i ile zarobił/stracił **w okresie**
- Logika: iteruj po wszystkich datach i kontach, zsumuj cash_flow i gain_loss

**Zgodność z PRD (US-010):**

> "The dashboard should display the user's current net worth and a breakdown of their assets and liabilities. Additionally, it should show cumulative cash flow and gains/losses over the selected time period."

---

### 2.3. Handler API - brak zmian

**Plik:** `src/pages/api/grid-data.ts`

**Status:** ✅ Bez zmian

**Uzasadnienie:**

- Handler tylko przekazuje dane z serwisu do klienta
- Zmiana struktury danych nie wymaga modyfikacji handlera
- Walidacja query params pozostaje bez zmian

---

### 2.4. Aktualizacja testów jednostkowych

**Plik:** `src/test/services/grid-data.service.test.ts`

#### 2.4.1. Aktualizacja istniejących testów

Wszystkie istniejące testy wymagają aktualizacji asercji ze względu na zmianę struktury `summary`:

**PRZED:**

```typescript
expect(result.summary["2024-01-15"].net_worth).toBe(1000);
```

**PO:**

```typescript
expect(result.summary.by_date["2024-01-15"].net_worth).toBe(1000);
```

#### 2.4.2. Nowe testy dla KPI

**Dodać ~8 nowych testów:**

```typescript
describe("GridDataService.getGridData - KPI calculations", () => {
  it("should calculate total_assets from last date entries", async () => {
    // Given: 2 asset accounts with values on last date
    // When: getGridData()
    // Then: summary.kpi.total_assets = sum of asset values on last date
  });

  it("should calculate total_liabilities from last date entries", async () => {
    // Given: 1 liability account with value on last date
    // When: getGridData()
    // Then: summary.kpi.total_liabilities = liability value on last date
  });

  it("should calculate net_worth as assets - liabilities", async () => {
    // Given: assets = 20000, liabilities = 3000
    // When: getGridData()
    // Then: summary.kpi.net_worth = 17000
  });

  it("should calculate cumulative_cash_flow as sum of all entries", async () => {
    // Given: 3 dates, 2 accounts, various cash_flow values
    // When: getGridData()
    // Then: summary.kpi.cumulative_cash_flow = sum of all cash_flow
  });

  it("should calculate cumulative_gain_loss as sum of all entries", async () => {
    // Given: 3 dates, 2 accounts, various gain_loss values
    // When: getGridData()
    // Then: summary.kpi.cumulative_gain_loss = sum of all gain_loss
  });

  it("should return zero KPI when no dates exist", async () => {
    // Given: accounts with no value_entries
    // When: getGridData()
    // Then: all KPI values = 0
  });

  it("should handle null cash_flow and gain_loss gracefully", async () => {
    // Given: entries with null cash_flow or gain_loss
    // When: getGridData()
    // Then: treats null as 0 in calculations
  });

  it("should use only last date for assets/liabilities calculation", async () => {
    // Given: 3 dates, values change over time
    // When: getGridData()
    // Then: total_assets/liabilities reflect only last date values
  });
});
```

**Szacowany czas:** 2-3h (aktualizacja + nowe testy)

---

### 2.5. Aktualizacja integracji frontendowej

**Plik:** `src/lib/stores/useDashboardStore.ts`

#### 2.5.1. Aktualizacja funkcji `fetchData()`

**PRZED:**

```typescript
fetchData: async () => {
  // ... fetch logic ...

  const gridData: GridDataDto = await response.json();

  // Ręczne obliczanie summaryData z gridData
  const latestDate = gridData.dates[gridData.dates.length - 1];
  let total_assets = 0;
  let total_liabilities = 0;
  // ... (dużo ręcznej logiki)

  set({
    gridData,
    summaryData: {
      net_worth,
      total_assets,
      total_liabilities,
      cumulative_cash_flow,
      cumulative_gain_loss,
    },
    isLoading: false,
  });
},
```

**PO:**

```typescript
fetchData: async () => {
  // ... fetch logic ...

  const gridData: GridDataDto = await response.json();

  // KPI są już obliczone w odpowiedzi API!
  const summaryData: DashboardSummaryDto = gridData.summary.kpi;

  set({
    gridData,
    summaryData, // Bezpośrednio z API
    isLoading: false,
  });
},
```

**Korzyści:**

- ✅ Usunięcie ~30 linii duplikującej logiki obliczeniowej
- ✅ Pewność spójności danych (jedna source of truth)
- ✅ Prostszy kod, łatwiejszy w utrzymaniu

#### 2.5.2. Aktualizacja komponentu `NetWorthChart`

**Plik:** `src/components/dashboard/NetWorthChart.tsx`

**Zmiana:**

```typescript
// PRZED
const chartData = gridData.dates.map((date) => ({
  date: formatDate(date),
  netWorth: gridData.summary[date]?.net_worth ?? 0,
}));

// PO
const chartData = gridData.dates.map((date) => ({
  date: formatDate(date),
  netWorth: gridData.summary.by_date[date]?.net_worth ?? 0,
}));
```

---

## 3. Testy E2E - aktualizacje

**Plik:** `e2e/grid-data-api.spec.ts`

**Status:** ✅ Istniejący plik wymaga aktualizacji asercji

**Przykładowe zmiany:**

```typescript
// PRZED
expect(data.summary).toHaveProperty("2024-01-15");
expect(data.summary["2024-01-15"].net_worth).toBeGreaterThan(0);

// PO
expect(data.summary).toHaveProperty("by_date");
expect(data.summary).toHaveProperty("kpi");
expect(data.summary.by_date).toHaveProperty("2024-01-15");
expect(data.summary.by_date["2024-01-15"].net_worth).toBeGreaterThan(0);
expect(data.summary.kpi).toHaveProperty("net_worth");
expect(data.summary.kpi).toHaveProperty("total_assets");
expect(data.summary.kpi).toHaveProperty("total_liabilities");
expect(data.summary.kpi).toHaveProperty("cumulative_cash_flow");
expect(data.summary.kpi).toHaveProperty("cumulative_gain_loss");
```

**Nowe testy do dodania:**

1. **Test: KPI reflect last date values**
   - Dodaj 2 konta, 3 daty
   - Weryfikuj że `kpi.net_worth` = wartość z ostatniej daty
2. **Test: Cumulative metrics sum all entries**
   - Dodaj konto, 3 daty z różnymi cash_flow
   - Weryfikuj że `kpi.cumulative_cash_flow` = suma wszystkich

---

## 4. Dokumentacja - aktualizacje

### 4.1. Plik: `ai/small-plans/005_get-grid-data-implementation-plan.md`

**Status:** Do aktualizacji (dodać sekcję "Historia zmian")

**Dodać na końcu pliku:**

```markdown
---

## Historia zmian

### 14.11.2025 - Rozszerzenie o KPI (commit 870b787)

**Zmiana:** Dodanie obiektu `kpi` do pola `summary` w odpowiedzi.

**Uzasadnienie:**

- Integracja KPI z endpointem `/grid-data` zapewnia spójność danych
- Eliminacja potrzeby osobnego endpointu `/dashboard/summary`
- Uproszczenie logiki frontendowej

**Breaking change:**

- Struktura `summary` zmieniła się z `Record<string, GridSummaryDto>` na `{ by_date: ..., kpi: ... }`
- Wymaga aktualizacji frontendu (komponenty korzystające z `gridData.summary`)

**Szczegóły implementacji:** Zobacz `ai/small-plans/008_update-grid-data-endpoint-with-kpi.md`
```

### 4.2. Plik: `CLAUDE.md`

**Status:** Do aktualizacji (sekcja "Common Commands")

**Brak zmian wymaganych** - endpoint pozostaje ten sam (`GET /api/grid-data`), tylko format odpowiedzi się zmienił.

---

## 5. Kolejność implementacji (Step-by-step)

### Krok 1: Aktualizacja typów (15 min)

- [ ] Zaktualizować `GridDataDto` w `src/types.ts`
- [ ] Dodać nowy interfejs `GridKpiDto`
- [ ] Uruchomić TypeScript compiler i naprawić błędy typów

### Krok 2: Aktualizacja serwisu (30 min)

- [ ] Dodać logikę obliczania KPI w `GridDataService.getGridData()`
- [ ] Zmienić zwracaną strukturę `summary` na `{ by_date, kpi }`
- [ ] Przetestować manualnie z HTTP client (np. REST Client)

### Krok 3: Aktualizacja testów jednostkowych (2-3h)

- [ ] Zaktualizować wszystkie istniejące testy (zmiana asercji)
- [ ] Dodać 8 nowych testów dla logiki KPI
- [ ] Uruchomić `npm run test:unit` - wszystkie testy powinny przechodzić

### Krok 4: Aktualizacja frontendu (1h)

- [ ] Zaktualizować `useDashboardStore.fetchData()` - usunąć duplikującą logikę
- [ ] Zaktualizować `NetWorthChart` - zmiana ścieżki do `summary.by_date`
- [ ] Przetestować aplikację w przeglądarce - weryfikacja KPI i wykresu

### Krok 5: Aktualizacja testów E2E (30 min)

- [ ] Zaktualizować `e2e/grid-data-api.spec.ts` - asercje struktury
- [ ] Dodać 2 nowe testy dla KPI
- [ ] Uruchomić `npm run test:e2e` - wszystkie testy powinny przechodzić

### Krok 6: Dokumentacja (15 min)

- [ ] Zaktualizować `005_get-grid-data-implementation-plan.md`
- [ ] Dodać komentarze JSDoc do nowych funkcji

### Krok 7: Code review i finalizacja (30 min)

- [ ] Sprawdzić czy wszystkie testy przechodzą
- [ ] Uruchomić linter (`npm run lint`)
- [ ] Zweryfikować działanie w przeglądarce (pełny flow użytkownika)
- [ ] Przygotować commit z opisem zmian

**Łączny szacowany czas:** 5-6h

---

## 6. Breaking Changes i migracja

### 6.1. Dla frontendowej logiki

**Breaking change:** Zmiana struktury pola `summary` w `GridDataDto`

**Przed:**

```typescript
const netWorth = gridData.summary["2024-01-15"].net_worth;
```

**Po:**

```typescript
const netWorth = gridData.summary.by_date["2024-01-15"].net_worth;
```

**Strategia migracji:**

1. Zaktualizować typy TypeScript
2. TypeScript compiler automatycznie pokaże wszystkie miejsca wymagające zmian
3. Zastąpić `summary[date]` → `summary.by_date[date]`

### 6.2. Kompatybilność wsteczna

**NIE MA kompatybilności wstecznej** - to jest breaking change.

**Dlaczego?**

- Zmiana kształtu danych wymaga jednoczesnej aktualizacji backendu i frontendu
- Brak sensu utrzymywać starą strukturę - nie ma wielu konsumentów API

**Zalecenie:**

- Wdrożyć zmiany na branchu feature
- Przetestować kompleksowo przed merge do main
- Wdrożyć backend i frontend jednocześnie

---

## 7. Metryki sukcesu

### Funkcjonalne

- ✅ Endpoint zwraca nową strukturę `summary` z `by_date` i `kpi`
- ✅ KPI są obliczane poprawnie (weryfikacja w testach)
- ✅ Wykres net worth działa (używa `summary.by_date`)
- ✅ Dashboard KPI wyświetlają się poprawnie (używa `summary.kpi`)

### Techniczne

- ✅ Wszystkie testy jednostkowe przechodzą (100%)
- ✅ Wszystkie testy E2E przechodzą (100%)
- ✅ Brak błędów TypeScript
- ✅ Linter: 0 błędów

### Wydajnościowe

- ✅ Czas odpowiedzi endpointu nie zwiększył się > 10% (marginalny wzrost OK)
- ✅ Rozmiar odpowiedzi zwiększył się tylko o ~150 bytes (KPI)

### Jakościowe

- ✅ Kod jest czytelny i dobrze udokumentowany
- ✅ Logika obliczeniowa jest przetestowana i deterministyczna
- ✅ Brak duplikacji logiki między backendem a frontendem

---

## 8. Ryzyka i mitigacje

| Ryzyko                                | Prawdopodobieństwo | Wpływ  | Mitigacja                                                             |
| ------------------------------------- | ------------------ | ------ | --------------------------------------------------------------------- |
| Breaking change zepsuje produkcję     | Średnie            | Wysoki | Przetestować na feature branch, wdrożyć backend+frontend jednocześnie |
| Wydajność obliczeń KPI                | Niskie             | Średni | Monitorować czas odpowiedzi, optymalizować jeśli > 500ms              |
| Błędy w logice obliczeniowej          | Niskie             | Wysoki | Kompleksowe testy jednostkowe (8 nowych testów)                       |
| Zapomnienie o aktualizacji komponentu | Niskie             | Średni | TypeScript compiler automatycznie wyłapie błędy typów                 |

---

## 9. Powiązane dokumenty

- **Specyfikacja API:** `ai/api-plan.md` (commit 870b787)
- **Oryginalny plan implementacji:** `ai/small-plans/005_get-grid-data-implementation-plan.md`
- **Plan dashboard summary (NIEAKTUALNY):** `ai/small-plans/future-task-007_dashboard-summary-implementation-plan.md`
  - **Uwaga:** Ten plan jest już nieaktualny, ponieważ funkcjonalność została zintegrowana z `/grid-data`
- **Future enhancements:** `ai/future-enhancements.md` - dyskusja o optymalizacjach

---

## 10. Pytania do rozstrzygnięcia

- [ ] **Czy zachować plan `/dashboard/summary`?**
  - Sugestia: Oznaczyć jako DEPRECATED lub przenieść do archiwum
  - Funkcjonalność została zintegrowana z `/grid-data`
- [ ] **Czy dodać feature flag?**
  - Sugestia: NIE dla MVP - to breaking change, wdrożyć od razu
- [ ] **Czy cache'ować odpowiedź?**
  - Sugestia: TAK - dodać `Cache-Control: private, max-age=60`
  - Już jest w obecnym endpoincie, zachować

---

## 11. Checklist przed mergem

### Backend

- [ ] Typ `GridKpiDto` dodany do `src/types.ts`
- [ ] Typ `GridDataDto.summary` zaktualizowany
- [ ] Logika KPI zaimplementowana w `GridDataService`
- [ ] Testy jednostkowe zaktualizowane (istniejące)
- [ ] Testy jednostkowe dodane (8 nowych dla KPI)
- [ ] Wszystkie testy przechodzą (`npm run test:unit`)

### Frontend

- [ ] Store `useDashboardStore` zaktualizowany
- [ ] Komponent `NetWorthChart` zaktualizowany
- [ ] Aplikacja działa w przeglądarce (manual testing)
- [ ] KPI wyświetlają się poprawnie

### Testy E2E

- [ ] Plik `e2e/grid-data-api.spec.ts` zaktualizowany
- [ ] Nowe testy dla KPI dodane
- [ ] Wszystkie testy przechodzą (`npm run test:e2e`)

### Dokumentacja

- [ ] Plik `005_get-grid-data-implementation-plan.md` zaktualizowany
- [ ] Komentarze JSDoc dodane do nowej logiki
- [ ] Plan `/dashboard/summary` oznaczony jako DEPRECATED

### Jakość kodu

- [ ] Linter przechodzi bez błędów (`npm run lint`)
- [ ] TypeScript compiler bez błędów
- [ ] Code review przeprowadzony

---

## 12. Następne kroki po implementacji

1. **Wdrożenie na produkcję:**
   - Wdrożyć backend i frontend jednocześnie
   - Monitorować logi i metryki przez pierwsze 24h
2. **Aktualizacja dokumentacji:**
   - Oznaczyć plan `future-task-007` jako DEPRECATED
   - Dodać link do tego planu w `005_get-grid-data-implementation-plan.md`
3. **Optymalizacje (opcjonalne):**
   - Jeśli wydajność jest problemem (>500ms), rozważyć PostgreSQL function
   - Rozważyć Redis cache dla często powtarzających się zapytań

---

**Dokument utworzony:** 14.11.2025  
**Autor:** Claude AI (na podstawie analizy commit 870b787)  
**Status:** Gotowy do implementacji  
**Szacowany effort:** 5-6h (1 dzień pracy)
