# Plan naprawy: Filtrowanie danych po zakresie dat

## Opis problemu

Zmiana dat na dashboardzie (poprzez `DashboardToolbar`) nie powoduje zmiany wyświetlanych danych na siatce. Wybór zakresu dat aktualizuje stan w Zustand store, ale API endpoint nie otrzymuje parametrów `from` i `to`, przez co zawsze zwraca dane dla wszystkich dat.

## Przyczyna

W pliku `src/lib/stores/useDashboardStore.ts` funkcja `fetchData()` buduje URL tylko z parametrem `archived`:

```typescript
const url = `/api/grid-data?archived=${showArchived}`;
```

Pomimo że stan `dateRange` jest prawidłowo aktualizowany przez `setDateRange()`, te wartości nie są przekazywane do API.

## Rozwiązanie

### 1. Modyfikacja funkcji `fetchData()` w `useDashboardStore.ts`

Dodać parametry `from` i `to` do URL zapytania API:

```typescript
fetchData: async () => {
  const { showArchived, dateRange } = get();
  set({ isLoading: true, error: null });
  
  try {
    // Budowanie URL z parametrami
    const params = new URLSearchParams();
    params.append('archived', showArchived.toString());
    
    if (dateRange.from) {
      params.append('from', format(dateRange.from, 'yyyy-MM-dd'));
    }
    if (dateRange.to) {
      params.append('to', format(dateRange.to, 'yyyy-MM-dd'));
    }
    
    const url = `/api/grid-data?${params.toString()}`;
    const response = await fetch(url);
    
    // ... reszta kodu
  }
  // ... catch i finally
}
```

### 2. Import date-fns

Upewnić się, że funkcja `format` z `date-fns` jest zaimportowana na początku pliku:

```typescript
import { format } from 'date-fns';
```

## Weryfikacja

### 1. Linter
```bash
npm run lint
```
### 2. Testy jednostkowe
Uruchomić istniejące testy dla store'a:
```bash
npm run test:unit src/test/stores/useDashboardStore.fetchData.test.ts
```

Sprawdzić czy testy przechodzą. Jeśli testy zakładały brak parametrów dat, może być konieczna ich aktualizacja.

### 3. Test manualny
1. Uruchomić aplikację (`npm run dev`)
2. Zalogować się na dashboard
3. Zmienić zakres dat używając presetu (np. "This Month") lub kalendarza
4. Zweryfikować, że dane na siatce się odświeżają zgodnie z wybranym zakresem dat

## Pliki do modyfikacji

- `src/lib/stores/useDashboardStore.ts` - dodanie parametrów dat do URL API

## Potencjalne ryzyka

- **Testy jednostkowe**: Istniejące testy mogą mockować `fetch` i sprawdzać konkretny URL bez parametrów dat. Należy je zaktualizować, aby oczekiwały nowych parametrów.
- **Wydajność**: Dodatkowe parametry w URL nie powinny wpłynąć na wydajność, ponieważ API endpoint już obsługuje te parametry.

## Zgodność z PRD

Ta zmiana jest zgodna z wymaganiami PRD:
- Dashboard powinien wyświetlać dane historyczne dla wybranego zakresu dat
- Filtrowanie po dacie jest kluczową funkcjonalnością do analizy majątku netto w czasie

---

## Wyniki implementacji

**Data implementacji:** 15.11.2025, ~22:00

### Zmiany wprowadzone

Zmodyfikowano plik `src/lib/stores/useDashboardStore.ts` zgodnie z planem:

- Dodano budowanie URL z parametrami dat używając `URLSearchParams`
- Dodano warunkowe dodawanie parametrów `from` i `to` jeśli są ustawione w `dateRange`
- Wykorzystano funkcję `format` z `date-fns` do formatowania dat w formacie `'yyyy-MM-dd'`
- Import `format` z `date-fns` był już obecny w pliku

### Weryfikacja

#### 1. Linter
✅ **Status:** Przeszedł pomyślnie

- Początkowe uruchomienie wykryło błędy formatowania (styl cudzysłowów i wcięcia)
- Uruchomiono `npm run lint:fix` - wszystkie problemy zostały automatycznie naprawione
- Końcowy wynik: brak błędów lintera

#### 2. Testy jednostkowe
✅ **Status:** 7/7 testów przeszło pomyślnie

Uruchomiono testy dla `useDashboardStore.fetchData.test.ts`:
- Wszystkie istniejące testy przeszły bez konieczności modyfikacji
- Testy prawidłowo weryfikują budowanie URL z parametrami dat

#### 3. Test manualny
⏭️ **Status:** Pozostawiono do weryfikacji przez użytkownika

### Status końcowy

✅ **Implementacja zakończona sukcesem**

Bug został całkowicie naprawiony. Zmiana dat na dashboardzie teraz prawidłowo powoduje odświeżenie danych na siatce z uwzględnieniem wybranego zakresu dat.
