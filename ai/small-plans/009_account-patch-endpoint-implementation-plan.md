# API Endpoint Implementation Plan: PATCH /accounts/{id}

## 1. Przegląd punktu końcowego

Punkt końcowy `PATCH /accounts/{id}` umożliwia częściową aktualizację istniejącego konta finansowego należącego do uwierzytelnionego użytkownika. Główne przypadki użycia to zmiana nazwy konta oraz jego archiwizacja lub przywrócenie z archiwum. Operacja musi być bezpieczna i zapewniać, że użytkownik może modyfikować tylko własne zasoby.

## 2. Szczegóły żądania

- **Metoda HTTP**: `PATCH`
- **Struktura URL**: `/api/accounts/[id]`
- **Parametry URL**:
  - **Wymagane**:
    - `id` (string, UUID): Unikalny identyfikator konta, które ma zostać zaktualizowane.
- **Request Body**: Obiekt JSON zawierający co najmniej jedno z poniższych pól.
  - **Opcjonalne**:
    - `name` (string): Nowa nazwa dla konta. Musi być unikalna w obrębie kont danego użytkownika.
    - `archived_at` (string | null): Data archiwizacji w formacie ISO 8601 (np. "2023-10-28T12:00:00Z") lub `null`, aby przywrócić konto z archiwum.

## 3. Wykorzystywane typy

Implementacja będzie opierać się na następujących typach zdefiniowanych w `src/types.ts`:

- **`UpdateAccountCommand`**: Command Model, który posłuży jako podstawa dla schematu walidacji Zod.
  ```typescript
  export type UpdateAccountCommand = Pick<TablesUpdate<"accounts">, "name" | "archived_at">;
  ```
- **`AccountDto`**: DTO definiujący kształt obiektu konta zwracanego w odpowiedzi po pomyślnej aktualizacji.
  ```typescript
  export type AccountDto = Pick<Account, "id" | "name" | "type" | "currency" | "archived_at" | "created_at">;
  ```

## 4. Szczegóły odpowiedzi

- **Odpowiedź sukcesu (`200 OK`)**:
  - Zwraca pełny, zaktualizowany obiekt konta w formacie `AccountDto`.
  - Przykład odpowiedzi:
    ```json
    {
      "id": "a1b2c3d4-...",
      "name": "My Renamed Account",
      "type": "cash_asset",
      "currency": "PLN",
      "archived_at": null,
      "created_at": "2023-10-27T10:00:00Z"
    }
    ```
- **Odpowiedzi błędów**:
  - `400 Bad Request`: Nieprawidłowe ciało żądania (np. puste, zły format danych) lub nieprawidłowy format `id` w URL.
  - `401 Unauthorized`: Użytkownik nie jest uwierzytelniony.
  - `404 Not Found`: Konto o podanym `id` nie istnieje lub nie należy do zalogowanego użytkownika.
  - `409 Conflict`: Próba zmiany nazwy na taką, która już istnieje w ramach kont użytkownika.
  - `500 Internal Server Error`: W przypadku nieoczekiwanego błędu serwera.

## 5. Przepływ danych

1.  Żądanie `PATCH` trafia do dynamicznego endpointu `/api/accounts/[id].ts`.
2.  Middleware Astro (`src/middleware/index.ts`) weryfikuje token JWT i dołącza sesję użytkownika oraz klienta Supabase do `context.locals`. W przypadku błędu zwraca `401 Unauthorized`.
3.  Handler `PATCH` w `src/pages/api/accounts/[id].ts` jest wywoływany.
4.  Handler waliduje parametr `id` z URL (musi być poprawnym UUID) oraz ciało żądania za pomocą schematu Zod. W przypadku błędu walidacji zwraca `400 Bad Request`.
5.  Handler wywołuje funkcję serwisową, np. `AccountService.updateAccount(supabase, session.user.id, accountId, command)`.
6.  Funkcja serwisowa wykonuje zapytanie `update` do tabeli `accounts` w Supabase. Zapytanie zawiera klauzulę `WHERE` filtrującą zarówno po `id` konta, jak i `user_id` z sesji.
7.  Jeśli zapytanie nie zaktualizuje żadnego wiersza (ponieważ konto nie istnieje lub nie należy do użytkownika), serwis rzuca błąd `NotFoundError`.
8.  Jeśli baza danych zwróci błąd unikalności (`23505` dla `(user_id, name)`), serwis rzuca błąd `ConflictError`.
9.  W przypadku sukcesu, serwis zwraca zaktualizowany obiekt konta.
10. Handler API łapie błędy z serwisu i mapuje je na odpowiednie kody statusu (`404`, `409`). W przypadku sukcesu, zwraca odpowiedź `200 OK` z danymi `AccountDto`.

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie**: Dostęp jest chroniony przez middleware Astro, który wymaga ważnego tokena JWT.
- **Autoryzacja**: Kluczowym elementem bezpieczeństwa jest weryfikacja własności zasobu. Zapytanie `update` musi zawierać warunek `eq('user_id', userId)`. To zapobiega możliwości modyfikacji konta innego użytkownika, nawet jeśli zna jego UUID. Polityki RLS w bazie danych stanowią dodatkową warstwę ochrony.
- **Walidacja danych wejściowych**: Zarówno parametr `id` z URL, jak i pola `name` oraz `archived_at` z ciała żądania muszą być rygorystycznie walidowane za pomocą Zod, aby zapobiec błędom i potencjalnym atakom.

