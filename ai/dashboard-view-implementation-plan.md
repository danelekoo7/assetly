# Plan implementacji widoku Zintegrowany Pulpit

## 1. Przegląd

Zintegrowany Pulpit to główny widok aplikacji po zalogowaniu, pełniący rolę centrum dowodzenia finansami użytkownika. Łączy on w jednym miejscu kluczowe wskaźniki wydajności (KPI), wykres historyczny wartości netto oraz interaktywną siatkę danych w stylu arkusza kalkulacyjnego. Widok ten umożliwia użytkownikom przeglądanie, dodawanie i zarządzanie swoimi kontami finansowymi i ich wartościami w czasie.

## 2. Routing widoku

- **Ścieżka:** `/`
- **Dostępność:** Widok dostępny tylko dla uwierzytelnionych użytkowników. Użytkownicy niezalogowani próbujący uzyskać dostęp do tej ścieżki powinni zostać przekierowani do widoku logowania (`/login`).

## 3. Struktura komponentów

Widok będzie zaimplementowany jako strona Astro (`src/pages/index.astro`), która renderuje główny komponent React (`IntegratedDashboardPage.tsx`) z opcją `client:load`.

```
- IntegratedDashboardPage (React, client-side)
  - DashboardToolbar
    - DateRangePicker
    - AddAccountButton -> (otwiera AddEditAccountModal)
    - AddDateColumnButton -> (otwiera Popover z Calendar)
    - ShowArchivedSwitch
  - KpiSection
    - Card (Wartość netto)
    - Card (Aktywa)
    - Card (Pasywa)
    - Card (Skumulowane wpłaty)
    - Card (Skumulowane zyski)
  - NetWorthChart
    - ToggleGroup (do przełączania serii danych)
    - Recharts (Wykres liniowy)
  - DataGrid
    - DataGridHeader (lepki)
    - DataGridRow[]
      - DataGridCell (Nazwa konta, lepka)
        - DropdownMenu (Akcje: Edytuj, Archiwizuj, Usuń)
      - DataGridCell (Wartość) -> (otwiera EditValueModal)
    - DataGridSummaryRow (lepki)
  - AddEditAccountModal (Dialog)
  - EditValueModal (Dialog)
  - ConfirmActionDialog (AlertDialog)
```

## 4. Szczegóły komponentów

### `IntegratedDashboardPage`

- **Opis:** Główny kontener widoku. Inicjuje ładowanie danych, zarządza stanami ładowania/błędu na poziomie całej strony i renderuje podkomponenty.
- **Główne elementy:** `DashboardToolbar`, `KpiSection`, `NetWorthChart`, `DataGrid`.
- **Obsługiwane interakcje:** Inicjalne pobranie danych.
- **Typy:** `GridDataDto`, `DashboardSummaryDto`.
- **Propsy:** Brak.

### `DashboardToolbar`

- **Opis:** Pasek narzędzi umieszczony nad siatką danych, zawierający globalne akcje dla widoku.
- **Główne elementy:** `DateRangePicker`, `Button` ("+ Dodaj konto", "+ Dodaj kolumnę"), `Switch` ("Pokaż zarchiwizowane").
- **Obsługiwane interakcje:** Wybór zakresu dat, otwieranie modala dodawania konta, otwieranie popovera z kalendarzem do dodania nowej kolumny, przełączanie widoczności zarchiwizowanych kont.
- **Typy:** Brak.
- **Propsy:** Brak (interakcje odbywają się poprzez hook zarządzania stanem).

### `KpiSection`

- **Opis:** Wyświetla kluczowe wskaźniki wydajności (KPI). Pokazuje komponenty `Skeleton` podczas ładowania danych.
- **Główne elementy:** Komponenty `Card` z `shadcn/ui` do wyświetlania każdej metryki.
- **Typy:** `DashboardSummaryDto`.
- **Propsy:** `summaryData: DashboardSummaryDto | null`, `isLoading: boolean`.

### `NetWorthChart`

