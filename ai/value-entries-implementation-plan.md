# API Endpoint Implementation Plan: POST /value-entries

## 1. Przegląd punktu końcowego

Punkt końcowy `POST /value-entries` to operacja **upsert** (update lub insert) służąca do tworzenia nowego wpisu wartości lub aktualizacji istniejącego dla określonego konta i daty. Endpoint encapsuluje złożoną logikę biznesową polegającą na automatycznym obliczaniu wartości `cash_flow` i `gain_loss` w zależności od typu konta oraz danych dostarczonych przez użytkownika. Operacja jest kluczowa dla funkcjonalności siatki danych w aplikacji Assetly, gdzie użytkownicy edytują wartości swoich kont finansowych.

## 2. Szczegóły żądania

- **Metoda HTTP**: `POST`
- **Struktura URL**: `/api/value-entries`
- **Parametry**:
  - **Wymagane**:
    - `account_id` (string, UUID): Identyfikator konta, dla którego tworzony jest wpis.
    - `date` (string, ISO 8601): Data wpisu wartości (np. "2023-10-28T00:00:00Z").
    - `value` (number): Całkowita wartość konta na dany dzień.
  - **Opcjonalne**:
    - `cash_flow` (number | null): Kwota wpłaty lub wypłaty środków. Jeśli nie podano lub `null`, zostanie obliczona automatycznie.
    - `gain_loss` (number | null): Zysk lub strata inwestycyjna. Jeśli nie podano lub `null`, zostanie obliczona automatycznie.
- **Request Body** (przykład):
  ```json
  {
    "account_id": "e5f6g7h8-...",
    "date": "2023-10-28T00:00:00Z",
    "value": 15500.0,
    "cash_flow": 500.0,
    "gain_loss": null
  }
  ```

## 3. Wykorzystywane typy

Implementacja wykorzystuje następujące typy zdefiniowane w `src/types.ts`:

- **`UpsertValueEntryCommand`**: Command Model dla request body.
  ```typescript
  export interface UpsertValueEntryCommand {
    account_id: string;
    date: string;
    value: number;
    cash_flow?: number | null;
    gain_loss?: number | null;
  }
  ```

- **`ValueEntryDto`**: DTO dla odpowiedzi zwracanej do klienta.
  ```typescript
  export type ValueEntryDto = Pick<ValueEntry, "id" | "account_id" | "date" | "value" | "cash_flow" | "gain_loss">;
  ```

- **`AccountType`**: Enum określający typ konta (wymagany do logiki obliczeniowej).
  ```typescript
  export type AccountType = Enums<"account_type">; // 'investment_asset' | 'cash_asset' | 'liability'
  ```

Dodatkowo w warstwie serwisowej konieczne będzie użycie typów bazowych:
- **`ValueEntry`**: Pełny typ wiersza z tabeli `value_entries`.
- **`Account`**: Typ wiersza z tabeli `accounts` (do pobrania typu konta).

## 4. Szczegóły odpowiedzi

- **Odpowiedź sukcesu (`200 OK`)**:
  - Zwraca utworzony lub zaktualizowany obiekt `ValueEntryDto`.
  - Przykład:
    ```json
    {
      "id": "z1y2x3w4-...",
      "account_id": "e5f6g7h8-...",
      "date": "2023-10-28T00:00:00Z",
      "value": 15500.0,
      "cash_flow": 500.0,
      "gain_loss": 250.0
    }
    ```

- **Odpowiedzi błędów**:
  - **`400 Bad Request`**: 
    - Brakujące wymagane pola (`account_id`, `date`, `value`).
    - Nieprawidłowy format danych (np. `value` nie jest liczbą).
    - Niespójność danych: `previous_value + cash_flow + gain_loss ≠ value` (gdy użytkownik ręcznie podał wszystkie trzy wartości).
    - Treść odpowiedzi zawiera szczegóły błędu walidacji.
  - **`401 Unauthorized`**: Użytkownik nie jest uwierzytelniony.
  - **`404 Not Found`**: Konto o podanym `account_id` nie istnieje lub nie należy do uwierzytelnionego użytkownika.
  - **`500 Internal Server Error`**: Błąd bazy danych lub inny nieoczekiwany błąd serwera.

