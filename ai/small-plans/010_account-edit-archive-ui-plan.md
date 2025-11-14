# Plan Implementacji UI: Edycja i Archiwizacja Kont

**Data utworzenia:** 14.11.2025
**Status:** Do implementacji
**Cel:** Implementacja interfejsu użytkownika do zarządzania istniejącymi kontami, w tym edycji nazwy, archiwizacji oraz przywracania z archiwum, w oparciu o endpoint `PATCH /api/accounts/{id}`.

---

## 1. Przegląd Funkcjonalności

Celem jest rozbudowa interfejsu o następujące możliwości:
1.  **Edycja nazwy konta**: Użytkownik może zmienić nazwę istniejącego konta.
2.  **Archiwizacja konta**: Użytkownik może zarchiwizować konto, ukrywając je z domyślnego widoku.
3.  **Przeglądanie zarchiwizowanych kont**: Użytkownik może wyświetlić listę zarchiwizowanych kont.
4.  **Przywracanie konta**: Użytkownik może przywrócić zarchiwizowane konto do stanu aktywnego.

Wszystkie operacje będą wspierane przez istniejący endpoint `PATCH /api/accounts/{id}` i będą zintegrowane z istniejącymi komponentami UI.

---

## 2. Architektura i Zmiany w Komponentach

### 2.1. `useDashboardStore.ts` (Zarządzanie Stanem)

- **Nowy stan**:
  - `showArchived: boolean`: Przechowuje stan przełącznika do pokazywania zarchiwizowanych kont (domyślnie `false`).
- **Nowe akcje**:
  - `setShowArchived(show: boolean)`: Ustawia stan `showArchived` i wywołuje `fetchData`, aby odświeżyć widok.
  - `updateAccountName(accountId: string, newName: string)`: Wywołuje `PATCH /api/accounts/{id}` ze zmianą nazwy, obsługuje błędy (w tym konflikt 409), pokazuje powiadomienie "toast" i odświeża dane.
  - `archiveAccount(accountId: string)`: Wywołuje `PATCH` z `archived_at` ustawionym na bieżącą datę, pokazuje "toast" i odświeża dane.
  - `restoreAccount(accountId: string)`: Wywołuje `PATCH` z `archived_at` ustawionym na `null`, pokazuje "toast" i odświeża dane.
- **Modyfikacja `fetchData`**:
  - Funkcja `fetchData` musi zostać zmodyfikowana, aby dołączać parametr `archived=true` do zapytania `GET /api/grid-data`, gdy `showArchived` jest `true`.

### 2.2. `DashboardToolbar.tsx` (Panel Narzędzi)

- **Dodanie przełącznika "Pokaż zarchiwizowane"**:
  - Należy dodać komponent `Switch` z biblioteki Shadcn/ui.
  - Przełącznik będzie powiązany ze stanem `showArchived` i akcją `setShowArchived` ze store'u `useDashboardStore`.

### 2.3. `DataGrid.tsx` i `useAccountActions.ts` (Akcje na Koncie)

- **Logika przycisków w menu kontekstowym konta**:
  - **Przycisk "Edytuj"**: Pozostaje bez zmian, otwiera modal `AddEditAccountModal`.
  - **Przycisk "Archiwizuj" / "Przywróć"**:
    - Dla kont aktywnych (`archived_at === null`), przycisk powinien mieć etykietę "Archiwizuj" i wywoływać `archiveAccount(accountId)`.
    - Dla kont zarchiwizowanych (`archived_at !== null`), przycisk powinien mieć etykietę "Przywróć" i wywoływać `restoreAccount(accountId)`.
  - **Wizualne rozróżnienie**: Wiersze zarchiwizowanych kont powinny być wizualnie odróżnione (np. wyszarzone, `opacity-50`).

### 2.4. `AddEditAccountModal.tsx` (Modal Edycji)

- **Tryb edycji**:
  - Modal powinien być otwierany w trybie edycji, wypełniony danymi istniejącego konta.
  - **Pole "Nazwa"**: Powinno być jedynym edytowalnym polem.
  - **Pole "Typ konta"**: Powinno być zablokowane (tylko do odczytu), aby zapobiec zmianie typu, co mogłoby naruszyć spójność historycznych danych.
  - **Pola "Wartość początkowa" i "Data"**: Powinny być ukryte lub zablokowane w trybie edycji.
