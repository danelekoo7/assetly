# API Endpoint Implementation Plan: GET /grid-data

## 1. Przegląd punktu końcowego

Punkt końcowy `GET /grid-data` jest agregowanym endpointem zaprojektowanym do dostarczenia wszystkich danych niezbędnych do renderowania głównego widoku siatki danych w stylu arkusza kalkulacyjnego. Endpoint ten łączy dane z tabel `accounts` i `value_entries`, formatując je w strukturę zoptymalizowaną dla komponentu UI. Zwraca listę wszystkich aktywnych (i opcjonalnie zarchiwizowanych) kont użytkownika wraz z ich historycznymi wpisami wartości zgrupowanymi po datach oraz obliczone podsumowanie net_worth dla każdego dnia.

Jest to kluczowy endpoint dla głównej funkcjonalności aplikacji Assetly, umożliwiający użytkownikowi przeglądanie i zarządzanie swoimi danymi finansowymi w jednym zintegrowanym widoku.

## 2. Szczegóły żądania

- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/grid-data`
- **Parametry zapytania (Query Parameters)**:
  - **Opcjonalne**:
    - `from` (string, format daty): Data początkowa zakresu danych. Format: ISO 8601 lub YYYY-MM-DD. Jeśli nie podano, zwraca wszystkie dane od początku.
    - `to` (string, format daty): Data końcowa zakresu danych. Format: ISO 8601 lub YYYY-MM-DD. Jeśli nie podano, zwraca wszystkie dane do teraz.
    - `archived` (boolean, domyślnie `false`): Jeśli `true`, odpowiedź będzie zawierać również konta zarchiwizowane.
- **Request Body**: Brak (endpoint GET).

**Przykładowe wywołania:**

```
GET /api/grid-data
GET /api/grid-data?from=2024-01-01&to=2024-12-31
GET /api/grid-data?archived=true
GET /api/grid-data?from=2024-06-01&to=2024-06-30&archived=false
```

## 3. Wykorzystywane typy

Endpoint wykorzystuje następujące typy zdefiniowane w `src/types.ts`:

- **`GridDataDto`**: Główna struktura odpowiedzi

  ```typescript
  export interface GridDataDto {
    dates: string[];
    accounts: GridAccountDto[];
    summary: Record<string, GridSummaryDto>;
  }
  ```

- **`GridAccountDto`**: Reprezentacja pojedynczego konta w gridzie

  ```typescript
  export type GridAccountDto = Pick<Account, "id" | "name" | "type"> & {
    entries: Record<string, GridEntryDto>;
  };
  ```

- **`GridEntryDto`**: Wpis wartości dla konkretnej daty

  ```typescript
  export type GridEntryDto = Pick<ValueEntry, "value" | "cash_flow" | "gain_loss">;
  ```

- **`GridSummaryDto`**: Podsumowanie dla pojedynczej daty
  ```typescript
  export interface GridSummaryDto {
    net_worth: number;
  }
  ```

Dodatkowo w warstwie serwisowej wykorzystane będą:

- **`Account`**: Pełny typ wiersza z tabeli `accounts`
- **`ValueEntry`**: Pełny typ wiersza z tabeli `value_entries`
- **`AccountType`**: Enum typu konta ('investment_asset' | 'cash_asset' | 'liability')

## 4. Szczegóły odpowiedzi

- **Odpowiedź sukcesu (`200 OK`)**:
  - Zwraca obiekt `GridDataDto`
  - Przykładowa odpowiedź:
    ```json
    {
      "dates": ["2023-10-27", "2023-10-28"],
      "accounts": [
        {
          "id": "a1b2c3d4-...",
          "name": "mBank Savings",
          "type": "cash_asset",
          "entries": {
            "2023-10-27": { "value": 5000, "cash_flow": 0, "gain_loss": 0 },
            "2023-10-28": { "value": 5100, "cash_flow": 100, "gain_loss": 0 }
          }
        },
        {
          "id": "e5f6g7h8-...",
          "name": "XTB Portfolio",
          "type": "investment_asset",
          "entries": {
            "2023-10-27": { "value": 15000, "cash_flow": 0, "gain_loss": 0 },
            "2023-10-28": { "value": 15500, "cash_flow": 500, "gain_loss": 250 }
          }
        }
      ],
      "summary": {
        "2023-10-27": { "net_worth": 20000 },
        "2023-10-28": { "net_worth": 20600 }
      }
    }
    ```

  ```

  ```

- **Odpowiedzi błędów**:
  - **`400 Bad Request`**:
    - Nieprawidłowy format daty w parametrach `from` lub `to`
    - Data `from` jest późniejsza niż `to`
    - Treść odpowiedzi zawiera szczegóły błędu walidacji
  - **`401 Unauthorized`**: Użytkownik nie jest uwierzytelniony (obsługa przez middleware)
  - **`500 Internal Server Error`**: Błąd bazy danych lub nieoczekiwany błąd serwera

## 5. Przepływ danych

1. Żądanie `GET` trafia do endpointu `/api/grid-data` z opcjonalnymi query params.
2. Middleware Astro (`src/middleware/index.ts`) weryfikuje JWT i dołącza sesję użytkownika oraz klienta Supabase do `context.locals`. Jeśli uwierzytelnianie zawiedzie, zwraca `401 Unauthorized`.
3. Handler `GET` w `src/pages/api/grid-data.ts` jest wywoływany.
4. Handler odczytuje parametry z `Astro.url.searchParams` (`from`, `to`, `archived`).
5. Schemat Zod jest używany do walidacji query params. Przy niepowodzeniu walidacji zwraca `400 Bad Request`.
6. Handler wywołuje funkcję serwisową: `GridDataService.getGridData(supabase, session.user.id, { from, to, showArchived })`.
7. **Funkcja serwisowa wykonuje następujące kroki**:

   **Krok 7.1: Pobieranie kont użytkownika**
   - Wykonuje zapytanie do tabeli `accounts` filtrując po `user_id` (automatycznie przez RLS)
   - Jeśli `showArchived = false`, dodaje warunek `.is('archived_at', null)`
   - Selekcjonuje tylko potrzebne kolumny: `id`, `name`, `type`

   **Krok 7.2: Pobieranie value_entries**
   - Dla pobranych kont, wykonuje zapytanie do `value_entries`
   - Filtruje po `account_id IN (lista_id_kont)`
   - Jeśli podano `from`, dodaje warunek `.gte('date', from)`
   - Jeśli podano `to`, dodaje warunek `.lte('date', to)`
   - Sortuje po `date` rosnąco
   - Selekcjonuje: `account_id`, `date`, `value`, `cash_flow`, `gain_loss`

   **Krok 7.3: Formatowanie danych do GridDataDto**
   - Tworzy zbiór wszystkich unikalnych dat z pobranych `value_entries`
   - Sortuje daty chronologicznie
   - Dla każdego konta tworzy obiekt `GridAccountDto`:
     - Kopiuje `id`, `name`, `type`
     - Tworzy `entries` jako obiekt mapujący datę (string YYYY-MM-DD) do `GridEntryDto`
   - Grupuje entries po `account_id` i `date`

   **Krok 7.4: Obliczanie summary**
   - Dla każdej daty z listy `dates`:
     - Iteruje po wszystkich kontach
     - Pobiera wartość `value` z `entries[date]` dla danego konta (jeśli istnieje)
     - Jeśli konto jest typu `liability`, odejmuje wartość od net_worth
     - Jeśli konto jest typu `cash_asset` lub `investment_asset`, dodaje wartość do net_worth
     - Zapisuje obliczony `net_worth` w `summary[date]`

   **Krok 7.5: Zwracanie danych**
   - Zwraca obiekt `GridDataDto` zawierający `dates`, `accounts`, `summary`

8. Handler formatuje odpowiedź i zwraca `200 OK` z danymi JSON.
9. W przypadku błędów:
   - Błąd walidacji Zod → `400 Bad Request`
   - Błąd bazy danych → `500 Internal Server Error`
   - Inne błędy → `500 Internal Server Error` (logowane server-side)

### 5.1. Diagram przepływu danych

```
┌─────────────────────┐
│  Client (Browser)   │
└──────────┬──────────┘
           │ GET /api/grid-data?from=...&to=...
           ▼
