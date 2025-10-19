# API Endpoint Implementation Plan: GET /accounts

## 1. Przegląd punktu końcowego

Punkt końcowy `GET /accounts` jest przeznaczony do pobierania listy wszystkich kont finansowych należących do aktualnie uwierzytelnionego użytkownika. Umożliwia filtrowanie wyników w celu włączenia lub wyłączenia zarchiwizowanych kont.

## 2. Szczegóły żądania

-   **Metoda HTTP**: `GET`
-   **Struktura URL**: `/api/accounts`
-   **Parametry Zapytania (Query Parameters)**:
    -   **Opcjonalne**:
        -   `archived` (boolean): Jeśli `true`, odpowiedź będzie zawierać również konta zarchiwizowane. Domyślnie `false`.
-   **Request Body**: Brak (dla żądania GET).

## 3. Wykorzystywane typy

Do strukturyzacji danych odpowiedzi zostanie wykorzystany następujący DTO (Data Transfer Object) zdefiniowany w pliku `src/types.ts`:

-   `AccountDto`: Określa kształt obiektu konta zwracanego do klienta.
    ```typescript
    export type AccountDto = Pick<
        Account,
        'id' | 'name' | 'type' | 'currency' | 'archived_at' | 'created_at'
    >;
    ```

## 4. Szczegóły odpowiedzi

-   **Odpowiedź sukcesu (`200 OK`)**:
    -   Zwraca tablicę obiektów `AccountDto`.
    -   Przykładowa odpowiedź:
        ```json
        [
          {
            "id": "a1b2c3d4-...",
            "name": "mBank Savings",
            "type": "cash_asset",
            "currency": "PLN",
            "archived_at": null,
            "created_at": "2023-10-27T10:00:00Z"
          }
        ]
        ```
-   **Odpowiedzi błędów**:
    -   `400 Bad Request`: Gdy parametr `archived` ma nieprawidłową wartość.
    -   `401 Unauthorized`: Gdy użytkownik nie jest uwierzytelniony.
    -   `500 Internal Server Error`: W przypadku nieoczekiwanego błędu po stronie serwera.

## 5. Przepływ danych

1.  Żądanie `GET` trafia do punktu końcowego `/api/accounts`.
2.  Middleware Astro (`src/middleware/index.ts`) przechwytuje żądanie, weryfikuje token JWT z nagłówka `Authorization` i dołącza sesję użytkownika oraz klienta Supabase do `context.locals`. Jeśli token jest nieprawidłowy, middleware zwraca `401 Unauthorized`.
3.  Handler `GET` w `src/pages/api/accounts.ts` jest wywoływany.
4.  Handler odczytuje parametr `archived` z `Astro.url.searchParams`.
5.  Schemat Zod jest używany do walidacji parametru `archived`. Jeśli walidacja się nie powiedzie, zwracany jest błąd `400 Bad Request`.
6.  Handler wywołuje funkcję serwisową, np. `AccountService.getAccounts(supabase, includeArchived)`.
7.  Funkcja serwisowa konstruuje zapytanie do Supabase, aby pobrać dane z tabeli `accounts`.
    -   Zapytanie automatycznie uwzględnia polityki RLS, filtrując wyniki tylko dla zalogowanego użytkownika (`user_id`).
    -   Jeśli parametr `includeArchived` jest `false`, do zapytania dodawany jest warunek `.is('archived_at', null)`.
    -   Zapytanie selekcjonuje tylko kolumny wymagane przez `AccountDto`.
8.  Serwis zwraca pobrane dane lub błąd do handlera.
9.  Handler formatuje odpowiedź i zwraca ją do klienta z kodem statusu `200 OK` w przypadku sukcesu lub `500 Internal Server Error` w przypadku błędu z serwisu.

## 6. Względy bezpieczeństwa