- **Obsługa zapisu**:
  - Przycisk "Zapisz" powinien wywoływać akcję `updateAccountName` ze store'u.
  - Należy zaimplementować obsługę błędu konfliktu (409), wyświetlając komunikat błędu pod polem "Nazwa", np. "Ta nazwa jest już zajęta".

### 2.5. `ConfirmActionDialog.tsx` (Dialog Potwierdzenia)

- **Ponowne wykorzystanie**:
  - Komponent zostanie użyty do potwierdzenia operacji archiwizacji i przywracania.
  - Należy dynamicznie przekazywać do niego odpowiedni tytuł i treść, np. "Czy na pewno chcesz zarchiwizować konto 'mBank'?" lub "Czy na pewno chcesz przywrócić konto 'XTB'?".

---

## 3. Przepływ Danych (User Flow)

1.  **Edycja nazwy konta**:
    - Użytkownik klika "Edytuj" w menu konta.
    - Otwiera się `AddEditAccountModal` z wypełnioną nazwą.
    - Użytkownik zmienia nazwę i klika "Zapisz".
    - Wywoływana jest akcja `updateAccountName`.
    - Aplikacja wysyła żądanie `PATCH /api/accounts/{id}` z `{"name": "nowa nazwa"}`.
    - Po sukcesie wyświetlany jest toast "Nazwa konta została zmieniona", a siatka danych jest odświeżana.

2.  **Archiwizacja konta**:
    - Użytkownik klika "Archiwizuj" w menu konta.
    - Otwiera się `ConfirmActionDialog`.
    - Użytkownik potwierdza operację.
    - Wywoływana jest akcja `archiveAccount`.
    - Aplikacja wysyła `PATCH` z `{"archived_at": "..."}`.
    - Po sukcesie wyświetlany jest toast "Konto zostało zarchiwizowane", a siatka danych jest odświeżana (konto znika z widoku domyślnego).

3.  **Przywracanie konta**:
    - Użytkownik włącza przełącznik "Pokaż zarchiwizowane".
    - Siatka danych odświeża się, pokazując zarchiwizowane konta.
    - Użytkownik klika "Przywróć" w menu zarchiwizowanego konta.
    - Otwiera się `ConfirmActionDialog`.
    - Użytkownik potwierdza operację.
    - Wywoływana jest akcja `restoreAccount`.
    - Aplikacja wysyła `PATCH` z `{"archived_at": null}`.
    - Po sukcesie wyświetlany jest toast "Konto zostało przywrócone", a siatka danych jest odświeżana.

---

## 4. Checklist implementacji

-   **Stan (`useDashboardStore`)**
    -   [ ] Dodać stan `showArchived: boolean`.
    -   [ ] Dodać akcję `setShowArchived`.
    -   [ ] Zmodyfikować `fetchData`, aby uwzględniała `showArchived`.
    -   [ ] Dodać akcję `updateAccountName`.
    -   [ ] Dodać akcję `archiveAccount`.
    -   [ ] Dodać akcję `restoreAccount`.

-   **Komponenty UI**
    -   [ ] Dodać `Switch` "Pokaż zarchiwizowane" w `DashboardToolbar.tsx`.
    -   [ ] Zaimplementować logikę warunkową dla przycisku "Archiwizuj"/"Przywróć" w `useAccountActions.ts`.
    -   [ ] Dodać wizualne wyróżnienie dla zarchiwizowanych wierszy w `DataGridRow.tsx`.
    -   [ ] Dostosować `AddEditAccountModal.tsx` do trybu edycji (blokowanie pól, obsługa zapisu).
    -   [ ] Zintegrować `ConfirmActionDialog` z akcjami archiwizacji i przywracania.

-   **Feedback dla użytkownika**
    -   [ ] Dodać powiadomienia "toast" (Sonner) dla wszystkich operacji (sukces, błąd).
    -   [ ] Dodać obsługę i wyświetlanie błędu konfliktu nazwy (409) w modalu edycji.

-   **Testy**
    -   [ ] Zaktualizować istniejące testy E2E, aby uwzględniały nowe akcje.
    -   [ ] Dodać nowe testy E2E dla przepływu archiwizacji i przywracania konta.
    -   [ ] Dodać testy jednostkowe dla nowych akcji w `useDashboardStore`.