┌─────────────────────┐
│   Astro Middleware  │
│  - Weryfikacja JWT  │
│  - Attach session   │
└──────────┬──────────┘
           │ context.locals: { supabase, session }
           ▼
┌─────────────────────┐
│   API Handler       │
│  (grid-data.ts)     │
│  - Parse params     │
│  - Validate (Zod)   │
└──────────┬──────────┘
           │ Call service
           ▼
┌─────────────────────────────────────────┐
│  GridDataService.getGridData()          │
│                                         │
│  1. SELECT accounts WHERE user_id       │
│     └─> [accounts]                      │
│                                         │
│  2. SELECT value_entries WHERE          │
│     account_id IN [...] AND date        │
│     └─> [value_entries]                 │
│                                         │
│  3. Group entries by account & date     │
│     └─> entries: { date: GridEntryDto }│
│                                         │
│  4. Calculate net_worth per date        │
│     └─> summary: { date: net_worth }   │
│                                         │
│  5. Format to GridDataDto               │
└──────────┬──────────────────────────────┘
           │ Return GridDataDto
           ▼
┌─────────────────────┐
│   API Handler       │
│  - Serialize JSON   │
└──────────┬──────────┘
           │ 200 OK + JSON
           ▼
┌─────────────────────┐
│  Client (Browser)   │
│  - Update UI        │
└─────────────────────┘
```

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie**:
  - Wszystkie żądania wymagają prawidłowego JWT w nagłówku `Authorization`
  - Middleware Astro automatycznie weryfikuje token przed dotarciem do handlera
  - Brak tokena lub nieprawidłowy token skutkuje `401 Unauthorized`

- **Autoryzacja**:
  - Polityki Row-Level Security (RLS) na tabelach `accounts` i `value_entries` automatycznie filtrują dane po `user_id`
  - Zapytanie do `accounts` zwraca tylko konta należące do `auth.uid()`
  - Zapytanie do `value_entries` poprzez relację z `accounts` również jest filtrowane (RLS działa kaskadowo)
  - **Nie ma potrzeby** jawnego sprawdzania `user_id` w kodzie serwisu - Supabase to robi automatycznie

- **Walidacja danych wejściowych**:
  - Wszystkie query params są walidowane przez schemat Zod
  - Walidacja formatu daty zapobiega injection attacks
  - Coerce boolean dla parametru `archived` zapobiega błędom parsowania

- **Ochrona przed data leakage**:
  - DTOs (`GridAccountDto`, `GridEntryDto`) celowo pomijają wrażliwe pola jak `user_id`, `updated_at`, `created_at`
  - Endpoint zwraca tylko niezbędne minimum danych dla UI

- **Rate limiting**:
  - W przyszłości rozważyć dodanie rate limiting na poziomie API (np. przez Supabase Edge Functions lub middleware)

## 7. Obsługa błędów

| Kod statusu                   | Scenariusz                      | Szczegóły                                                                                                                     |
| ----------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **400 Bad Request**           | Nieprawidłowy format daty       | Parametr `from` lub `to` nie jest prawidłową datą. Odpowiedź zawiera szczegóły błędu z Zod.                                   |
| **400 Bad Request**           | Data `from` późniejsza niż `to` | Logiczna niespójność: data początkowa jest późniejsza niż końcowa. Komunikat: "Data 'from' nie może być późniejsza niż 'to'." |
| **401 Unauthorized**          | Brak uwierzytelnienia           | Token JWT jest nieprawidłowy, wygasły lub nie został dostarczony. Obsługiwane przez middleware Astro.                         |
| **500 Internal Server Error** | Błąd bazy danych                | Nieprzewidziany błąd podczas zapytań do Supabase (np. timeout, utrata połączenia). Szczegóły logowane server-side.            |
| **500 Internal Server Error** | Błąd formatowania danych        | Nieoczekiwany błąd podczas grupowania lub formatowania danych. Logowane server-side.                                          |
| **500 Internal Server Error** | Inny błąd serwera               | Wszelkie inne nieobsłużone wyjątki. Logowane server-side z pełnym stack trace.                                                |

**Przykład obsługi błędów w handlerze:**

```typescript
try {
  const gridData = await GridDataService.getGridData(supabase, session.user.id, options);
  return new Response(JSON.stringify(gridData), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
} catch (error) {
  console.error("Error in GET /grid-data:", error);
  return new Response(JSON.stringify({ error: "Nie udało się pobrać danych. Spróbuj ponownie później." }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}
```

## 8. Wydajność

### 8.1. Liczba zapytań do bazy danych

- **Zapytanie 1**: Pobieranie kont użytkownika
  - `SELECT id, name, type FROM accounts WHERE user_id = ... AND (archived_at IS NULL OR ...)`
  - Zwraca N kont

- **Zapytanie 2**: Pobieranie value_entries
  - `SELECT account_id, date, value, cash_flow, gain_loss FROM value_entries WHERE account_id IN (...) AND date >= ... AND date <= ...`
  - Zwraca M wpisów wartości

**Łącznie: 2 zapytania** na jedno żądanie

### 8.2. Optymalizacja zapytań

- **Indeksy wykorzystywane**:
  - `idx_accounts_user_id` - przyspiesza filtrowanie kont po `user_id`
  - `idx_value_entries_account_id_date` - przyspiesza filtrowanie i sortowanie value_entries

- **RLS**: Polityki RLS są zoptymalizowane i nie dodają znaczącego narzutu

- **Możliwe optymalizacje w przyszłości**:
  - **JOIN zamiast 2 zapytań**: Można rozważyć jedno zapytanie z LEFT JOIN między `accounts` i `value_entries` (zmniejszy to liczbę round-trips do bazy)
  - **Materializowane widoki**: Dla bardzo dużych zakresów dat, można rozważyć materializowany widok z pre-obliczonymi summary
  - **Cache**: Dodanie cache'u po stronie serwera (np. Redis) dla często powtarzających się zapytań

### 8.3. Złożoność obliczeniowa

- **Grupowanie entries**: O(M) gdzie M to liczba value_entries
- **Obliczanie summary**: O(D × N) gdzie D to liczba dat, N to liczba kont
- **Dla typowego przypadku użycia** (10 kont, 30 dni): ~300 operacji - nieznaczny narzut

### 8.4. Rozmiar odpowiedzi

- **Przykładowy rozmiar** dla 10 kont, 30 dat, 3 wpisy na datę:
  - Około 10KB JSON (niezipowany)
  - Po kompresji gzip: ~2-3KB
- **Rekomendacja**: Dla bardzo dużych zakresów dat (>365 dni), rozważyć paginację lub lazy loading

### 8.5. Potencjalne wąskie gardła

- **Duża liczba value_entries**: Jeśli użytkownik ma dziesiątki kont i tysiące wpisów, zapytanie może być wolne
  - **Mitigacja**: Domyślny zakres dat (np. ostatnie 3 miesiące) jeśli nie podano `from`/`to`
  - **Mitigacja**: Limit na liczbę zwracanych dat (np. max 365 dni)

- **Obliczanie summary dla wielu dat**: Może być czasochłonne dla bardzo długich zakresów
  - **Mitigacja**: Rozważyć obliczanie summary po stronie bazy danych (np. funkcja PL/pgSQL)

## 9. Etapy wdrożenia

### Krok 1: Utworzenie schematu walidacji Zod

**Plik**: `src/lib/validation/grid-data.schemas.ts` (nowy plik)

```typescript
import { z } from "zod";

export const gridDataQuerySchema = z
  .object({
    from: z.string().date().optional().or(z.string().datetime().optional()),
    to: z.string().date().optional().or(z.string().datetime().optional()),
    archived: z.coerce.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        return new Date(data.from) <= new Date(data.to);
      }
      return true;
    },
    {
      message: "Data 'from' nie może być późniejsza niż 'to'",
      path: ["from"],
    }
  );

export type GridDataQuery = z.infer<typeof gridDataQuerySchema>;
```

**Walidacja**:

- `from`: optional string z formatem daty (ISO 8601 lub YYYY-MM-DD)
- `to`: optional string z formatem daty
- `archived`: optional boolean (coerce z string "true"/"false" do boolean)
- Refinement: sprawdza, czy `from <= to`

---

### Krok 2: Utworzenie serwisu GridDataService

**Plik**: `src/lib/services/grid-data.service.ts` (nowy plik)

**Interfejs serwisu**:

```typescript
export interface GetGridDataOptions {
  from?: string;
  to?: string;
  showArchived?: boolean;
}

export class GridDataService {
  static async getGridData(
    supabase: SupabaseClient<Database>,
    userId: string,
    options: GetGridDataOptions = {}
  ): Promise<GridDataDto> {
    // Implementacja
  }
}
```

**Implementacja funkcji `getGridData`**:

#### Krok 2.1: Pobierz konta użytkownika

```typescript
let accountsQuery = supabase.from("accounts").select("id, name, type").eq("user_id", userId); // Opcjonalnie - RLS i tak filtruje

if (!options.showArchived) {
  accountsQuery = accountsQuery.is("archived_at", null);
}

const { data: accounts, error: accountsError } = await accountsQuery;

if (accountsError) {
  throw new Error(`Failed to fetch accounts: ${accountsError.message}`);
}

if (!accounts || accounts.length === 0) {
  // Brak kont - zwróć pustą strukturę
  return {
    dates: [],
    accounts: [],
    summary: {},
  };
}
```

#### Krok 2.2: Pobierz value_entries

```typescript
const accountIds = accounts.map((acc) => acc.id);

let entriesQuery = supabase
  .from("value_entries")
  .select("account_id, date, value, cash_flow, gain_loss")
  .in("account_id", accountIds)
  .order("date", { ascending: true });

if (options.from) {
  entriesQuery = entriesQuery.gte("date", options.from);
}

if (options.to) {
  entriesQuery = entriesQuery.lte("date", options.to);
}

const { data: valueEntries, error: entriesError } = await entriesQuery;

if (entriesError) {
  throw new Error(`Failed to fetch value entries: ${entriesError.message}`);
}
```

#### Krok 2.3: Wyodrębnij unikalne daty i posortuj

```typescript
const dateSet = new Set<string>();
valueEntries?.forEach((entry) => {
  const dateStr = new Date(entry.date).toISOString().split("T")[0]; // YYYY-MM-DD
  dateSet.add(dateStr);
});

const dates = Array.from(dateSet).sort();
```

#### Krok 2.4: Zgrupuj entries po account_id i dacie

```typescript
const entriesByAccountAndDate: Record<string, Record<string, GridEntryDto>> = {};

valueEntries?.forEach((entry) => {
  const dateStr = new Date(entry.date).toISOString().split("T")[0];

  if (!entriesByAccountAndDate[entry.account_id]) {
    entriesByAccountAndDate[entry.account_id] = {};
  }

  entriesByAccountAndDate[entry.account_id][dateStr] = {
    value: entry.value,
    cash_flow: entry.cash_flow,
    gain_loss: entry.gain_loss,
  };
});
```

#### Krok 2.5: Formatuj konta do GridAccountDto

```typescript
const gridAccounts: GridAccountDto[] = accounts.map((account) => ({
  id: account.id,
  name: account.name,
  type: account.type,
  entries: entriesByAccountAndDate[account.id] || {},
}));
```

#### Krok 2.6: Oblicz summary (net_worth) dla każdej daty

```typescript
const summary: Record<string, GridSummaryDto> = {};

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

  summary[date] = { net_worth: netWorth };
});
```

#### Krok 2.7: Zwróć GridDataDto

```typescript
return {
  dates,
  accounts: gridAccounts,
  summary,
};
```

---

### Krok 3: Utworzenie pliku endpointu API

**Plik**: `src/pages/api/grid-data.ts` (nowy plik)

**Struktura pliku**:

```typescript
import type { APIContext } from "astro";
import { GridDataService } from "@/lib/services/grid-data.service";
import { gridDataQuerySchema } from "@/lib/validation/grid-data.schemas";

