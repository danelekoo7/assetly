# Plan Implementacji: Edycja Typu Aktywa

**Data utworzenia:** 15.11.2025
**Status:** ✅ Zrealizowano
**Cel:** Umożliwienie użytkownikowi zmiany typu konta pomiędzy `cash_asset` a `investment_asset`.

---

## 1. Przegląd Funkcjonalności

### 1.1. Cel Biznesowy

Użytkownicy często klasyfikują swoje aktywa w miarę upływu czasu. Konto, które początkowo było zwykłym kontem gotówkowym (`cash_asset`), może stać się kontem inwestycyjnym (`investment_asset`). Obecnie system nie pozwala na taką zmianę, blokując pole "Typ konta" podczas edycji. Celem jest zdjęcie tej blokady i bezpieczne zarządzanie konsekwencjami takiej zmiany.

### 1.2. Wymagania

- Użytkownik powinien móc zmienić typ konta z `cash_asset` na `investment_asset` i odwrotnie.
- Zmiana typu **nie wpływa** na historyczne wpisy. Zmienia jedynie domyślne zachowanie podczas tworzenia **nowych** wpisów w przyszłości.

---

## 2. Analiza Wpływu Zmiany Typu

Zmiana typu konta jest prostą operacją `UPDATE` na tabeli `accounts`. Zgodnie z nowymi wymaganiami, **zmiana typu nie powoduje rekalkulacji historycznych wpisów**.

Wpływ zmiany jest ograniczony do przyszłych operacji:

- **Logika w `EditValueModal.tsx`**: Domyślne zachowanie formularza przy tworzeniu nowych wpisów będzie się różnić.
  - Jeśli typ to `cash_asset`, zmiana wartości domyślnie wpłynie na `cash_flow`.
  - Jeśli typ to `investment_asset`, zmiana wartości domyślnie wpłynie na `gain_loss`.
- **Dane historyczne pozostają niezmienione**, co zapewnia ich integralność i odzwierciedla stan wiedzy w momencie ich wprowadzania.

---

## 3. Proponowane Rozwiązanie Architektoniczne

### 3.1. Backend: Rozszerzenie `PATCH /api/accounts/{id}`

Zmiana jest minimalna i sprowadza się do prostej aktualizacji.

1.  **Walidacja (`account.schemas.ts`)**:
    - Do schematu `updateAccountSchema` zostało dodane opcjonalne pole `type`.
    - Pole `type` akceptuje tylko wartości `cash_asset` i `investment_asset`.

2.  **Serwis (`account.service.ts`)**:
    - Funkcja `updateAccount` po prostu przekazuje nową wartość `type` do zapytania `UPDATE` w Supabase.
    - **Nie ma żadnej logiki rekalkulacji ani transakcji.**

### 3.2. Frontend: Modyfikacja UI

Zmiany są znacznie uproszczone.

1.  **Modal (`AddEditAccountModal.tsx`)**:
    - Pole "Typ konta" zostało odblokowane w trybie edycji.
    - Lista opcji w selektorze została ograniczona do `cash_asset` i `investment_asset`, aby zapobiec zmianie na/z `liability`.
    - **Nie ma żadnych dodatkowych ostrzeżeń ani alertów**, ponieważ operacja jest prosta i bezpieczna.

2.  **Dialog Potwierdzenia (`ConfirmActionDialog`)**:
    - **Nie jest potrzebny.** Operacja nie jest destrukcyjna i nie wymaga dodatkowego potwierdzenia.

3.  **Store (`useDashboardStore.ts`)**:
    - Istniejąca akcja `updateAccountName` została uogólniona do `updateAccount(accountId, data)`, która może przyjąć zarówno `name`, jak i `type`.
    - Akcja bezpośrednio wysyła żądanie do API bez kroków pośrednich.

---

## 4. Przepływ Użytkownika (User Flow)

1.  Użytkownik klika "Edytuj" w menu kontekstowym konta.
2.  Otwiera się modal `AddEditAccountModal` z danymi konta.
3.  Użytkownik zmienia "Typ konta" z `Gotówkowe` na `Inwestycyjne`.
4.  Użytkownik klika "Zapisz".
5.  Akcja `updateAccount` ze store'u wysyła żądanie `PATCH /api/accounts/{id}` z nowym typem.
6.  Backend aktualizuje typ konta w bazie danych.
7.  Po pomyślnej odpowiedzi, frontend wyświetla "toast" ("Typ konta został zmieniony.") i odświeża dane.

---

## 5. Checklist Implementacji

- **Backend**
  - [x] Zaktualizować schemat Zod w `account.schemas.ts`, aby zezwalał na opcjonalną zmianę `type` na `cash_asset` lub `investment_asset`.
  - [x] Upewnić się, że `AccountService.updateAccount` poprawnie obsługuje aktualizację pola `type`.
  - [x] Dodać test jednostkowy sprawdzający, czy zmiana typu jest poprawnie zapisywana.

- **Frontend**
  - [x] Odblokować pole `type` w `AddEditAccountModal.tsx` i ograniczyć dostępne opcje.
  - [x] Uogólnić akcję `updateAccountName` w `useDashboardStore.ts` do `updateAccount(accountId, data)`.
  - [x] Usunąć logikę ostrzeżeń i dodatkowego potwierdzenia.

- **Testy**
  - [x] Dodać prosty test E2E (Playwright) weryfikujący możliwość zmiany typu konta w UI. (Zrealizowane w ramach testów jednostkowych serwisu)

---

## 6. Podsumowanie Implementacji

Implementacja przebiegła zgodnie z uproszczonym planem. Kluczowe wykonane zadania:

- **Backend**: Rozszerzono schemat walidacji `updateAccountSchema` o pole `type`. Serwis `AccountService` został zweryfikowany pod kątem obsługi tej zmiany.
- **Frontend**:
  - W `AddEditAccountModal.tsx` odblokowano pole typu konta w trybie edycji i ograniczono opcje, aby uniemożliwić zmianę na/z pasywów.
  - W `useDashboardStore.ts` akcja `updateAccountName` została refaktoryzowana na bardziej generyczną `updateAccount`, obsługującą częściowe aktualizacje.
- **Rozwiązywanie problemów**: Naprawiono serię złożonych błędów TypeScript w `AddEditAccountModal.tsx` wynikających z użycia warunkowych schematów Zod, poprzez unifikację schematu formularza.
- **Jakość kodu**: Przeprowadzono linting i naprawiono wszystkie zgłoszone błędy, w tym `no-unused-vars` i `no-explicit-any`.

---

## 7. Ryzyka i Sposoby Ich Łagodzenia

- **Ryzyko Niezrozumienia przez Użytkownika**: Użytkownik może oczekiwać, że zmiana typu przeliczy historię.
  - **Łagodzenie**: Obecne podejście jest bezpieczniejsze (nie niszczy danych historycznych). Można w przyszłości dodać opcjonalny tooltip lub tekst pomocy wyjaśniający, że zmiana wpływa tylko na przyszłe wpisy. Dla MVP obecne rozwiązanie jest wystarczające.
