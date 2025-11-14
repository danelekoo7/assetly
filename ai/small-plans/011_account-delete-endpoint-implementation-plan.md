# API Endpoint Implementation Plan: DELETE /accounts/{id}

## 1. Przegląd punktu końcowego

Punkt końcowy `DELETE /accounts/{id}` jest przeznaczony do trwałego usuwania konta finansowego oraz wszystkich powiązanych z nim wpisów wartości. Dzięki zastosowaniu `ON DELETE CASCADE` w schemacie bazy danych, usunięcie konta automatycznie pociąga za sobą usunięcie wszystkich jego historycznych wpisów, zapewniając spójność danych.

## 2. Szczegóły żądania

- **Metoda HTTP**: `DELETE`
- **Struktura URL**: `/api/accounts/[id]`
- **Parametry URL**:
  - **Wymagane**:
    - `id` (string, UUID): Unikalny identyfikator konta, które ma zostać usunięte.
- **Request Body**: Brak.

## 3. Wykorzystywane typy

Dla tej operacji nie są wymagane żadne dedykowane typy DTO (Data Transfer Object) ani Command Model, ponieważ żądanie nie zawiera ciała, a odpowiedź sukcesu nie zwraca treści.

## 4. Szczegóły odpowiedzi

- **Odpowiedź sukcesu (`204 No Content`)**:
  - Pusta odpowiedź bez ciała, wskazująca, że zasób został pomyślnie usunięty.
- **Odpowiedzi błędów**:
  - `400 Bad Request`: Jeśli `id` w URL nie jest poprawnym formatem UUID.
  - `401 Unauthorized`: Jeśli użytkownik nie jest uwierzytelniony.
  - `404 Not Found`: Jeśli konto o podanym `id` nie istnieje lub nie należy do uwierzytelnionego użytkownika.
  - `500 Internal Server Error`: W przypadku nieoczekiwanego błędu po stronie serwera.

## 5. Przepływ danych

1.  Żądanie `DELETE` trafia do dynamicznego endpointu `/api/accounts/[id].ts`.
2.  Middleware Astro (`src/middleware/index.ts`) przechwytuje żądanie, weryfikuje token JWT i dołącza sesję użytkownika oraz klienta Supabase do `context.locals`. W przypadku błędu uwierzytelniania zwraca `401 Unauthorized`.
3.  Handler `DELETE` w `src/pages/api/accounts/[id].ts` jest wywoływany.
4.  Handler waliduje parametr `id` z URL, sprawdzając, czy jest to poprawny format UUID. W przypadku błędu zwraca `400 Bad Request`.
5.  Handler wywołuje funkcję serwisową, np. `AccountService.deleteAccount(supabase, session.user.id, accountId)`.
6.  Funkcja serwisowa wykonuje zapytanie `delete` do tabeli `accounts` w Supabase.
7.  **Kluczowy element bezpieczeństwa**: Zapytanie `delete` zawiera klauzulę `WHERE` filtrującą jednocześnie po `id` konta oraz `user_id` pobranym z sesji. To gwarantuje, że użytkownik może usunąć tylko i wyłącznie własne konto.
8.  Jeśli operacja usunięcia nie wpłynęła na żaden wiersz (ponieważ `count` zwrócony przez Supabase wynosi 0), oznacza to, że konto o podanym `id` nie istnieje lub nie należy do tego użytkownika. W takim przypadku serwis rzuca błąd `NotFoundError`.
9.  Handler API łapie błąd `NotFoundError` i zwraca odpowiedź `404 Not Found`.
10. W przypadku pomyślnego usunięcia (gdy `count` wynosi 1), handler zwraca odpowiedź `204 No Content`.

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie**: Każde żądanie musi być uwierzytelnione za pomocą ważnego tokena JWT, co jest weryfikowane przez middleware.
- **Autoryzacja**: Ochrona przed nieautoryzowanym usunięciem danych jest realizowana na poziomie zapytania do bazy danych. Warunek `eq('user_id', userId)` w operacji `delete` jest krytyczny i zapewnia, że użytkownik nie może usunąć zasobów należących do kogoś innego, nawet jeśli zna ich UUID. Polityki RLS w bazie danych stanowią dodatkową, drugą linię obrony.
- **Walidacja danych wejściowych**: Parametr `id` z URL jest walidowany jako UUID, co zapobiega błędom i potencjalnym atakom (np. SQL injection, chociaż Supabase jest na to odporny).