## 5. Przepływ danych

1. Żądanie `POST` trafia do endpointu `/api/value-entries`.
2. Middleware Astro (`src/middleware/index.ts`) weryfikuje JWT i dołącza sesję użytkownika oraz klienta Supabase do `context.locals`. Jeśli uwierzytelnianie zawiedzie, zwraca `401 Unauthorized`.
3. Handler `POST` w `src/pages/api/value-entries.ts` jest wywoływany.
4. Handler parsuje i waliduje request body za pomocą schematu Zod opartego na `UpsertValueEntryCommand`. Przy niepowodzeniu walidacji zwraca `400 Bad Request`.
5. Handler wywołuje funkcję serwisową, np. `ValueEntryService.upsertValueEntry(supabase, session.user.id, command)`.
6. Funkcja serwisowa wykonuje następujące kroki:
   - **Krok 1**: Weryfikuje istnienie konta (`account_id`) i sprawdza, czy należy ono do zalogowanego użytkownika. Jeśli nie, rzuca błąd `NotFoundError` → API zwraca `404`.
   - **Krok 2**: Pobiera typ konta (`account.type`) - niezbędny do logiki obliczeniowej.
   - **Krok 3**: Pobiera poprzednią wartość wpisu (`previous_value`) dla tego samego konta z daty bezpośrednio poprzedzającej podaną datę. Jeśli nie istnieje poprzedni wpis, `previous_value = 0`.
   - **Krok 4**: Implementuje logikę biznesową (szczegóły w sekcji 5.1).
   - **Krok 5**: Wykonuje operację upsert na tabeli `value_entries` używając Supabase (`.upsert()` z opcją `onConflict: 'account_id,date'`).
   - **Krok 6**: Zwraca utworzony/zaktualizowany wpis do handlera.
7. Handler API formatuje dane zgodnie z `ValueEntryDto` i zwraca odpowiedź `200 OK`.
8. W przypadku błędów:
   - `NotFoundError` → `404 Not Found`
   - `ValidationError` (spójność danych) → `400 Bad Request`
   - Inne błędy → `500 Internal Server Error`

### 5.1. Logika biznesowa (w serwisie)

Logika automatycznego obliczania `cash_flow` i `gain_loss` działa według trzech scenariuszy:

**Scenariusz 1: Podano tylko `value`** (`cash_flow` i `gain_loss` są `null` lub nie podane)
- Jeśli `account.type === 'cash_asset'` lub `account.type === 'liability'`:
  - `cash_flow = value - previous_value`
  - `gain_loss = 0`
- Jeśli `account.type === 'investment_asset'`:
  - `cash_flow = 0`
  - `gain_loss = value - previous_value`

**Scenariusz 2: Podano `value` i `cash_flow`** (`gain_loss` jest `null` lub nie podane)
- `gain_loss = value - previous_value - cash_flow`
- Wartość `cash_flow` użyta bezpośrednio z command.

**Scenariusz 3: Podano `value`, `cash_flow` i `gain_loss`** (wszystkie trzy pola wypełnione ręcznie)
- **Walidacja spójności**: `previous_value + cash_flow + gain_loss` musi być równe `value`.
- Jeśli walidacja nie przechodzi, rzuć `ValidationError` z komunikatem: "Dane niespójne: poprzednia wartość + wpłata + zysk/strata nie równa się nowej wartości."
- Jeśli walidacja przechodzi, użyj wartości podanych przez użytkownika.