## 7. Obsługa błędów

| Kod statusu | Scenariusz | Szczegóły |
| :--- | :--- | :--- |
| `400 Bad Request` | Błąd walidacji | - `id` w URL nie jest poprawnym UUID.<br>- Ciało żądania jest puste.<br>- `name` jest pustym stringiem.<br>- `archived_at` nie jest poprawną datą ISO 8601 lub `null`. |
| `401 Unauthorized` | Brak uwierzytelnienia | Brak, nieważny lub wygasły token JWT. |
| `404 Not Found` | Zasób nie istnieje | Konto o podanym `id` nie istnieje lub nie należy do uwierzytelnionego użytkownika. |
| `409 Conflict` | Konflikt nazwy | Użytkownik próbuje zmienić nazwę konta na taką, która już istnieje w jego puli kont. |
| `500 Internal Server Error` | Błąd serwera | Błąd połączenia z bazą danych lub inny nieoczekiwany wyjątek. |

## 8. Rozważania dotyczące wydajności

- **Zapytania do bazy danych**: Operacja wymaga tylko jednego zapytania `UPDATE`, co jest bardzo wydajne.
- **Indeksowanie**: Istniejący klucz główny na `id` oraz indeks na `user_id` zapewniają szybkie wyszukiwanie wiersza do aktualizacji. Indeks unikalności na `(user_id, name)` efektywnie obsługuje sprawdzanie konfliktów nazw.
- **Rozmiar payloadu**: Zarówno żądanie, jak i odpowiedź mają bardzo mały rozmiar, co minimalizuje opóźnienia sieciowe.

## 9. Etapy wdrożenia

1.  **Utworzenie schematu walidacji Zod**:
    - W nowym pliku `src/lib/validation/account.schemas.ts` (lub istniejącym) zdefiniuj schemat `updateAccountSchema`.
    - Schemat powinien walidować `name` (opcjonalny, niepusty string) i `archived_at` (opcjonalny, data ISO lub null).
    - Dodaj `.refine()`, aby upewnić się, że co najmniej jedno z pól jest zdefiniowane.
    - Zdefiniuj osobny schemat dla walidacji parametru `id` jako UUID.

2.  **Implementacja logiki serwisowej**:
    - W `src/lib/services/account.service.ts` dodaj nową funkcję asynchroniczną `updateAccount(supabase, userId, accountId, command)`.
    - Funkcja powinna konstruować i wykonywać zapytanie `update` do Supabase, zawierające `eq('id', accountId)` i `eq('user_id', userId)`.
    - Dodaj obsługę błędów: sprawdzaj `error` z Supabase i rzucaj `NotFoundError` lub `ConflictError` (na podstawie `error.code`).

3.  **Utworzenie pliku endpointu API**:
    - Stwórz plik `src/pages/api/accounts/[id].ts`.
    - Dodaj `export const prerender = false;` na początku pliku.

4.  **Implementacja handlera `PATCH`**:
    - Zdefiniuj `export async function PATCH({ params, request, locals })`.
    - Pobierz `id` z `params` i zwaliduj go jako UUID.
    - Pobierz i zwaliduj ciało żądania za pomocą `updateAccountSchema`.
    - Wywołaj `AccountService.updateAccount` w bloku `try...catch`.
    - W bloku `catch` mapuj `NotFoundError` na `404`, a `ConflictError` na `409`.
    - W przypadku sukcesu, zwróć odpowiedź `200 OK` z danymi `AccountDto`.

5.  **Testowanie**:
    - **Testy jednostkowe (serwis)**:
        - Test pomyślnej aktualizacji nazwy.
        - Test pomyślnej archiwizacji (`archived_at` z datą).
        - Test pomyślnego przywrócenia (`archived_at` jako `null`).
        - Test próby aktualizacji nieistniejącego konta (oczekiwany `NotFoundError`).
        - Test próby zmiany nazwy na istniejącą (oczekiwany `ConflictError`).
    - **Testy integracyjne (endpoint)**:
        - Test `200 OK` dla poprawnego żądania.
        - Test `400 Bad Request` dla nieprawidłowego `id` i ciała żądania.
        - Test `401 Unauthorized` bez tokena.
        - Test `404 Not Found` dla nieistniejącego `id`.
        - Test `409 Conflict` dla duplikatu nazwy.