export const prerender = false;

export async function GET({ url, locals }: APIContext) {
  // Implementacja
}
```

---

### Krok 4: Implementacja handlera GET

#### Krok 4.1: Weryfikacja sesji

```typescript
const { supabase, session } = locals;

if (!session) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
```

#### Krok 4.2: Parsowanie i walidacja query params

```typescript
const searchParams = Object.fromEntries(url.searchParams.entries());

const validationResult = gridDataQuerySchema.safeParse(searchParams);

if (!validationResult.success) {
  return new Response(
    JSON.stringify({
      error: "Nieprawidłowe parametry zapytania",
      details: validationResult.error.flatten(),
    }),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}

const { from, to, archived } = validationResult.data;
```

#### Krok 4.3: Wywołanie serwisu

```typescript
try {
  const gridData = await GridDataService.getGridData(supabase, session.user.id, { from, to, showArchived: archived });

  return new Response(JSON.stringify(gridData), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, max-age=60", // Cache na 60s
    },
  });
} catch (error) {
  console.error("Error in GET /grid-data:", error);

  return new Response(
    JSON.stringify({
      error: "Nie udało się pobrać danych. Spróbuj ponownie później.",
    }),
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    }
  );
}
```

---

### Krok 5: Testowanie

#### Testy jednostkowe (Vitest)

**Plik**: `src/test/services/grid-data.service.test.ts`

**Scenariusze do przetestowania**:

1. **Pomyślne pobranie danych** - zwraca poprawnie sformatowany `GridDataDto`
2. **Brak kont użytkownika** - zwraca pusty `GridDataDto`
3. **Brak value_entries** - zwraca konta z pustymi `entries`
4. **Filtrowanie po zakresie dat** - zwraca tylko entries w zadanym zakresie
5. **Filtrowanie kont zarchiwizowanych** - domyślnie nie zwraca zarchiwizowanych
6. **Włączenie kont zarchiwizowanych** - zwraca wszystkie konta gdy `showArchived=true`
7. **Obliczanie net_worth** - poprawnie odejmuje liabilities i dodaje assets
8. **Sortowanie dat** - daty są posortowane chronologicznie
9. **Grupowanie entries** - entries są poprawnie zmapowane do kont i dat

**Przykładowy test**:

```typescript
import { describe, it, expect, vi } from "vitest";
import { GridDataService } from "@/lib/services/grid-data.service";