**Obsługa wartości domyślnych:**
- Jeśli `cash_flow` nie jest podane (undefined) lub jest `null`, ustaw jako `0` przed obliczeniami (w zależności od scenariusza).
- Analogicznie dla `gain_loss`.

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie**: Wszystkie żądania wymagają prawidłowego JWT w nagłówku `Authorization`. Middleware Astro zapewnia weryfikację.
- **Autoryzacja**: 
  - Polityki Row-Level Security (RLS) na tabeli `value_entries` są **pośrednie** (poprzez relację z tabelą `accounts`). 
  - Serwis **musi jawnie** sprawdzić, czy konto o `account_id` należy do użytkownika przed wykonaniem operacji upsert, ponieważ polityki RLS na `value_entries` nie filtrują bezpośrednio po `user_id` (kolumna ta nie istnieje w tej tabeli).
  - Sprawdzenie: `SELECT user_id FROM accounts WHERE id = account_id` i porównanie z `session.user.id`.
- **Walidacja danych wejściowych**: 
  - Schemat Zod weryfikuje typy, obecność wymaganych pól oraz format UUID dla `account_id`.
  - Walidacja ISO 8601 dla `date`.
  - Walidacja liczbowa dla `value`, `cash_flow`, `gain_loss` (muszą być liczbami lub null).
- **Precyzja finansowa**: Wszystkie obliczenia wykonywane są na typach numerycznych zgodnych z `NUMERIC(18, 4)` w bazie danych.

## 7. Obsługa błędów

| Kod statusu | Scenariusz | Szczegóły |
|-------------|-----------|-----------|
| **400 Bad Request** | Walidacja Zod nie powiodła się | Brak wymaganych pól, nieprawidłowy format UUID, nieprawidłowy typ danych. Odpowiedź zawiera szczegóły błędów walidacji z Zod. |
| **400 Bad Request** | Niespójność danych | Gdy użytkownik ręcznie podał wszystkie trzy wartości (`value`, `cash_flow`, `gain_loss`) i `previous_value + cash_flow + gain_loss ≠ value`. Komunikat: "Dane niespójne: poprzednia wartość + wpłata + zysk/strata nie równa się nowej wartości." |
| **401 Unauthorized** | Brak uwierzytelnienia | Token JWT jest nieprawidłowy, wygasły lub nie został dostarczony. Obsługiwane przez middleware. |
| **404 Not Found** | Konto nie istnieje | Konto o podanym `account_id` nie istnieje w bazie danych. |
| **404 Not Found** | Brak autoryzacji | Konto istnieje, ale nie należy do zalogowanego użytkownika (wykryte przez sprawdzenie `user_id`). |
| **500 Internal Server Error** | Błąd bazy danych | Nieprzewidziany błąd podczas wykonywania zapytania do Supabase (np. utrata połączenia, timeout). Szczegóły błędu logowane server-side. |
| **500 Internal Server Error** | Inny błąd serwera | Wszelkie inne nieobsłużone wyjątki. Logowane server-side. |

**Implementacja obsługi błędów w handlerze:**
```typescript
try {
  const result = await ValueEntryService.upsertValueEntry(...);
  return new Response(JSON.stringify(result), { status: 200 });
} catch (error) {
  if (error instanceof NotFoundError) {
    return new Response(JSON.stringify({ error: error.message }), { status: 404 });
  }
  if (error instanceof ValidationError) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
  console.error('Unexpected error in POST /value-entries:', error);
  return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
}
```

## 8. Wydajność

- **Liczba zapytań do bazy danych**: 
  - 1 zapytanie: Pobranie konta i weryfikacja właściciela (SELECT na `accounts`).
  - 1 zapytanie: Pobranie poprzedniego wpisu wartości (SELECT na `value_entries` z ORDER BY date DESC LIMIT 1).
  - 1 zapytanie: Upsert wpisu wartości (INSERT ... ON CONFLICT).
  - **Łącznie: 3 zapytania** na jedno żądanie.
  
