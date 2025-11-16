# Plan naprawy: Błędna wartość początkowa dla kont typu "pasywo"

## 1. Cel

Naprawa błędu polegającego na nieprawidłowym traktowaniu wartości początkowej dla nowo tworzonych kont typu "pasywo". Wartość ta powinna być interpretowana jako wypłata (wartość ujemna), a nie wpłata (wartość dodatnia).

## 2. Analiza problemu

Podczas tworzenia nowego konta typu "pasywo" (np. kredyt, pożyczka), jego wartość początkowa jest dodawana do sumy wpłat, co jest niezgodne z logiką finansową. Powinna być traktowana jako zobowiązanie, a więc jako wartość ujemna w kontekście wpłat/wypłat. Błąd objawia się w kluczowych wskaźnikach wydajności (KPI) oraz w modalach edycji wartości.

## 3. Plan implementacji

### Krok 1: Modyfikacja logiki na poziomie API

Zmiany zostaną wprowadzone w warstwie serwisowej, aby zapewnić spójność i bezpieczeństwo danych, niezależnie od klienta (aplikacji webowej, mobilnej, etc.).

- **Plik do modyfikacji:** `src/lib/services/account.service.ts`
- **Zadanie:** W funkcji odpowiedzialnej za tworzenie nowego konta (prawdopodobnie `createAccount` lub podobna), dodam logikę, która sprawdzi typ tworzonego konta. Jeśli typem jest `liability`, wartość `initialValue` przekazywana do stworzenia pierwszej pozycji w historii (`value_entry`) zostanie zanegowana (pomnożona przez -1).

### Krok 2: Weryfikacja zmian

Po wprowadzeniu modyfikacji, przeprowadzę weryfikację w celu upewnienia się, że poprawka działa poprawnie i nie wprowadziła nowych błędów.

- **Lintery:** Uruchomię komendę `npm run lint`, aby sprawdzić zgodność kodu ze standardami projektu.
- **Testy jednostkowe:** Uruchomię komendę `npm run test`, aby zweryfikować, czy istniejące testy przechodzą pomyślnie.
- **Testy manualne:**
    1.  Stworzę nowe konto typu "pasywo" i zweryfikuję, czy w podsumowaniu (KPI) oraz w historii transakcji, wartość początkowa jest widoczna jako wypłata (ujemna).
    2.  Stworzę nowe konto typu "aktywo" i upewnię się, że jego wartość początkowa jest nadal traktowana jako wpłata (dodatnia).

## 4. Oczekiwany rezultat

Po wdrożeniu poprawki, system będzie poprawnie obsługiwał wartości początkowe dla wszystkich typów kont, co zapewni spójność i poprawność prezentowanych danych finansowych.