describe("GridDataService.getGridData", () => {
  it("should return grid data with correct structure", async () => {
    const mockSupabase = createMockSupabase({
      accounts: [{ id: "1", name: "Account 1", type: "cash_asset" }],
      valueEntries: [{ account_id: "1", date: "2024-01-15", value: 1000, cash_flow: 0, gain_loss: 0 }],
    });

    const result = await GridDataService.getGridData(mockSupabase, "user123", {});

    expect(result).toHaveProperty("dates");
    expect(result).toHaveProperty("accounts");
    expect(result).toHaveProperty("summary");
    expect(result.dates).toEqual(["2024-01-15"]);
    expect(result.accounts).toHaveLength(1);
    expect(result.summary["2024-01-15"].net_worth).toBe(1000);
  });
});
```

#### Testy integracyjne

**Scenariusze do przetestowania**:

1. **GET /api/grid-data bez parametrów** - zwraca wszystkie dane
2. **GET /api/grid-data z from i to** - zwraca dane w zakresie
3. **GET /api/grid-data z archived=true** - zwraca konta zarchiwizowane
4. **GET /api/grid-data bez uwierzytelnienia** - zwraca 401
5. **GET /api/grid-data z nieprawidłową datą** - zwraca 400
6. **GET /api/grid-data z from > to** - zwraca 400

#### Testy E2E (Playwright)

**Scenariusz**: Pełny przepływ użytkownika

1. Zaloguj się jako użytkownik
2. Dodaj konto
3. Dodaj wpis wartości
4. Odśwież stronę
5. Weryfikuj, że dane są wyświetlane w gridzie

---

### Krok 6: Integracja z frontendem

**Plik**: `src/lib/stores/useDashboardStore.ts`

**Aktualizacja funkcji `fetchData()`**:

```typescript
fetchData: async () => {
  set({ isLoading: true, error: null });

  try {
    const { dateRange, showArchived } = get();

    // Formatuj daty do YYYY-MM-DD
    const from = dateRange.from.toISOString().split('T')[0];
    const to = dateRange.to.toISOString().split('T')[0];

    // Wywołanie API
    const params = new URLSearchParams({
      from,
      to,
      archived: showArchived.toString(),
    });

    const response = await fetch(`/api/grid-data?${params}`);

    if (!response.ok) {
      throw new Error('Failed to fetch grid data');
    }

    const gridData: GridDataDto = await response.json();

    set({
      gridData,
      isLoading: false
    });

    // Opcjonalnie: pobierz również summary
    // await get().fetchSummary();

  } catch (error) {
    console.error('Error fetching data:', error);
    set({
      error: error instanceof Error ? error : new Error('Unknown error'),
      isLoading: false
    });
  }
},
```

---

### Krok 7: Dokumentacja

- Dodać komentarze JSDoc do funkcji serwisowej
- Zaktualizować `ai/api-plan.md` z finalnymi szczegółami implementacji
- Dodać przykłady wywołań API do `account_api_tests.http` (lub utworzyć `grid_data_tests.http`)

**Przykład pliku testowego HTTP**:

```http
### GET /api/grid-data - Wszystkie dane
GET http://localhost:4321/api/grid-data
Authorization: Bearer {{jwt_token}}