- **Opis:** Renderuje wykres liniowy historii wartości netto przy użyciu `Recharts`.
- **Główne elementy:** `LineChart`, `XAxis`, `YAxis`, `Tooltip`, `Line`, `ToggleGroup`.
- **Obsługiwane interakcje:** Przełączanie widoczności serii danych (np. wartość netto, skumulowane wpłaty) za pomocą `ToggleGroup`.
- **Typy:** `GridDataDto['summary']`.
- **Propsy:** `chartData: { date: string, net_worth: number }[]`, `isLoading: boolean`.

### `DataGrid`

- **Opis:** Niestandardowy komponent siatki zbudowany z `div` z rolami ARIA (`grid`, `row`, `gridcell`). Pierwsza kolumna (nazwy kont) i wiersz podsumowania są "lepkie" (sticky).
- **Główne elementy:** `div`y, `DropdownMenu` dla akcji na koncie.
- **Obsługiwane interakcje:** Kliknięcie komórki wartości otwiera `EditValueModal`. Kliknięcie menu akcji otwiera `DropdownMenu`.
- **Typy:** `GridDataDto`.
- **Propsy:** `gridData: GridDataDto | null`, `isLoading: boolean`.

### `AddEditAccountModal`

- **Opis:** Modal (`Dialog`) do tworzenia nowego konta lub edycji nazwy istniejącego.
- **Główne elementy:** `Dialog`, formularz oparty na `react-hook-form`, `Input` (nazwa, wartość początkowa), `Select` (typ konta).
- **Obsługiwane interakcje:** Wprowadzanie danych, zapis formularza.
- **Obsługiwana walidacja:**
  - `name`: wymagane, minimum 3 znaki. Unikalność sprawdzana po stronie serwera (obsługa błędu 409).
  - `type`: wymagane.
  - `initial_value`: wymagane przy tworzeniu, tylko liczby.
- **Typy:** `CreateAccountCommand`, `UpdateAccountCommand`.
- **Propsy:** `isOpen: boolean`, `onOpenChange: (open: boolean) => void`, `accountToEdit?: AccountDto`.

### `EditValueModal`

- **Opis:** Modal do edycji wartości konta w danym dniu, zawierający logikę automatycznego obliczania pól.
- **Główne elementy:** `Dialog`, formularz, 3 pola `Input` (Nowa wartość, Wpłata/Wypłata, Zysk/Strata).
- **Obsługiwane interakcje:** Wprowadzanie wartości i automatyczne przeliczanie pozostałych pól. Zapis zmian.
- **Obsługiwana walidacja:**
  - `value`: wymagane, tylko liczby.
  - Spójność danych: jeśli wszystkie 3 pola są wypełnione ręcznie, walidowana jest reguła: `poprzednia_wartość + wpłata + zysk = nowa_wartość`.
- **Typy:** `UpsertValueEntryCommand`, `AccountType`.
- **Propsy:** `isOpen: boolean`, `onOpenChange: (open: boolean) => void`, `context: { accountId: string, date: string, accountType: AccountType, previousValue: number }`.

### `ConfirmActionDialog`

- **Opis:** `AlertDialog` do uzyskania od użytkownika potwierdzenia wykonania akcji destrukcyjnej (usunięcie, archiwizacja).
- **Główne elementy:** `AlertDialog`, `AlertDialogAction` z wariantem `destructive`.
- **Obsługiwane interakcje:** Potwierdzenie lub anulowanie akcji.
- **Typy:** Brak.
- **Propsy:** `isOpen: boolean`, `onOpenChange: (open: boolean) => void`, `onConfirm: () => void`, `title: string`, `description: string`.

## 5. Typy

Implementacja będzie korzystać z istniejących typów DTO z pliku `src/types.ts`. Kluczowe typy to:

- **`GridDataDto`**: Główny obiekt danych dla siatki i wykresu.

```typescript
interface GridDataDto {
  dates: string[];
  accounts: GridAccountDto[];
  summary: Record<string, GridSummaryDto>;
}
```

- **`DashboardSummaryDto`**: Główny obiekt danych dla sekcji KPI.

```typescript
interface DashboardSummaryDto {
  net_worth: number;
  total_assets: number;
  total_liabilities: number;
  cumulative_cash_flow: number;
  cumulative_gain_loss: number;
}
```

- **`CreateAccountCommand`**: Typ danych wysyłanych do `POST /accounts`.
- **`UpsertValueEntryCommand`**: Typ danych wysyłanych do `POST /value-entries`.

