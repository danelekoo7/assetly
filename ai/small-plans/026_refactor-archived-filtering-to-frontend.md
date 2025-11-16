# Plan: Refaktoryzacja filtrowania zarchiwizowanych kont na frontend

## Problem

Obecna implementacja filtruje dane o zarchiwizowanych kontach już na poziomie backendu, co powoduje że:
- KPI (wartość netto, aktywa, pasywa) pokazują tylko dane aktywnych kont gdy checkbox "Pokaż zarchiwizowane" jest odznaczony
- Podsumowanie siatki (sumy kolumn) pokazuje tylko dane aktywnych kont
- Wiersze siatki pokazują tylko aktywne konta

**Pożądane zachowanie:**
- Backend zawsze zwraca WSZYSTKIE konta (aktywne + zarchiwizowane)
- KPI i podsumowanie siatki zawsze obliczane dla WSZYSTKICH kont
- Tylko wiersze siatki są filtrowane frontendowo na podstawie checkboxu

## Analiza aktualnej implementacji

### Backend

**`src/pages/api/grid-data.ts`:**
```typescript
const { from, to, archived } = validationResult.data;
const gridData = await GridDataService.getGridData(supabase, session.user.id, {
  from,
  to,
  showArchived: archived, // ← to trzeba usunąć
});
```

**`src/lib/services/grid-data.service.ts`:**
```typescript
async getGridData(
  supabase: SupabaseClient<Database>,
  userId: string,
  options: { from: string; to: string; showArchived?: boolean }
): Promise<GridDataDto> {
  // Filtrowanie po archived_at gdy showArchived = false
  // ← to trzeba usunąć
}
```

**`src/lib/validation/grid-data.schemas.ts`:**
```typescript
export const getGridDataQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  archived: z.enum(["true", "false"])..., // ← to trzeba usunąć
});
```

### Frontend

**`src/lib/stores/useDashboardStore.ts`:**
```typescript
const params = new URLSearchParams();
params.append("archived", showArchived.toString()); // ← to trzeba usunąć
```

**Komponenty:**
- `IntegratedDashboardPage.tsx` - główny kontener
- `KpiSection.tsx` - oblicza KPI z otrzymanych danych
- `DataGrid.tsx` - renderuje siatkę
- `DataGridRow.tsx` - renderuje pojedynczy wiersz
- `DataGridSummaryRow.tsx` - renderuje wiersz podsumowania

## Plan implementacji

### Krok 1: Modyfikacja backendu

#### 1.1. Usunięcie parametru `archived` z walidacji
**Plik:** `src/lib/validation/grid-data.schemas.ts`

Usunąć pole `archived` ze schematu `getGridDataQuerySchema`:
```typescript
export const getGridDataQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // archived: z.enum(["true", "false"])... ← USUNĄĆ
});
```

#### 1.2. Modyfikacja endpointu API
**Plik:** `src/pages/api/grid-data.ts`

```typescript
// Przed:
const { from, to, archived } = validationResult.data;
const gridData = await GridDataService.getGridData(supabase, session.user.id, {
  from,
  to,
  showArchived: archived,
});

// Po:
const { from, to } = validationResult.data;
const gridData = await GridDataService.getGridData(supabase, session.user.id, {
  from,
  to,
  // showArchived: archived, ← USUNĄĆ
});
```

#### 1.3. Modyfikacja serwisu GridDataService
**Plik:** `src/lib/services/grid-data.service.ts`

1. Zmienić sygnaturę metody `getGridData`:
```typescript
// Przed:
async getGridData(
  supabase: SupabaseClient<Database>,
  userId: string,
  options: { from: string; to: string; showArchived?: boolean }
): Promise<GridDataDto>

// Po:
async getGridData(
  supabase: SupabaseClient<Database>,
  userId: string,
  options: { from: string; to: string }
): Promise<GridDataDto>
```

2. Usunąć logikę filtrowania po `archived_at`:
```typescript
// Przed:
let query = supabase
  .from('accounts')
  .select('*')
  .eq('user_id', userId);

if (!options.showArchived) {
  query = query.is('archived_at', null);
}

// Po:
const query = supabase
  .from('accounts')
  .select('*')
  .eq('user_id', userId);
// Zawsze zwracamy wszystkie konta
```

### Krok 2: Modyfikacja frontendu

#### 2.1. Usunięcie parametru z żądania API
**Plik:** `src/lib/stores/useDashboardStore.ts`

W metodzie `fetchData`:
```typescript
// Przed:
const params = new URLSearchParams();
params.append("from", from);
params.append("to", to);
params.append("archived", showArchived.toString()); // ← USUNĄĆ

// Po:
const params = new URLSearchParams();
params.append("from", from);
params.append("to", to);
// params.append("archived", showArchived.toString()); ← USUNĄĆ
```

#### 2.2. Dodanie lokalnego filtrowania w store
**Plik:** `src/lib/stores/useDashboardStore.ts`

Dodać nową computed property lub getter do filtrowania kont:
```typescript
// W interface DashboardStore dodać:
getFilteredAccounts: () => AccountWithValues[];

// W implementacji:
getFilteredAccounts: () => {
  const { data, showArchived } = get();
  if (!data) return [];
  
  if (showArchived) {
    return data.accounts;
  }
  
  // Filtruj tylko aktywne konta (archived_at === null)
  return data.accounts.filter(account => account.archived_at === null);
},
```

