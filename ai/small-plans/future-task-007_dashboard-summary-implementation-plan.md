# API Endpoint Implementation Plan: GET /dashboard/summary

## 1. Przegląd punktu końcowego

Punkt końcowy `GET /dashboard/summary` dostarcza kluczowe wskaźniki wydajności (KPI) dla głównego pulpitu aplikacji. Endpoint ten oblicza i zwraca pięć podstawowych metryk finansowych: wartość netto, sumę aktywów, sumę pasywów oraz skumulowane przepływy pieniężne i zyski/straty. Wszystkie obliczenia bazują na **najnowszych** wpisach wartości dla każdego aktywnego konta użytkownika, zapewniając aktualny obraz sytuacji finansowej.

Jest to kluczowy endpoint dla sekcji KPI na pulpicie, wyświetlający użytkownikowi szybki przegląd jego całkowitej sytuacji majątkowej w jednym miejscu.

## 2. Szczegóły żądania

- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/dashboard/summary`
- **Parametry**:
  - **Wymagane**:
    - `from` (string, format: YYYY-MM-DD) - Data początkowa zakresu
    - `to` (string, format: YYYY-MM-DD) - Data końcowa zakresu
  - **Opcjonalne**: Brak
- **Request Body**: Brak (endpoint GET nie przyjmuje body)

**Przykładowe wywołanie:**

```
GET /api/dashboard/summary?from=2024-01-01&to=2024-03-31
Authorization: Bearer <JWT_TOKEN>
```

**Uwagi**:

- Endpoint przyjmuje zakres dat jako parametry query string
- Skumulowane wartości (cumulative_cash_flow, cumulative_gain_loss) dotyczą wybranego okresu
- Aktualne wartości (total_assets, total_liabilities) bazują na najnowszym wpisie w zakresie dat
- Uwzględnia tylko aktywne konta (archived_at = NULL)

## 3. Wykorzystywane typy

Endpoint wykorzystuje następujący typ zdefiniowany w `src/types.ts`:

- **`DashboardSummaryDto`**: Główna struktura odpowiedzi

  ```typescript
  export interface DashboardSummaryDto {
    net_worth: number; // Wartość netto = aktywa - pasywa
    total_assets: number; // Suma wszystkich aktywów
    total_liabilities: number; // Suma wszystkich pasywów
    cumulative_cash_flow: number; // Skumulowane przepływy pieniężne
    cumulative_gain_loss: number; // Skumulowane zyski/straty
  }
  ```

Dodatkowo w warstwie serwisowej wykorzystane będą:

- **`Account`**: Pełny typ wiersza z tabeli `accounts`
- **`ValueEntry`**: Pełny typ wiersza z tabeli `value_entries`
- **`AccountType`**: Enum typu konta ('investment_asset' | 'cash_asset' | 'liability')

## 4. Szczegóły odpowiedzi

- **Odpowiedź sukcesu (`200 OK`)**:
  - Zwraca obiekt `DashboardSummaryDto`
  - Przykładowa odpowiedź:
    ```json
    {
      "net_worth": 20600.0,
      "total_assets": 20600.0,
      "total_liabilities": 0.0,
      "cumulative_cash_flow": 600.0,
      "cumulative_gain_loss": 250.0
    }
    ```

- **Odpowiedzi błędów**:
  - **`401 Unauthorized`**: Użytkownik nie jest uwierzytelniony (obsługa przez middleware)
  - **`500 Internal Server Error`**: Błąd bazy danych lub nieoczekiwany błąd serwera

## 5. Przepływ danych

1. Żądanie `GET` trafia do endpointu `/api/dashboard/summary`.
2. Middleware Astro (`src/middleware/index.ts`) weryfikuje JWT i dołącza sesję użytkownika oraz klienta Supabase do `context.locals`. Jeśli uwierzytelnianie zawiedzie, zwraca `401 Unauthorized`.
3. Handler `GET` w `src/pages/api/dashboard/summary.ts` jest wywoływany.
4. Handler wywołuje funkcję serwisową: `DashboardSummaryService.getSummary(supabase, session.user.id)`.
5. **Funkcja serwisowa wykonuje następujące kroki**:

   **Krok 5.1: Pobieranie aktywnych kont użytkownika**
   - Wykonuje zapytanie do tabeli `accounts` filtrując po `user_id` (automatycznie przez RLS)
   - Dodaje warunek `.is('archived_at', null)` aby wykluczyć konta zarchiwizowane
   - Selekcjonuje kolumny: `id`, `type`

   **Krok 5.2: Pobieranie value_entries - podwójne zapytanie**

   **5.2a: Pobieranie najnowszych value_entries (dla total_assets i total_liabilities)**
   - Dla każdego pobranego konta wykonuje zapytanie do `value_entries`:
     - Filtruje po `account_id`
     - Sortuje po `date` malejąco (DESC)
     - Pobiera tylko pierwszy rekord (LIMIT 1) - czyli najnowszy wpis
   - Selekcjonuje: `account_id`, `value`
   - Te dane służą do obliczenia aktualnego stanu aktywów i pasywów

   **5.2b: Pobieranie value_entries w zakresie dat (dla cumulative_cash_flow i cumulative_gain_loss)**
   - Wykonuje zapytanie do `value_entries`:
     - Filtruje po `account_id IN (lista_id_kont)`
     - Filtruje po zakresie dat: `date >= from AND date <= to`
   - Selekcjonuje: `cash_flow`, `gain_loss`
   - Te dane służą do obliczenia skumulowanych sum dla wybranego okresu

   **Krok 5.3: Obliczanie metryk**
   - Inicjalizuje zmienne:
     - `total_assets = 0`
     - `total_liabilities = 0`
     - `cumulative_cash_flow = 0`
     - `cumulative_gain_loss = 0`
   - **Obliczanie total_assets i total_liabilities** (z najnowszych wpisów):
     - Dla każdego konta z najnowszym wpisem:
       - Jeśli `type === 'liability'`:
         - `total_liabilities += value`
       - Jeśli `type === 'cash_asset'` lub `type === 'investment_asset'`:
         - `total_assets += value`
   - **Obliczanie cumulative_cash_flow i cumulative_gain_loss** (z wpisów w wybranym okresie):
     - Dla każdego wpisu wartości w zakresie dat (from-to):
       - `cumulative_cash_flow += cash_flow`
       - `cumulative_gain_loss += gain_loss`
   - Oblicza `net_worth = total_assets - total_liabilities`

   **UWAGA KRYTYCZNA**: Skumulowane wartości reprezentują sumę przepływów i zysków/strat dla WYBRANEGO OKRESU (parametry from/to), zgodnie z wymaganiami PRD (US-010) i potrzebami UX - użytkownik wybiera zakres dat na pulpicie (np. ostatnie 3 miesiące, rok), a skumulowane wartości dotyczą tego okresu. To zwiększa wydajność i daje użytkownikowi kontrolę nad analizowanym okresem.

   **Krok 5.4: Zwracanie danych**
   - Zwraca obiekt `DashboardSummaryDto` z obliczonymi metrykami

6. Handler formatuje odpowiedź i zwraca `200 OK` z danymi JSON.
7. W przypadku błędów:
   - Błąd bazy danych → `500 Internal Server Error`
   - Inne błędy → `500 Internal Server Error` (logowane server-side)

### 5.1. Diagram przepływu danych

```
┌─────────────────────┐
│  Client (Browser)   │
└──────────┬──────────┘
           │ GET /api/dashboard/summary
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
│ (dashboard/summary) │
└──────────┬──────────┘
           │ Call service
           ▼