## 7. Obsługa błędów

| Kod statusu | Scenariusz | Szczegóły |
| :--- | :--- | :--- |
| `400 Bad Request` | Błąd walidacji | Parametr `id` w URL nie jest poprawnym UUID. |
| `401 Unauthorized` | Brak uwierzytelnienia | Brak, nieważny lub wygasły token JWT. |
| `404 Not Found` | Zasób nie istnieje | Konto o podanym `id` nie istnieje lub nie należy do uwierzytelnionego użytkownika. |
| `500 Internal Server Error` | Błąd serwera | Błąd połączenia z bazą danych lub inny nieoczekiwany wyjątek. |

## 8. Rozważania dotyczące wydajności

- **Zapytania do bazy danych**: Operacja wymaga tylko jednego, bardzo wydajnego zapytania `DELETE`.
- **Indeksowanie**: Klucz główny na kolumnie `id` oraz indeks na `user_id` zapewniają błyskawiczne zlokalizowanie wiersza do usunięcia.
- **Kaskadowe usuwanie**: Operacja `ON DELETE CASCADE` jest zoptymalizowana na poziomie silnika bazy danych PostgreSQL i jest najwydajniejszym sposobem na usunięcie powiązanych danych.

## 9. Etapy wdrożenia

1.  **Aktualizacja schematu walidacji**:
    - W pliku `src/lib/validation/account.schemas.ts` dodaj schemat Zod do walidacji UUID:
      ```typescript
      export const accountIdSchema = z.string().uuid({ message: "ID konta musi być poprawnym UUID." });
      ```

2.  **Implementacja logiki serwisowej**:
    - W `src/lib/services/account.service.ts` dodaj nową funkcję asynchroniczną `deleteAccount(supabase, userId, accountId)`.
    - Wewnątrz funkcji wykonaj zapytanie:
      ```typescript
      const { error, count } = await supabase
        .from("accounts")
        .delete({ count: "exact" }) // Ważne, aby uzyskać liczbę usuniętych wierszy
        .eq("id", accountId)
        .eq("user_id", userId);
      ```
    - Sprawdź `error` - jeśli wystąpi, rzuć go dalej.
    - Sprawdź `count` - jeśli wynosi `0`, rzuć `new NotFoundError("Konto nie zostało znalezione lub nie masz do niego dostępu.")`.

3.  **Implementacja handlera `DELETE` w API**:
    - W pliku `src/pages/api/accounts/[id].ts` dodaj handler `export async function DELETE({ params, locals })`.
    - Pobierz `id` z `params` i zwaliduj go za pomocą `accountIdSchema`. W przypadku błędu zwróć `400`.
    - Pobierz `session` i `supabase` z `locals`. Jeśli brak sesji, zwróć `401`.
    - Wywołaj `AccountService.deleteAccount` w bloku `try...catch`.
    - W bloku `catch` sprawdź, czy błąd jest instancją `NotFoundError` i zwróć `404`. Dla innych błędów zwróć `500`.
    - Jeśli `try` się powiedzie, zwróć `new Response(null, { status: 204 })`.

4.  **Testowanie**:
    - **Testy jednostkowe (serwis)**:
        - Test pomyślnego usunięcia konta (oczekiwany brak błędu).
        - Test próby usunięcia nieistniejącego konta (oczekiwany `NotFoundError`).
        - Test próby usunięcia konta innego użytkownika (mock `count=0`, oczekiwany `NotFoundError`).
    - **Testy integracyjne (endpoint)**:
        - Test `204 No Content` dla poprawnego żądania usunięcia własnego konta.
        - Test `400 Bad Request` dla nieprawidłowego formatu `id`.
        - Test `401 Unauthorized` bez tokena.
        - Test `404 Not Found` dla nieistniejącego `id`.
        - Test `404 Not Found` dla `id` konta należącego do innego użytkownika.