Nie przewiduje się potrzeby tworzenia nowych, złożonych typów ViewModel. Propsy komponentów będą bezpośrednio korzystać z powyższych DTO lub ich fragmentów.

## 6. Zarządzanie stanem

Stan globalny widoku będzie zarządzany przy użyciu biblioteki **Zustand**. Zostanie utworzony dedykowany hook `useDashboardStore`.

- **`useDashboardStore`**:
  - **State**:
    - `gridData: GridDataDto | null`
    - `summaryData: DashboardSummaryDto | null`
    - `dateRange: { from: Date, to: Date }`
    - `showArchived: boolean`
    - `isLoading: boolean`
    - `error: Error | null`
    - `activeModals: { addAccount: boolean, editValue: any | null, ... }`
  - **Actions**:
    - `fetchData()`: Asynchroniczna akcja pobierająca dane z `/api/grid-data` i `/api/dashboard/summary`. Zarządza stanami `isLoading` i `error`.
    - `setDateRange(range)`: Aktualizuje zakres dat i wywołuje `fetchData`.
    - `addAccount(command)`: Wywołuje `POST /api/accounts`, a po sukcesie optymistycznie aktualizuje stan `gridData`.
    - `updateValueEntry(command)`: Wywołuje `POST /api/value-entries`, a po sukcesie optymistycznie aktualizuje komórkę w `gridData`. W przypadku błędu cofa zmianę i wyświetla powiadomienie.
    - `openModal(modalName, context)` / `closeModal(modalName)`: Akcje do zarządzania widocznością modali.

## 7. Integracja API

Komponenty będą komunikować się z API poprzez akcje zdefiniowane w hooku `useDashboardStore`.

- **Pobieranie danych:**
  - `GET /api/grid-data`: Pobiera dane dla siatki i wykresu. Wywoływane przy inicjalizacji i zmianie zakresu dat.
  - `GET /api/dashboard/summary`: Pobiera dane dla KPI. Wywoływane przy inicjalizacji i po każdej modyfikacji danych.
- **Modyfikacja danych:**
  - `POST /api/accounts`: Tworzenie nowego konta z `AddEditAccountModal`.
    - **Request:** `CreateAccountCommand`
    - **Response:** `AccountDto`
  - `POST /api/value-entries`: Aktualizacja/wstawienie wartości komórki z `EditValueModal`.
    - **Request:** `UpsertValueEntryCommand`
    - **Response:** `ValueEntryDto`
  - `PATCH /api/accounts/{id}`: Archiwizacja/zmiana nazwy konta.
    - **Request:** `UpdateAccountCommand`
    - **Response:** `AccountDto`
  - `DELETE /api/accounts/{id}`: Usunięcie konta.
    - **Request:** Brak
    - **Response:** `204 No Content`

## 8. Interakcje użytkownika

- **Edycja komórki:** Kliknięcie komórki w `DataGrid` -> Otwarcie `EditValueModal` z kontekstem komórki.
- **Zapis edycji:** Wypełnienie formularza w `EditValueModal` i kliknięcie "Zapisz" -> Wywołanie akcji `updateValueEntry` -> Optymistyczna aktualizacja UI -> Wywołanie API -> Zamknięcie modala.
- **Dodawanie konta:** Kliknięcie "+ Dodaj konto" -> Otwarcie `AddEditAccountModal` -> Wypełnienie i zapis formularza -> Wywołanie akcji `addAccount` -> Optymistyczna aktualizacja UI -> Zamknięcie modala.
- **Usuwanie konta:** Kliknięcie "Usuń" w `DropdownMenu` konta -> Otwarcie `ConfirmActionDialog` -> Kliknięcie "Potwierdź" -> Wywołanie `DELETE /api/accounts/{id}` -> Usunięcie wiersza z `DataGrid`.
- **Zmiana zakresu dat:** Wybranie nowego zakresu w `DateRangePicker` -> Wywołanie `fetchData` -> Zaktualizowanie `DataGrid` i `NetWorthChart`.

## 9. Warunki i walidacja