┌──────────────────────────────────────────────┐
│  DashboardSummaryService.getSummary()        │
│                                              │
│  1. SELECT accounts WHERE user_id            │
│     AND archived_at IS NULL                  │
│     └─> [accounts] (id, type)                │
│                                              │
│  2. For each account:                        │
│     SELECT value_entries WHERE               │
│     account_id = ... ORDER BY date DESC      │
│     LIMIT 1                                  │
│     └─> latest_entry (value, cash_flow, ...)│
│                                              │
│  3. Calculate metrics:                       │
│     - total_assets (sum if type != liability)│
│     - total_liabilities (sum if liability)   │
│     - cumulative_cash_flow (sum all)         │
│     - cumulative_gain_loss (sum all)         │
│     - net_worth = assets - liabilities       │
│                                              │
│  4. Return DashboardSummaryDto               │
└──────────┬───────────────────────────────────┘
           │ Return DashboardSummaryDto
           ▼
┌─────────────────────┐
│   API Handler       │
│  - Serialize JSON   │
└──────────┬──────────┘
           │ 200 OK + JSON
           ▼
┌─────────────────────┐
│  Client (Browser)   │
│  - Update KPI UI    │
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

- **Ochrona przed data leakage**:
  - DTO (`DashboardSummaryDto`) celowo pomija wszystkie szczegóły poszczególnych kont
  - Zwracane są tylko zagregowane metryki
  - Brak ujawniania `user_id`, nazw kont, dat czy innych szczegółów