#### 2.3. Modyfikacja komponentu DataGrid
**Plik:** `src/components/dashboard/DataGrid.tsx`

Zmienić sposób renderowania wierszy - używać `getFilteredAccounts()` zamiast `data.accounts`:
```typescript
// Przed:
{data.accounts.map((account) => (
  <DataGridRow key={account.id} account={account} />
))}

// Po:
{getFilteredAccounts().map((account) => (
  <DataGridRow key={account.id} account={account} />
))}
```

#### 2.4. Weryfikacja KPI i podsumowania
**Pliki do sprawdzenia:**
- `src/components/dashboard/KpiSection.tsx`
- `src/components/dashboard/DataGridSummaryRow.tsx`

Upewnić się, że komponenty te korzystają z **pełnych** danych (`data.accounts` lub `data.kpi`), a nie z przefiltrowanych.

**KpiSection.tsx** - powinno używać `data.kpi` (które są już obliczone na backendzie dla wszystkich kont):
```typescript
// Powinno pozostać bez zmian - KPI są obliczane na backendzie
<KpiCard title="Wartość netto" value={data.kpi.netWorth} />
```

**DataGridSummaryRow.tsx** - sprawdzić czy używa `data.accounts` (wszystkie) czy `getFilteredAccounts()`:
```typescript
// Powinno używać data.accounts (wszystkie konta), NIE getFilteredAccounts()
const totalAssets = data.accounts
  .filter(a => a.type === 'ASSET')
  .reduce((sum, account) => {
    // ... obliczenia
  }, 0);
```

### Krok 3: Testy manualne

Po implementacji przetestować:

1. **Checkbox odznaczony (domyślnie):**
   - ✅ Wiersze siatki pokazują tylko aktywne konta
   - ✅ KPI (wartość netto, aktywa, pasywa) pokazują WSZYSTKIE konta
   - ✅ Podsumowanie siatki pokazuje WSZYSTKIE konta

2. **Checkbox zaznaczony:**
   - ✅ Wiersze siatki pokazują wszystkie konta (aktywne + zarchiwizowane)
   - ✅ KPI pokazują wszystkie konta (bez zmian)
   - ✅ Podsumowanie siatki pokazuje wszystkie konta (bez zmian)

3. **Archiwizacja konta:**
   - ✅ Konto znika z siatki (gdy checkbox odznaczony)
   - ✅ KPI i podsumowanie nie zmieniają się
   - ✅ Po zaznaczeniu checkboxu konto pojawia się w siatce

### Krok 4: Aktualizacja testów jednostkowych i E2E

#### 4.1. Testy jednostkowe
**Plik:** `src/test/services/grid-data.service.test.ts`

Usunąć testy związane z parametrem `showArchived`:
```typescript
// USUNĄĆ test:
it('should filter archived accounts when showArchived is false', async () => {
  // ...
});

// DODAĆ test:
it('should always return all accounts regardless of archive status', async () => {
  // ...
});
```

**Plik:** `src/test/stores/useDashboardStore.fetchData.test.ts`

Usunąć asercje sprawdzające parametr `archived` w URLSearchParams:
```typescript
// USUNĄĆ:
expect(mockFetch).toHaveBeenCalledWith(
  expect.stringContaining('archived=false')
);

// DODAĆ test dla getFilteredAccounts():
it('should filter accounts based on showArchived state', () => {
  // ...
});
```

#### 4.2. Testy E2E
**Plik:** `e2e/grid-data-api.spec.ts`

Usunąć lub zmodyfikować testy sprawdzające parametr `archived`:
```typescript
// USUNĄĆ lub ZMODYFIKOWAĆ:
test('should filter archived accounts', async ({ request }) => {
  // Ten test powinien być usunięty, bo backend nie filtruje
});
```

## Podsumowanie zmian

### Backend (zawsze zwraca wszystkie dane):
- ❌ Usunąć parametr `archived` z walidacji (`grid-data.schemas.ts`)
- ❌ Usunąć parametr `showArchived` z endpointu API (`grid-data.ts`)
- ❌ Usunąć logikę filtrowania po `archived_at` z serwisu (`grid-data.service.ts`)

### Frontend (filtruje tylko widok siatki):
- ❌ Usunąć wysyłanie parametru `archived` do API (`useDashboardStore.ts`)
- ✅ Dodać `getFilteredAccounts()` w store (`useDashboardStore.ts`)
- ✅ Używać `getFilteredAccounts()` w DataGrid do renderowania wierszy
- ✅ Upewnić się że KPI i podsumowanie używają wszystkich danych

### Testy:
- ❌ Usunąć/zmodyfikować testy sprawdzające filtrowanie na backendzie
- ✅ Dodać testy dla `getFilteredAccounts()`
- ✅ Zweryfikować testy E2E

## Korzyści tej zmiany

1. **Separacja odpowiedzialności:** Backend odpowiada za dane, frontend za prezentację
2. **Lepsza user experience:** KPI i podsumowania zawsze pokazują pełny obraz finansowy
3. **Mniej requestów:** Nie trzeba refetch'ować danych po zmianie checkboxu
4. **Prostszy backend:** Mniej parametrów, mniej warunków, prostsza logika
5. **Zgodność z PRD:** Zarchiwizowane konta nie powinny znikać z obliczeń wartości netto
