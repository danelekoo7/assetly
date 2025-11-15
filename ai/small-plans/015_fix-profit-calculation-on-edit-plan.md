# Plan Naprawy: Błędne Obliczanie Zysku/Straty przy Edycji Wpisu

**Data utworzenia:** 15.11.2025
**Status:** ✅ Zrealizowano
**Cel:** Naprawa błędu w logice obliczania zysku/straty (`gain_loss`) podczas aktualizacji istniejącego wpisu wartości (`value_entry`).

---

## 1. Analiza Problemu

### 1.1. Opis błędu

Zgłoszony błąd polega na nieprawidłowym obliczaniu zysku/straty (`gain_loss`) podczas edycji istniejącego wpisu w siatce danych. System błędnie przyjmuje jako wartość bazową poprzednią wartość z **tego samego edytowanego wpisu**, zamiast wartości z **chronologicznie poprzedzającego wpisu**.

**Przykład:**
1.  Wpis z `10.11`: wartość `500 zł`.
2.  Wpis z `15.11`: wartość `600 zł` (poprawny zysk: `100 zł` względem `10.11`).
3.  **Edycja wpisu** z `15.11` na `800 zł`.
    -   **Obecne (błędne) zachowanie:** Zysk jest obliczany jako `200 zł` (`800 - 600`).
    -   **Oczekiwane (poprawne) zachowanie:** Zysk powinien być obliczony jako `300 zł` (`800 - 500`), ponieważ bazą jest wpis z `10.11`.

### 1.2. Główna hipoteza

Problem najprawdopodobniej leży w sposobie pobierania `previous_value` w serwisie `ValueEntryService` podczas operacji `upsert`. Logika ta może nie rozróżniać poprawnie między tworzeniem nowego wpisu a aktualizacją istniejącego, co prowadzi do błędu w tym drugim przypadku.

Kluczowe jest, aby zapytanie o `previous_value` **zawsze** szukało ostatniego wpisu z datą **ścisle mniejszą** (`<`) niż data modyfikowanego wpisu.

### 1.3. Pliki do weryfikacji

1.  **`src/lib/services/value-entry.service.ts`**: Główna logika biznesowa w funkcji `upsertValueEntry`. Tutaj najprawdopodobniej znajduje się błąd w zapytaniu do bazy danych.
2.  **`src/components/dashboard/EditValueModal.tsx`**: Logika formularza edycji. Należy sprawdzić, czy frontend nie wykonuje własnych obliczeń i nie nadpisuje logiki backendu, wysyłając błędnie obliczone `cash_flow` lub `gain_loss`.
3.  **`src/test/services/value-entry.service.test.ts`**: Istniejące testy jednostkowe. Należy je przejrzeć i dodać nowy test, który specyficznie pokryje scenariusz edycji.

---

## 2. Proponowane Zmiany

### Krok 1: Weryfikacja i Poprawa Logiki Backendu

**Plik:** `src/lib/services/value-entry.service.ts`

W funkcji `upsertValueEntry`, należy zlokalizować fragment kodu odpowiedzialny za pobieranie poprzedniego wpisu (`previousEntry`).

**Obecny (prawdopodobny) kod:**
```typescript
const { data: previousEntry } = await supabase
  .from("value_entries")
  .select("value")
  .eq("account_id", command.account_id)
  .lt("date", command.date) // Ten warunek jest kluczowy
  .order("date", { ascending: false })
  .limit(1)
  .maybeSingle();
```

**Działania:**
1.  **Potwierdź, że warunek `.lt("date", command.date)` istnieje i jest poprawnie stosowany.** Ten warunek jest prawidłowy i powinien działać poprawnie zarówno dla nowych wpisów, jak i dla aktualizacji.
2.  **Sprawdź, czy nie ma alternatywnej logiki dla aktualizacji.** Należy upewnić się, że nie ma żadnego bloku `if/else`, który dla istniejącego wpisu (update) pobiera `previous_value` w inny, nieprawidłowy sposób.
3.  **Upewnij się, że `command.date` ma poprawny format.** Błędne formatowanie daty (np. z czasem) mogłoby zaburzyć działanie warunku `.lt()`.

Jeśli logika jest inna niż w powyższym przykładzie, należy ją skorygować, aby **zawsze** pobierała ostatni wpis z datą ściśle wcześniejszą niż data edytowanego wpisu.

### Krok 2: Weryfikacja Logiki Frontendu

**Plik:** `src/components/dashboard/EditValueModal.tsx`

Należy przeanalizować logikę `useReducer` oraz funkcję `onSubmit` w modalu edycji.

**Działania:**
1.  **Sprawdź, jakie dane są wysyłane do API.** Gdy użytkownik zmienia tylko pole `value`, formularz powinien wysyłać do API `UpsertValueEntryCommand` z `cash_flow` i `gain_loss` ustawionymi na `null` lub `undefined`. To pozwoli backendowi na ich automatyczne obliczenie.
2.  **Zweryfikuj logikę auto-obliczeń w modalu.** Modal posiada logikę, która ułatwia użytkownikowi wprowadzanie danych, automatycznie przeliczając pozostałe pola. Należy się upewnić, że jeśli użytkownik zmodyfikował **tylko** pole `value`, to do API nie są wysyłane wartości `cash_flow` i `gain_loss` przeliczone na podstawie starej wartości z modala.
3.  **Uprość wysyłane dane.** Rekomendowane jest, aby w przypadku zmiany tylko pola `value`, do API wysyłać wyłącznie `account_id`, `date` i `value`. Pozostałe pola powinny być `null`, aby backend miał pełną kontrolę nad logiką biznesową.

---

## 3. Plan Testów

### 3.1. Testy Jednostkowe (Vitest)

**Plik:** `src/test/services/value-entry.service.test.ts`