- **Walidacja parametrów wejściowych**:
  - Endpoint przyjmuje parametry `from` i `to` jako query strings
  - Wymagana walidacja formatu dat (YYYY-MM-DD) za pomocą Zod
  - Zabezpieczenie przed SQL injection poprzez wykorzystanie parametryzowanych zapytań Supabase
  - Sprawdzenie, czy `from <= to` (data początkowa nie może być późniejsza niż końcowa)

## 7. Obsługa błędów

| Kod statusu                   | Scenariusz             | Szczegóły                                                                                                          |
| ----------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **401 Unauthorized**          | Brak uwierzytelnienia  | Token JWT jest nieprawidłowy, wygasły lub nie został dostarczony. Obsługiwane przez middleware Astro.              |
| **500 Internal Server Error** | Błąd bazy danych       | Nieprzewidziany błąd podczas zapytań do Supabase (np. timeout, utrata połączenia). Szczegóły logowane server-side. |
| **500 Internal Server Error** | Błąd obliczania metryk | Nieoczekiwany błąd podczas agregacji danych (np. null values, type errors). Logowane server-side.                  |
| **500 Internal Server Error** | Inny błąd serwera      | Wszelkie inne nieobsłużone wyjątki. Logowane server-side z pełnym stack trace.                                     |

**Przypadki brzegowe do obsłużenia:**

- **Brak aktywnych kont**: Zwraca wszystkie metryki = 0
- **Konto bez value_entries**: Pomija konto w obliczeniach (traktuje jak wartość 0)
- **Tylko zarchiwizowane konta**: Zwraca wszystkie metryki = 0

**Przykład obsługi błędów w handlerze:**

```typescript
try {
  const summary = await DashboardSummaryService.getSummary(supabase, session.user.id);

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
} catch (error) {
  console.error("Error in GET /dashboard/summary:", error);

  return new Response(
    JSON.stringify({
      error: "Nie udało się pobrać podsumowania. Spróbuj ponownie później.",
    }),
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    }
  );
}
```

## 8. Wydajność

### 8.1. Liczba zapytań do bazy danych

**Podejście naiwne** (N+1 query problem):

- **Zapytanie 1**: Pobieranie aktywnych kont użytkownika (1 query)
- **Zapytanie 2-N**: Dla każdego konta pobieranie najnowszego value_entry (N queries)
- **Łącznie**: 1 + N zapytań (gdzie N = liczba kont)

**Podejście zoptymalizowane** (zalecane):

- **Zapytanie 1**: Pobieranie aktywnych kont (1 query)
- **Zapytanie 2**: Jedno zapytanie z podzapytaniem lub użycie PostgreSQL DISTINCT ON:
  ```sql
  SELECT DISTINCT ON (account_id)
    account_id, value, cash_flow, gain_loss
  FROM value_entries
  WHERE account_id IN (...)
  ORDER BY account_id, date DESC
  ```
- **Łącznie**: 2 zapytania niezależnie od liczby kont

### 8.2. Optymalizacja zapytań

