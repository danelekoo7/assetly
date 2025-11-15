# Plan Naprawy: Problem z Cache Po Zmianie Kolejności Kont

## Zidentyfikowany Problem

Po zmianie kolejności kont poprzez drag & drop:
1. Zmiany są poprawnie zapisywane w bazie danych przez `/api/accounts/reorder`
2. Stan lokalny komponentu i Zustand store są aktualizowane optymistycznie
3. **ALE** po odświeżeniu strony zmiany znikają przez ~60 sekund

## Przyczyna

W `src/components/dashboard/DataGrid.tsx` handler `handleDragEnd`:
- ✅ Wywołuje API `/api/accounts/reorder` i zapisuje w bazie
- ✅ Aktualizuje lokalny stan optymistycznie
- ❌ **NIE wywołuje `fetchData(true)` po pomyślnym zapisie**

W `src/pages/api/grid-data.ts`:
- Endpoint zwraca header `Cache-Control: private, max-age=60`
- Po odświeżeniu strony `fetchData()` (bez `skipCache`) pobiera cache'owane dane
- Cache zawiera starą kolejność kont sprzed reorder

## Decyzja: Usunięcie Cache Całkowicie

Po analizie problemu zdecydowano o **całkowitym usunięciu cache'a** z projektu, ponieważ:
- Cache powoduje bugi (nieaktualne dane po odświeżeniu)
- Wymaga dodatkowej logiki `skipCache` w wielu miejscach
- W aplikacji do zarządzania finansami osobistymi dokładność danych jest kluczowa
- Korzyści z cache są minimalne dla tego typu aplikacji

## Rozwiązanie: Usunięcie Cache

### Krok 1: Zmiana nagłówka Cache-Control w API

W `src/pages/api/grid-data.ts` (linia ~67):

**Przed:**
```typescript
return new Response(JSON.stringify(gridData), {
  status: 200,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'private, max-age=60',
  },
});
```

**Po:**
```typescript
return new Response(JSON.stringify(gridData), {
  status: 200,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  },
});
```

### Krok 2: Usunięcie parametru skipCache z useDashboardStore

W `src/lib/stores/useDashboardStore.ts`:

**Przed:**
```typescript
fetchData: async (skipCache = false) => {
  const url = skipCache 
    ? `/api/grid-data?_t=${Date.now()}` 
    : '/api/grid-data';
  // ... reszta kodu
}
```

**Po:**
```typescript
fetchData: async () => {
  const url = '/api/grid-data';
  // ... reszta kodu
}
```

### Krok 3: Zaktualizowanie wszystkich wywołań fetchData

Zmienić wszystkie `fetchData(true)` na `fetchData()` w:
- `src/lib/stores/useDashboardStore.ts` (w funkcjach: addAccount, updateAccount, archiveAccount, deleteAccount, addColumn, deleteColumn, updateValueEntry)

## Pliki do Modyfikacji

1. `src/pages/api/grid-data.ts`
   - Zmienić nagłówek Cache-Control na no-cache, no-store, must-revalidate

2. `src/lib/stores/useDashboardStore.ts`
   - Usunąć parametr skipCache z funkcji fetchData
   - Usunąć logikę dodawania timestamp do URL
   - Zaktualizować wszystkie wywołania fetchData(true) na fetchData()

## Weryfikacja

Po implementacji:
1. Zmienić kolejność kont przez drag & drop
2. Od razu odświeżyć stronę (F5)
3. ✅ Kolejność powinna być zachowana
4. Sprawdzić inne operacje (dodawanie konta, edycja, archiwizacja)
5. ✅ Wszystkie zmiany powinny być widoczne po odświeżeniu

## Zgodność z Workflow

- Maksymalnie 3 kroki implementacji w jednym podejściu
- Po implementacji: linter + testy
- Krótkie podsumowanie i plan na kolejne 3 kroki

---

## ✅ STATUS REALIZACJI

### Zrealizowane zmiany (15.11.2025)

#### 1. API Endpoint - Grid Data
**Plik:** `src/pages/api/grid-data.ts`
- ✅ Zmieniono nagłówek Cache-Control z `private, max-age=60` na `no-cache, no-store, must-revalidate`
- ✅ Endpoint zawsze zwraca świeże dane z bazy bez cache'owania

#### 2. Frontend Store - Dashboard
**Plik:** `src/lib/stores/useDashboardStore.ts`
- ✅ Usunięto parametr `skipCache` z funkcji `fetchData()`
- ✅ Usunięto logikę cache-busting (timestamp w URL)
- ✅ Zaktualizowano wszystkie wywołania `fetchData(true)` na `fetchData()` w funkcjach:
  - `addAccount`
  - `updateAccount`
  - `archiveAccount`
  - `deleteAccount`
  - `addColumn`
  - `deleteColumn`
  - `updateValueEntry`

#### 3. Testy Jednostkowe
**Pliki:**
- `src/test/stores/useDashboardStore.fetchData.test.ts`
  - ✅ Usunięto test "should add cache-busting timestamp when skipCache is true"
  - ✅ Dodano `archived_at: null` do mocków accounts
  
- `src/test/stores/useDashboardStore.addColumn.test.ts`
  - ✅ Usunięto test "should call fetchData with skipCache after adding column"
  - ✅ Dodano `archived_at: null` do mocków (gdzie brakowało)

#### 4. Weryfikacja Jakości Kodu
- ✅ **Linter (ESLint):** Przeszedł pomyślnie po auto-fix formatowania
- ✅ **Testy jednostkowe:** Wszystkie 96 testów przeszło pomyślnie
- ✅ **Testy manualne:** Potwierdzono działanie - kolejność kont jest zachowana po odświeżeniu strony

### Wynik
**Problem rozwiązany.** Po zmianie kolejności kont i odświeżeniu strony, zmiany są teraz zachowane. Cache został całkowicie usunięty z projektu, co gwarantuje świeże dane przy każdym wywołaniu API.