- **Formularz dodawania konta (`AddEditAccountModal`):**
  - Nazwa konta jest wymagana (min. 3 znaki). Walidacja za pomocą Zod w `react-hook-form`.
  - Komunikat o błędzie "Nazwa musi mieć co najmniej 3 znaki." jest wyświetlany pod polem.
  - Unikalność nazwy jest walidowana przez API. Błąd `409 Conflict` jest przechwytywany i wyświetlany jako błąd formularza: "Konto o tej nazwie już istnieje.".
- **Formularz edycji wartości (`EditValueModal`):**
  - Pole "Nowa wartość" jest wymagane.
  - Jeśli użytkownik ręcznie wypełni wszystkie trzy pola, sprawdzana jest spójność (`nowa_wartość === poprzednia_wartość + wpłata + zysk`). W przypadku niespójności wyświetlany jest błąd na poziomie formularza.

## 10. Obsługa błędów

- **Błędy sieci/serwera (5xx):** Podczas pobierania danych, globalny stan błędu w `useDashboardStore` jest ustawiany. `IntegratedDashboardPage` wyświetla komunikat na całą stronę (np. "Nie udało się załadować danych. Spróbuj odświeżyć stronę."). Przy operacjach zapisu wyświetlany jest globalny toast (np. `Sonner`) z komunikatem "Błąd serwera. Spróbuj ponownie później.".
- **Błędy walidacji (400):** Błędy są wyświetlane jako komunikaty inline pod odpowiednimi polami formularza, który był wysyłany.
- **Błędy konfliktu (409):** Błąd jest mapowany na konkretne pole formularza (np. nazwę konta) i wyświetlany jako komunikat inline.
- **Błąd optymistycznej aktualizacji:** Jeśli aktualizacja UI się powiedzie, ale żądanie API zwróci błąd, stan w `useDashboardStore` jest przywracany do poprzedniej wartości, a użytkownik jest informowany o niepowodzeniu za pomocą toastu.

## 11. Kroki implementacji

1.  **Stworzenie struktury plików:** Utwórz plik strony `src/pages/index.astro` oraz folder `src/components/dashboard/` na wszystkie komponenty React.
2.  **Zarządzanie stanem:** Zaimplementuj `useDashboardStore` w Zustand ze wszystkimi wymaganymi stanami i akcjami (na razie mogą być to puste funkcje).
3.  **Layout główny:** W `IntegratedDashboardPage` zaimplementuj podstawowy layout, stany ładowania (`Skeleton`) i obsługę błędów na podstawie `isLoading` i `error` z `useDashboardStore`.
4.  **Integracja API:** Zaimplementuj logikę pobierania danych w akcji `fetchData()` w store. Podłącz ją do `IntegratedDashboardPage`, aby dane były ładowane przy montowaniu komponentu.
5.  **Implementacja komponentów wyświetlających:**
    - Stwórz komponenty `KpiSection` i `NetWorthChart`, przekazując im dane z `useDashboardStore`.
    - Stwórz komponent `DataGrid` z podstawową strukturą, wyświetlający dane. Zaimplementuj "lepkość" kolumny i wiersza podsumowania za pomocą CSS.
6.  **Implementacja modali:**
    - Stwórz komponent `AddEditAccountModal` z formularzem i walidacją Zod. Podłącz jego akcję zapisu do `useDashboardStore`.
    - Stwórz komponent `EditValueModal`, implementując logikę dynamicznego przeliczania pól. Najlepiej użyć `useReducer` wewnątrz tego komponentu do zarządzania jego złożonym stanem.
    - Stwórz generyczny komponent `ConfirmActionDialog`.
7.  **Implementacja paska narzędzi:** Stwórz `DashboardToolbar` i podłącz jego kontrolki do odpowiednich akcji w `useDashboardStore` (`setDateRange`, `setShowArchived`, otwieranie modali).
8.  **Połączenie interakcji:** Zintegruj otwieranie modali z komponentu `DataGrid` (kliknięcie komórki) i `DashboardToolbar` (przycisk dodawania).
9.  **Dopracowanie i testy:** Przetestuj wszystkie przepływy użytkownika, obsługę błędów, stany puste oraz responsywność na różnych urządzeniach. Upewnij się, że optymistyczne aktualizacje działają poprawnie i poprawnie się wycofują w razie błędu.