- **Indeksy wykorzystywane**:
  - `idx_accounts_user_id` - przyspiesza filtrowanie kont po `user_id`
  - `idx_value_entries_account_id_date` - przyspiesza sortowanie po dacie dla każdego konta

- **RLS**: Polityki RLS są zoptymalizowane i nie dodają znaczącego narzutu

- **Rekomendowane optymalizacje**:
  - Użycie `DISTINCT ON` w PostgreSQL (najwydajniejsze)
  - Alternatywnie: window functions (`ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY date DESC)`)
  - Unikanie N+1 problem poprzez jedno zapytanie z podzapytaniem

### 8.3. Złożoność obliczeniowa

- **Pobieranie kont**: O(K) gdzie K = liczba aktywnych kont użytkownika
- **Pobieranie najnowszych entries**: O(K) z optymalizacją DISTINCT ON
- **Agregacja metryk**: O(K) - jedna iteracja po kontach
- **Łączna złożoność**: O(K) - liniowa względem liczby kont

**Dla typowego przypadku użycia** (5-20 kont): ~50-200ms łącznie z zapytaniami do bazy

### 8.4. Rozmiar odpowiedzi

- **Stały rozmiar**: ~150 bytes JSON (niezipowany)
  ```json
  {
    "net_worth": 20600.5,
    "total_assets": 25000.0,
    "total_liabilities": 4399.5,
    "cumulative_cash_flow": 1500.0,
    "cumulative_gain_loss": 350.25
  }
  ```
- Po kompresji gzip: ~100 bytes
- **Bardzo lekki endpoint** - idealny do częstego odpytywania

### 8.5. Potencjalne wąskie gardła

- **Duża liczba kont** (>100): Zapytanie może być wolniejsze
  - **Mitigacja**: Indeks `idx_value_entries_account_id_date` znacząco przyspiesza
  - **Mitigacja**: Użycie DISTINCT ON zamiast N zapytań

- **Brak value_entries dla niektórych kont**: Może wymagać dodatkowej obsługi NULL values
  - **Mitigacja**: Użycie COALESCE w zapytaniu SQL lub sprawdzenie w kodzie

### 8.6. Cache

- **Rozważyć dodanie cache'u**:
  - Dane zmieniają się tylko gdy użytkownik edytuje wartości
  - Cache może być unieważniany po każdej operacji POST/PATCH/DELETE na accounts/value_entries
  - TTL: 60 sekund (wystarczająco długi, żeby zmniejszyć obciążenie, wystarczająco krótki dla świeżości danych)
  - Header: `Cache-Control: private, max-age=60`

## 9. Etapy wdrożenia

### Krok 1: Utworzenie serwisu DashboardSummaryService

**Plik**: `src/lib/services/dashboard-summary.service.ts` (nowy plik)

**Interfejs serwisu**:

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type { DashboardSummaryDto } from "@/types";

export class DashboardSummaryService {
  static async getSummary(
    supabase: SupabaseClient<Database>,
    userId: string,
    from: string,
    to: string
  ): Promise<DashboardSummaryDto> {
    // Implementacja
  }
}
```

**Implementacja funkcji `getSummary`**:

#### Krok 1.1: Pobierz aktywne konta użytkownika

```typescript
// Pobierz tylko aktywne konta (archived_at = NULL)
const { data: accounts, error: accountsError } = await supabase
  .from("accounts")
  .select("id, type")
  .eq("user_id", userId) // Opcjonalnie - RLS i tak filtruje
  .is("archived_at", null);

if (accountsError) {
  throw new Error(`Failed to fetch accounts: ${accountsError.message}`);
}

// Jeśli brak kont, zwróć zerowe metryki
if (!accounts || accounts.length === 0) {
  return {
    net_worth: 0,
    total_assets: 0,
    total_liabilities: 0,
    cumulative_cash_flow: 0,
    cumulative_gain_loss: 0,
  };
}
```

#### Krok 1.2a: Pobierz najnowsze value_entries (dla total_assets/liabilities)

```typescript
const accountIds = accounts.map((acc) => acc.id);