- **Optymalizacja zapytań**:
  - Istniejący indeks złożony `idx_value_entries_account_id_date` przyspiesza wyszukiwanie poprzedniej wartości.
  - Constraint `UNIQUE (account_id, date)` na `value_entries` zapewnia efektywny upsert.
  - Indeks `idx_accounts_user_id` przyspiesza weryfikację właściciela konta.

- **Potencjalne wąskie gardła**:
  - Przy dużej liczbie równoczesnych żądań od wielu użytkowników, operacje upsert mogą powodować krótkotrwałe blokady na poziomie wiersza w bazie danych. To jest akceptowalne dla MVP.
  - Jeśli w przyszłości będzie potrzeba bardziej złożonych obliczeń (np. agregacje dla wielu dat), rozważyć cache'owanie wyników.

- **Brak transakcji**: 
  - Operacja składa się z kilku zapytań, ale nie wymaga explicite transakcji, ponieważ każde zapytanie jest atomowe.
  - Jedyna operacja modyfikująca dane (upsert) jest pojedynczym wywołaniem.

## 9. Etapy wdrożenia

1. **Utworzenie schematu walidacji Zod**:
   - W pliku `src/lib/validation/value-entry.schemas.ts` (nowy plik) zdefiniuj schemat `upsertValueEntrySchema` bazujący na `UpsertValueEntryCommand`.
   - Walidacja:
     - `account_id`: string, format UUID.
     - `date`: string, format ISO 8601 (wykorzystaj `z.string().datetime()`).
     - `value`: number.
     - `cash_flow`: optional, number lub null.
     - `gain_loss`: optional, number lub null.

2. **Utworzenie lub rozszerzenie serwisu**:
   - W `src/lib/services/` utwórz plik `value-entry.service.ts` (lub rozszerz istniejący `account.service.ts` jeśli logicznie pasuje).
   - Dodaj funkcję asynchroniczną `upsertValueEntry(supabase: SupabaseClient, userId: string, command: UpsertValueEntryCommand): Promise<ValueEntryDto>`.

3. **Implementacja logiki serwisowej** w `upsertValueEntry`:
   - **Krok 3.1**: Pobierz konto i zweryfikuj właściciela:
     ```typescript
     const { data: account, error: accountError } = await supabase
       .from('accounts')
       .select('id, type, user_id')
       .eq('id', command.account_id)
       .single();
     
     if (accountError || !account || account.user_id !== userId) {
       throw new NotFoundError('Account not found or access denied');
     }
     ```
   
   - **Krok 3.2**: Pobierz poprzednią wartość wpisu:
     ```typescript
     const { data: previousEntry } = await supabase
       .from('value_entries')
       .select('value')
       .eq('account_id', command.account_id)
       .lt('date', command.date)
       .order('date', { ascending: false })
       .limit(1)
       .maybeSingle();
     
     const previousValue = previousEntry?.value ?? 0;
     ```
   
   - **Krok 3.3**: Zaimplementuj logikę obliczeniową (3 scenariusze opisane w sekcji 5.1).
   
   - **Krok 3.4**: Wykonaj upsert:
     ```typescript
     const { data: upsertedEntry, error: upsertError } = await supabase
       .from('value_entries')
       .upsert({
         account_id: command.account_id,
         date: command.date,
         value: command.value,
         cash_flow: calculatedCashFlow,
         gain_loss: calculatedGainLoss
       }, { onConflict: 'account_id,date' })
       .select()
       .single();
     
     if (upsertError) throw upsertError;
     ```
   
   - **Krok 3.5**: Zwróć obiekt `ValueEntryDto` (mapowanie).

4. **Utworzenie pliku endpointu API**:
   - Utwórz `src/pages/api/value-entries.ts`.

5. **Konfiguracja endpointu**:
   - Dodaj `export const prerender = false;` na początku pliku.

