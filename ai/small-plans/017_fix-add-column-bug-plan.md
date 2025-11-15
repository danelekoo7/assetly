# Plan naprawy błędu dodawania kolumny

## 1. Problem

Podczas dodawania nowej kolumny w widoku deski rozdzielczej, aplikacja wysyła żądanie POST do punktu końcowego `/api/value-entries`, które kończy się błędem `400 Bad Request`.

## 2. Analiza

Błąd jest spowodowany niezgodnością danych wysyłanych z frontendu (`useDashboardStore.ts`) z oczekiwaniami logiki biznesowej po stronie serwera (`ValueEntryService`).

- **Frontend (`useDashboardStore.ts`)**: Funkcja `addColumn` tworzy nowe wpisy (`UpsertValueEntryCommand`) z wartościami `cash_flow` i `gain_loss` ustawionymi na `0`.
- **Backend (`ValueEntryService`)**: Serwis oczekuje, że pola `cash_flow` i `gain_loss` będą `null` lub nie zostaną zdefiniowane, jeśli mają być obliczone automatycznie. Przesłanie wartości `0` jest traktowane jako jawne ustawienie, co prowadzi do błędu walidacji logiki biznesowej.

## 3. Rozwiązanie

Zmodyfikuję funkcję `addColumn` w pliku `src/lib/stores/useDashboardStore.ts`, aby podczas tworzenia nowych wpisów wartości, pola `cash_flow` i `gain_loss` były inicjalizowane jako `null` zamiast `0`.

## 4. Kroki implementacji

1.  **Modyfikacja pliku `src/lib/stores/useDashboardStore.ts`**:
    -   Zlokalizuj funkcję `addColumn`.
    -   Zmień inicjalizację zmiennych `cash_flow` i `gain_loss` z `0` na `null`.
2.  **Weryfikacja**:
    -   Uruchomienie linterów w celu zapewnienia zgodności ze standardami kodowania.

## 5. Oczekiwany rezultat

Po wprowadzeniu zmiany, dodawanie nowej kolumny powinno działać poprawnie, a żądania do API powinny kończyć się sukcesem (status `200 OK`).