// Pobierz najnowszą wartość dla każdego konta (do obliczenia aktualnego stanu)
const latestEntries = await Promise.all(
  accountIds.map(async (accountId) => {
    const { data, error } = await supabase
      .from("value_entries")
      .select("account_id, value")
      .eq("account_id", accountId)
      .order("date", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned (konto bez entries)
      throw error;
    }

    return data;
  })
);
```

#### Krok 1.2b: Pobierz value_entries w zakresie dat (dla cumulative sums)

```typescript
// Pobierz wpisy wartości w zakresie dat dla obliczenia skumulowanych sum
// Zgodnie z PRD (US-010) i UX: skumulowane = suma przepływów/zysków dla wybranego okresu
const { data: rangeEntries, error: rangeEntriesError } = await supabase
  .from("value_entries")
  .select("cash_flow, gain_loss")
  .in("account_id", accountIds)
  .gte("date", from)
  .lte("date", to);

if (rangeEntriesError) {
  throw new Error(`Failed to fetch value entries in date range: ${rangeEntriesError.message}`);
}
```

**Uwaga**: Potrzebujemy dwóch osobnych zapytań:

1. Najnowsze wpisy (LIMIT 1 per konto) - dla aktualnych wartości aktywów/pasywów (total_assets, total_liabilities)
2. Wpisy w zakresie dat (from-to) - dla skumulowanych sum cash_flow i gain_loss (cumulative_cash_flow, cumulative_gain_loss)

#### Krok 1.3: Oblicz metryki

```typescript
let total_assets = 0;
let total_liabilities = 0;
let cumulative_cash_flow = 0;
let cumulative_gain_loss = 0;

// Mapuj account ID do typu dla łatwego dostępu
const accountTypeMap = new Map(accounts.map((acc) => [acc.id, acc.type]));

// Oblicz total_assets i total_liabilities z najnowszych wpisów
latestEntries.forEach((entry) => {
  if (!entry) return; // Konto bez entries

  const accountType = accountTypeMap.get(entry.account_id);

  if (accountType === "liability") {
    total_liabilities += entry.value;
  } else {
    // cash_asset lub investment_asset
    total_assets += entry.value;
  }
});

// Oblicz cumulative_cash_flow i cumulative_gain_loss z wpisów w zakresie dat
rangeEntries?.forEach((entry) => {
  cumulative_cash_flow += entry.cash_flow ?? 0;
  cumulative_gain_loss += entry.gain_loss ?? 0;
});

const net_worth = total_assets - total_liabilities;
```

#### Krok 1.4: Zwróć DashboardSummaryDto

```typescript
return {
  net_worth,
  total_assets,
  total_liabilities,
  cumulative_cash_flow,
  cumulative_gain_loss,
};
```

---

### Krok 2: Utworzenie pliku endpointu API

**Plik**: `src/pages/api/dashboard/summary.ts` (nowy plik w podfolderze)

**Struktura pliku**:

```typescript
import type { APIContext } from "astro";
import { DashboardSummaryService } from "@/lib/services/dashboard-summary.service";

export const prerender = false;

export async function GET({ locals }: APIContext) {
  // Implementacja
}
```

---

### Krok 3: Implementacja handlera GET

#### Krok 3.1: Weryfikacja sesji

```typescript
const { supabase, session } = locals;

if (!session) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
```

#### Krok 3.2: Walidacja parametrów zapytania

```typescript
import { z } from "zod";

// Schema walidacji dla parametrów query string
const querySchema = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (expected YYYY-MM-DD)"),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (expected YYYY-MM-DD)"),
  })
  .refine((data) => new Date(data.from) <= new Date(data.to), {
    message: "from date must be before or equal to to date",
  });

const url = new URL(request.url);
const fromParam = url.searchParams.get("from");
const toParam = url.searchParams.get("to");

// Walidacja parametrów
const validationResult = querySchema.safeParse({
  from: fromParam,
  to: toParam,
});