6. **Implementacja handlera `POST`**:
   - Zdefiniuj funkcję `export async function POST({ request, locals }: APIContext)`.
   - Pobierz `supabase` i `session` z `locals`. Jeśli `session` nie istnieje, zwróć `401`.
   - Parsuj request body: `const body = await request.json()`.
   - Waliduj body za pomocą schematu Zod. Przy błędzie zwróć `400` z detalami.
   - Wywołaj `ValueEntryService.upsertValueEntry(supabase, session.user.id, validatedCommand)` w bloku try-catch.
   - Obsłuż błędy zgodnie z sekcją 7 (404, 400, 500).
   - Przy sukcesie zwróć `200 OK` z obiektem `ValueEntryDto`.

7. **Utworzenie custom error types** (jeśli nie istnieją):
   - W `src/lib/errors.ts` dodaj:
     ```typescript
     export class NotFoundError extends Error {
       constructor(message: string) {
         super(message);
         this.name = 'NotFoundError';
       }
     }
     
     export class ValidationError extends Error {
       constructor(message: string) {
         super(message);
         this.name = 'ValidationError';
       }
     }
     ```

8. **Testowanie**:
   - **Testy jednostkowe** (`src/test/services/value-entry.service.test.ts`):
     - Test scenariusza 1 (tylko value, cash_asset) - sprawdź obliczenia cash_flow.
     - Test scenariusza 1 (tylko value, investment_asset) - sprawdź obliczenia gain_loss.
     - Test scenariusza 2 (value + cash_flow) - sprawdź obliczenia gain_loss.
     - Test scenariusza 3 (wszystkie 3, spójne) - sprawdź akceptację.
     - Test scenariusza 3 (wszystkie 3, niespójne) - sprawdź ValidationError.
     - Test braku poprzedniej wartości (previous_value = 0).
     - Test konta nie należącego do użytkownika (NotFoundError).
     - Test nieistniejącego konta (NotFoundError).
   
   - **Testy integracyjne** (endpoint API):
     - Test pomyślnego utworzenia nowego wpisu (201 w specyfikacji, ale używamy 200 dla upsert).
     - Test pomyślnej aktualizacji istniejącego wpisu (upsert).
     - Test błędu walidacji (400) - brak wymaganych pól.
     - Test błędu autoryzacji (401) - brak tokena.
     - Test błędu 404 - nieistniejące konto.
     - Test błędu 400 - niespójność danych.
   
   - **Testy E2E** (Playwright, opcjonalne dla tego endpointu):
     - Symulacja edycji wartości komórki w siatce danych i sprawdzenie, czy zmiany zostały zapisane.

9. **Dokumentacja**:
   - Dodaj komentarze JSDoc do funkcji serwisowej opisujące parametry i zwracane wartości.
   - Upewnij się, że schemat Zod ma jasne komunikaty błędów dla użytkownika końcowego.

10. **Code review i refaktoryzacja**:
    - Sprawdź, czy logika obliczeniowa jest czytelna i łatwa do utrzymania.
    - Rozważ wyodrębnienie logiki 3 scenariuszy do osobnych funkcji pomocniczych w serwisie dla lepszej czytelności.
    - Upewnij się, że wszystkie error messages są spójne i przyjazne użytkownikowi.

---

## Podsumowanie kluczowych decyzji

- **Kod statusu odpowiedzi**: Używamy `200 OK` dla operacji upsert (zarówno create, jak i update), zgodnie ze specyfikacją API.
- **Logika biznesowa w serwisie**: Cała złożona logika obliczeniowa jest wyodrębniona do warstwy serwisowej, co ułatwia testowanie i utrzymanie.
- **Walidacja spójności danych**: Wykonywana tylko gdy użytkownik ręcznie podał wszystkie trzy wartości, zapewniając integralność danych.
- **Autoryzacja dwupoziomowa**: Middleware weryfikuje JWT, a serwis dodatkowo sprawdza własność konta poprzez porównanie `user_id`.
- **Upsert jako operacja atomowa**: Wykorzystanie mechanizmu `ON CONFLICT` w Supabase zapewnia, że operacja jest bezpieczna w przypadku równoczesnych żądań dla tego samego konta i daty.