-   **Uwierzytelnianie**: Każde żądanie musi zawierać prawidłowy token JWT (Bearer Token) w nagłówku `Authorization`. Proces ten jest zarządzany przez middleware Astro i Supabase Auth.
-   **Autoryzacja**: Dostęp do danych jest kontrolowany na poziomie bazy danych za pomocą polityk Row-Level Security (RLS) na tabeli `accounts`. Polityki te zapewniają, że zapytania mogą odczytywać tylko wiersze, gdzie `user_id` pasuje do ID uwierzytelnionego użytkownika (`auth.uid()`).
-   **Walidacja danych wejściowych**: Parametr zapytania `archived` będzie walidowany za pomocą biblioteki Zod, aby zapobiec nieoczekiwanym lub złośliwym danym wejściowym.

## 7. Obsługa błędów

-   **`400 Bad Request`**: Zwracany, gdy walidacja schematem Zod dla parametru `archived` nie powiedzie się (np. `archived=not_a_boolean`). Odpowiedź będzie zawierać szczegóły błędu walidacji.
-   **`401 Unauthorized`**: Zwracany przez middleware, jeśli brakuje tokena uwierzytelniającego, jest on nieprawidłowy lub wygasł.
-   **`500 Internal Server Error`**: Zwracany, gdy wystąpi błąd podczas komunikacji z bazą danych Supabase lub inny nieprzewidziany błąd serwera. Szczegóły błędu zostaną zalogowane po stronie serwera w celu debugowania.

## 8. Rozważania dotyczące wydajności

-   **Indeksowanie bazy danych**: Aby zapewnić szybkie wykonywanie zapytań, na kolumnie `user_id` w tabeli `accounts` powinien istnieć indeks.
-   **Paginacja**: W ramach MVP, przy założeniu małej liczby kont na użytkownika, paginacja nie jest wymagana. Należy ją rozważyć w przyszłości, jeśli liczba kont może znacząco wzrosnąć.
-   **Rozmiar odpowiedzi**: Zapytanie do bazy danych będzie selekcjonować tylko niezbędne kolumny (`id`, `name`, `type`, `currency`, `archived_at`, `created_at`), minimalizując rozmiar przesyłanych danych.

## 9. Etapy wdrożenia

1.  **Stworzenie schematu walidacji**: Zdefiniuj schemat Zod w `src/pages/api/accounts.ts` do walidacji parametru `archived` (powinien on poprawnie parsować "true" i "false" do wartości boolean).
2.  **Utworzenie serwisu**: Jeśli nie istnieje, utwórz plik `src/lib/services/account.service.ts`.
3.  **Implementacja logiki serwisu**: W `account.service.ts` dodaj asynchroniczną funkcję `getAccounts(supabase: SupabaseClient, includeArchived: boolean)`. Funkcja ta zbuduje i wykona zapytanie Supabase, uwzględniając warunek `archived_at`.
4.  **Utworzenie pliku endpointu API**: Stwórz plik `src/pages/api/accounts.ts`.
5.  **Konfiguracja endpointu**: W pliku `accounts.ts` dodaj `export const prerender = false;` aby zapewnić renderowanie dynamiczne.
6.  **Implementacja handlera `GET`**:
    -   Pobierz klienta `supabase` i sesję użytkownika z `context.locals`. Jeśli brak użytkownika, zwróć odpowiedź `401`.
    -   Użyj schematu Zod do sparsowania i zwalidowania parametru `archived` z URL. W przypadku błędu, zwróć `400`.
    -   Wywołaj funkcję `AccountService.getAccounts`, przekazując klienta Supabase i zwalidowany parametr.
    -   Obsłuż odpowiedź z serwisu: w przypadku błędu zwróć `500`, w przeciwnym razie zwróć dane z kodem `200 OK`.
7.  **Testowanie**: Napisz testy jednostkowe dla logiki serwisu oraz testy integracyjne dla punktu końcowego API, które sprawdzą:
    -   Przypadek pomyślny (domyślny, tylko aktywne konta).
    -   Przypadek z `archived=true`.
    -   Obsługę braku uwierzytelnienia (`401`).
    -   Obsługę nieprawidłowego parametru (`400`).