if (!validationResult.success) {
  return new Response(
    JSON.stringify({
      error: "Invalid query parameters",
      details: validationResult.error.format(),
    }),
    {
      status: 400,
      headers: { "Content-Type": "application/json" },
    }
  );
}

const { from, to } = validationResult.data;
```

#### Krok 3.3: Wywołanie serwisu i zwrócenie odpowiedzi

```typescript
try {
  const summary = await DashboardSummaryService.getSummary(supabase, session.user.id, from, to);

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, max-age=60", // Cache na 60s
    },
  });
} catch (error) {
  console.error("Error in GET /dashboard/summary:", error);

  return new Response(
    JSON.stringify({
      error: "Nie udało się pobrać podsumowania. Spróbuj ponownie później.",
    }),
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    }
  );
}
```

---

### Krok 4: Testowanie

#### Testy jednostkowe (Vitest)

**Plik**: `src/test/services/dashboard-summary.service.test.ts`

**Scenariusze do przetestowania**:

1. **Pomyślne obliczenie metryk** - zwraca poprawnie obliczone wartości
2. **Brak aktywnych kont** - zwraca wszystkie metryki = 0
3. **Konto bez value_entries** - pomija konto (nie powoduje błędu)
4. **Tylko konta typu liability** - total_assets = 0, total_liabilities > 0, net_worth < 0
5. **Mieszane typy kont** - poprawnie rozróżnia assets i liabilities
6. **Obliczanie cumulative_cash_flow** - sumuje cash_flow ze wszystkich kont
7. **Obliczanie cumulative_gain_loss** - sumuje gain_loss ze wszystkich kont
8. **Net worth calculation** - net_worth = total_assets - total_liabilities
9. **Najnowszy wpis** - używa tylko najnowszego value_entry dla każdego konta

**Przykładowy test**:

```typescript
import { describe, it, expect, vi } from "vitest";
import { DashboardSummaryService } from "@/lib/services/dashboard-summary.service";

describe("DashboardSummaryService.getSummary", () => {
  it("should calculate correct metrics for mixed account types", async () => {
    const mockSupabase = createMockSupabase({
      accounts: [
        { id: "1", type: "cash_asset" },
        { id: "2", type: "investment_asset" },
        { id: "3", type: "liability" },
      ],
      latestEntries: [
        { account_id: "1", value: 5000, cash_flow: 100, gain_loss: 0 },
        { account_id: "2", value: 15000, cash_flow: 500, gain_loss: 250 },
        { account_id: "3", value: 3000, cash_flow: -100, gain_loss: 0 },
      ],
    });

    const result = await DashboardSummaryService.getSummary(mockSupabase, "user123");

    expect(result.total_assets).toBe(20000); // 5000 + 15000
    expect(result.total_liabilities).toBe(3000);
    expect(result.net_worth).toBe(17000); // 20000 - 3000
    expect(result.cumulative_cash_flow).toBe(500); // 100 + 500 - 100
    expect(result.cumulative_gain_loss).toBe(250); // 0 + 250 + 0
  });

  it("should return zero metrics when user has no accounts", async () => {
    const mockSupabase = createMockSupabase({
      accounts: [],
      latestEntries: [],
    });

    const result = await DashboardSummaryService.getSummary(mockSupabase, "user123");

    expect(result).toEqual({
      net_worth: 0,
      total_assets: 0,
      total_liabilities: 0,
      cumulative_cash_flow: 0,
      cumulative_gain_loss: 0,
    });
  });
});
```

#### Testy integracyjne

**Scenariusze do przetestowania**:

1. **GET /api/dashboard/summary** - zwraca poprawne metryki dla uwierzytelnionego użytkownika
2. **GET /api/dashboard/summary bez uwierzytelnienia** - zwraca 401
3. **Izolacja danych użytkowników** - użytkownik A nie widzi danych użytkownika B

#### Testy E2E (Playwright)

**Scenariusz**: Weryfikacja wyświetlania KPI na pulpicie

1. Zaloguj się jako użytkownik
2. Dodaj 2 konta: jedno aktywo (1000 zł), jedno pasywo (300 zł)
3. Odśwież stronę
4. Weryfikuj, że KPI pokazują:
   - Net worth: 700 zł
   - Total assets: 1000 zł
   - Total liabilities: 300 zł

---

### Krok 5: Integracja z frontendem

**Plik**: `src/lib/stores/useDashboardStore.ts`

**Dodanie lub aktualizacja funkcji `fetchSummary()`**:

```typescript
fetchSummary: async () => {
  set({ isLoading: true, error: null });

  try {
    const response = await fetch("/api/dashboard/summary");

    if (!response.ok) {
      if (response.status === 401) {
        // Użytkownik nie jest zalogowany - przekieruj do /login
        window.location.href = "/login";
        return;
      }
      throw new Error("Failed to fetch summary");
    }

    const summaryData: DashboardSummaryDto = await response.json();

    set({
      summaryData,
      isLoading: false,
    });
  } catch (error) {
    console.error("Error fetching summary:", error);
    set({
      error: error instanceof Error ? error : new Error("Unknown error"),
      isLoading: false,
    });
  }
},
```

**Wywołanie w komponencie**:

```typescript
// src/components/dashboard/IntegratedDashboardPage.tsx
useEffect(() => {
  fetchSummary();
  fetchData(); // Również pobierz grid data
}, []);
```

---

### Krok 6: Dokumentacja

- Dodać komentarze JSDoc do funkcji serwisowej
- Dodać przykłady wywołań API do pliku testowego HTTP

**Przykład pliku testowego HTTP** (`dashboard_summary_tests.http`):

```http
### GET /api/dashboard/summary - Pobranie podsumowania
GET http://localhost:4321/api/dashboard/summary
Authorization: Bearer {{jwt_token}}