### GET /api/grid-data - Z zakresem dat
GET http://localhost:4321/api/grid-data?from=2024-01-01&to=2024-12-31
Authorization: Bearer {{jwt_token}}

### GET /api/grid-data - Z zarchiwizowanymi
GET http://localhost:4321/api/grid-data?archived=true
Authorization: Bearer {{jwt_token}}
```

---

### Krok 8: Code review i refaktoryzacja

- Sprawdzić, czy logika obliczania net_worth jest poprawna
- Upewnić się, że wszystkie edge cases są obsłużone (brak kont, brak entries)
- Zweryfikować wydajność na większych zestawach danych
- Sprawdzić spójność komunikatów błędów
- Upewnić się, że kod jest czytelny i dobrze udokumentowany

---

## Podsumowanie kluczowych decyzji

1. **Dwa osobne zapytania zamiast JOIN**: Prostsze w utrzymaniu, wystarczająco wydajne dla MVP. W przyszłości można zoptymalizować.

2. **Obliczanie summary po stronie serwisu**: Prostsze niż dodatkowe zapytanie agregujące do bazy, wystarczająco szybkie dla typowych przypadków użycia.

3. **Format daty w kluczu `entries`**: Używamy YYYY-MM-DD (bez timestamp) dla czytelności i spójności z UI.

4. **Domyślnie ukryte konta zarchiwizowane**: Zgodne z UX - użytkownik musi explicite poprosić o ich wyświetlenie.

5. **Brak domyślnego zakresu dat**: Endpoint zwraca wszystkie dane jeśli nie podano `from`/`to`. Frontend może ustawić domyślny zakres (np. ostatnie 90 dni).

6. **Cache-Control header**: Dodajemy `max-age=60` aby zmniejszyć niepotrzebne requesty przy szybkim odświeżaniu strony.

7. **Typ net_worth jako number**: Przechowujemy jako number (nie string), frontend może sformatować do waluty.

8. **Puste entries jako pusty obiekt `{}`**: Jeśli konto nie ma żadnych wpisów w danym zakresie, `entries` to `{}` a nie `undefined`.

---

## Możliwe przyszłe optymalizacje

1. **Single query z JOIN**: Połączyć oba zapytania w jedno z LEFT JOIN dla lepszej wydajności
2. **Pagination**: Dla bardzo długich zakresów dat (>365 dni)
3. **Database function**: Przenieść obliczanie summary do funkcji PL/pgSQL w bazie danych
4. **Cache serverless**: Dodać Redis lub inny cache dla często powtarzających się zapytań
5. **Compression**: Upewnić się, że serwer wysyła gzip/brotli compression
6. **GraphQL**: Rozważyć GraphQL dla bardziej elastycznych zapytań w przyszłości