Należy dodać nowy scenariusz testowy, który precyzyjnie odtwarza zgłoszony błąd.

**Nowy test case:**
```typescript
it('should correctly calculate gain_loss when updating an existing entry', async () => {
  // Arrange:
  // 1. Mock Supabase, aby zawierał dwa wpisy:
  //    - entry1: date='2025-11-10', value=500
  //    - entry2: date='2025-11-15', value=600
  // 2. Przygotuj komendę do aktualizacji wpisu z 15.11:
  const updateCommand = {
    account_id: 'test-account-id',
    date: '2025-11-15',
    value: 800, // Nowa, wyższa wartość
    cash_flow: null, // Pozwól backendowi obliczyć
    gain_loss: null, // Pozwól backendowi obliczyć
  };

  // Act:
  // Wywołaj `upsertValueEntry` z komendą aktualizacji.
  const result = await ValueEntryService.upsertValueEntry(mockSupabase, 'user-id', updateCommand);

  // Assert:
  // 1. Sprawdź, czy `previous_value` zostało poprawnie pobrane jako 500 (z wpisu z 10.11).
  // 2. Sprawdź, czy `gain_loss` zostało obliczone jako 300 (800 - 500).
  //    (Zakładając konto inwestycyjne, gdzie cash_flow = 0).
  expect(result.gain_loss).toBe(300);
});
```

### 3.2. Testy Manualne (E2E)

Po wdrożeniu poprawki, należy przeprowadzić manualny test w aplikacji, aby zweryfikować poprawne działanie.

**Scenariusz testowy:**
1.  Zaloguj się do aplikacji.
2.  Utwórz konto (np. typu "inwestycyjne").
3.  Dodaj kolumnę z datą `10.11.2025` i w komórce dla nowego konta wpisz wartość `500`. Zapisz.
4.  Dodaj kolumnę z datą `15.11.2025` i w komórce wpisz wartość `600`. Zapisz.
5.  Otwórz ponownie do edycji komórkę z `15.11.2025` (tę z wartością `600`).
6.  Zmień wartość na `800` i zapisz.
7.  **Weryfikacja:** Otwórz ponownie modal edycji dla tej komórki i sprawdź, czy obliczony `gain_loss` (zysk/strata) wynosi `300 zł`.

---

## 4. Checklist Implementacji

-   [x] **Analiza Backendu**: Dokładnie przeanalizować funkcję `upsertValueEntry` w `src/lib/services/value-entry.service.ts` i zidentyfikować logikę pobierania `previous_value`.
-   [x] **Poprawka Backendu**: Nie była wymagana. Analiza potwierdziła, że logika po stronie serwera jest poprawna.
-   [x] **Analiza Frontendu**: Sprawdzić logikę `useReducer` i `onSubmit` w `src/components/dashboard/EditValueModal.tsx` pod kątem wysyłanych danych.
-   [x] **Poprawka Frontendu**: Zmodyfikować logikę wysyłania formularza, aby nie przesyłać ręcznie obliczonych wartości, jeśli nie zostały one jawnie zmienione przez użytkownika.
-   [x] **Testy Jednostkowe**: Dodać nowy test case do `src/test/services/value-entry.service.test.ts` pokrywający scenariusz aktualizacji.
-   [x] **Testy Manualne**: Wykonano scenariusz testowy E2E w celu ostatecznej weryfikacji poprawki.
-   [ ] **Code Review**: Przekazać zmiany do przeglądu.

---

## 5. Podsumowanie Wprowadzonych Zmian

Błąd został rozwiązany dwuetapowo, zgodnie z informacją zwrotną od użytkownika.

### 5.1. Poprawka Logiki Zapisu Danych (Etap 1)

- **Problem:** Frontend (`EditValueModal.tsx`) wysyłał do API wszystkie trzy wartości (`value`, `cash_flow`, `gain_loss`), nawet jeśli użytkownik zmienił tylko `value`. Powodowało to, że backend jedynie walidował te dane, zamiast je przeliczyć od nowa na podstawie poprawnej wartości bazowej.
- **Rozwiązanie:** Zmodyfikowano funkcję `onSubmit` w `EditValueModal.tsx`. Teraz do API wysyłane są tylko te pola (`cash_flow`, `gain_loss`), które użytkownik faktycznie zmodyfikował. Jeśli zmieniono tylko `value`, pozostałe pola są wysyłane jako `null`, co zmusza backend do ich poprawnego przeliczenia.

### 5.2. Poprawka Wyświetlania Danych w Modalu (Etap 2)

- **Problem:** Po pierwszej poprawce dane zapisywały się poprawnie, ale modal edycji nadal wyświetlał błędne informacje. "Poprzednia wartość" była brana z edytowanej komórki, a nie z chronologicznie wcześniejszego wpisu.
- **Rozwiązanie:** Zmieniono logikę przekazywania `previousValue` do modala.
    1.  W `DataGrid.tsx` zmodyfikowano `handleCellClick`, aby samodzielnie obliczała poprawną `previousValue` na podstawie `gridData` (znajdując poprzednią datę w tablicy `dates`).
    2.  Zaktualizowano sygnatury funkcji `onCellClick` w dół hierarchii komponentów (`DataGridRow.tsx` i `DataGridCell.tsx`), usuwając z nich odpowiedzialność za przekazywanie `previousValue`.

### 5.3. Weryfikacja

- **Testy Jednostkowe:** Dodano nowy test do `value-entry.service.test.ts`, który potwierdził, że logika backendu od początku była poprawna. Wszystkie 17 testów przechodzi pomyślnie.
- **Wynik:** Obie poprawki kompleksowo rozwiązują problem, zapewniając spójność między danymi wyświetlanymi w interfejsie a tymi zapisywanymi w bazie danych.