### GET /api/dashboard/summary - Bez uwierzytelnienia (powinno zwrócić 401)
GET http://localhost:4321/api/dashboard/summary
```

---

### Krok 7: Optymalizacja (opcjonalnie)

Jeśli endpoint jest wolny dla użytkowników z dużą liczbą kont (>50):

#### Krok 7.1: Utworzenie funkcji PostgreSQL

**Plik**: `supabase/migrations/YYYYMMDDHHMMSS_create_get_dashboard_summary_function.sql`

```sql
-- Funkcja PostgreSQL do obliczania podsumowania dashboardu
CREATE OR REPLACE FUNCTION get_dashboard_summary(p_user_id UUID)
RETURNS TABLE (
  net_worth NUMERIC,
  total_assets NUMERIC,
  total_liabilities NUMERIC,
  cumulative_cash_flow NUMERIC,
  cumulative_gain_loss NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH latest_entries AS (
    SELECT DISTINCT ON (ve.account_id)
      a.type,
      ve.value,
      ve.cash_flow,
      ve.gain_loss
    FROM accounts a
    LEFT JOIN value_entries ve ON ve.account_id = a.id
    WHERE a.user_id = p_user_id
      AND a.archived_at IS NULL
    ORDER BY ve.account_id, ve.date DESC
  )
  SELECT
    COALESCE(SUM(CASE WHEN type != 'liability' THEN value ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN type = 'liability' THEN value ELSE 0 END), 0) as net_worth,
    COALESCE(SUM(CASE WHEN type != 'liability' THEN value ELSE 0 END), 0) as total_assets,
    COALESCE(SUM(CASE WHEN type = 'liability' THEN value ELSE 0 END), 0) as total_liabilities,
    COALESCE(SUM(cash_flow), 0) as cumulative_cash_flow,
    COALESCE(SUM(gain_loss), 0) as cumulative_gain_loss
  FROM latest_entries;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_dashboard_summary(UUID) TO authenticated;
```

#### Krok 7.2: Użycie funkcji w serwisie

```typescript
// Zamiast wielu zapytań, wywołaj funkcję
const { data, error } = await supabase.rpc("get_dashboard_summary", { p_user_id: userId }).single();

if (error) {
  throw new Error(`Failed to get dashboard summary: ${error.message}`);
}

return data as DashboardSummaryDto;
```

**Korzyści**:

- Jedno zapytanie zamiast N+1
- Obliczenia po stronie bazy danych (szybsze)
- Mniejszy transfer danych

---

### Krok 8: Code review i refaktoryzacja

- Sprawdzić, czy logika obliczania metryk jest poprawna
- Upewnić się, że obsługa NULL values jest bezpieczna
- Zweryfikować wydajność na większych zestawach danych (symulacja 100+ kont)
- Sprawdzić spójność komunikatów błędów
- Upewnić się, że kod jest czytelny i dobrze udokumentowany
- Rozważyć dodanie cache'u (Redis) w przyszłości

---

## Podsumowanie kluczowych decyzji

1. **Tylko aktywne konta**: Endpoint domyślnie uwzględnia tylko konta z `archived_at = NULL`, co jest zgodne z logiką biznesową (zarchiwizowane konta nie wpływają na aktualne KPI).

2. **Najnowszy wpis dla każdego konta**: Używamy `ORDER BY date DESC LIMIT 1` dla każdego konta, co zapewnia najbardziej aktualne dane.

3. **Parametry zakresu dat**: Endpoint przyjmuje wymagane parametry `from` i `to` definiujące zakres dat dla skumulowanych metryk. To daje użytkownikowi kontrolę nad analizowanym okresem (np. ostatnie 3 miesiące, rok) i zwiększa wydajność poprzez ograniczenie pobieranych danych.

4. **Obsługa kont bez entries**: Konta bez żadnych value_entries są pomijane w obliczeniach (traktowane jak wartość 0).

5. **Typ net_worth jako number**: Przechowujemy jako number (nie string), frontend może sformatować do waluty.

6. **Cache-Control header**: Dodajemy `max-age=60` aby zmniejszyć niepotrzebne requesty przy szybkim odświeżaniu strony.

7. **Cumulative vs Current**: `cumulative_cash_flow` i `cumulative_gain_loss` są sumowane ze wszystkich najnowszych wpisów, nie tylko z jednej daty.

8. **Optymalizacja przez PostgreSQL function**: Dla większej skalowalności można przenieść obliczenia do funkcji bazodanowej.

---

## Możliwe przyszłe optymalizacje

1. **PostgreSQL function**: Przenieść całą logikę do funkcji `get_dashboard_summary()` w bazie danych
2. **Materializowany widok**: Dla bardzo częstych zapytań, rozważyć materializowany widok odświeżany przez trigger
3. **Redis cache**: Dodać cache z unieważnianiem po każdej modyfikacji danych
4. **Websockets**: Dla real-time updates, rozważyć Supabase Realtime subscriptions
5. **Agregacja na froncie**: Jeśli `GET /grid-data` jest już wywoływane, frontend może obliczyć summary lokalnie zamiast kolejnego API call
6. **Batch endpoints**: Połączyć `/dashboard/summary` i `/grid-data` w jeden endpoint aby zmniejszyć liczbę requestów

---

## Różnice w porównaniu do GET /grid-data

| Aspekt                     | GET /grid-data                          | GET /dashboard/summary                                          |
| -------------------------- | --------------------------------------- | --------------------------------------------------------------- |
| **Zakres danych**          | Wszystkie value_entries w zakresie dat  | Najnowsze value_entries + entries w zakresie dat dla cumulative |
| **Parametry**              | `from`, `to`, `archived`                | `from`, `to`                                                    |
| **Rozmiar odpowiedzi**     | ~10KB (zależnie od zakresu)             | ~150 bytes (stały)                                              |
| **Złożoność obliczeniowa** | O(D × N) gdzie D=daty, N=konta          | O(N) gdzie N=liczba kont                                        |
| **Przypadek użycia**       | Renderowanie siatki i wykresu           | Wyświetlanie KPI na pulpicie                                    |
| **Częstotliwość wywołań**  | Przy zmianie zakresu dat lub filtrów    | Przy każdym załadowaniu dashboardu i zmianie zakresu dat        |
| **Cache'owalność**         | Niska (często się zmienia przez filtry) | Średnia (zmienia się przy zmianie zakresu dat)                  |
