# Status implementacji widoku Zintegrowany Pulpit

## Zrealizowane kroki

### 1. Struktura plików i zależności ✅
- Utworzono folder `src/components/dashboard/` dla komponentów React dashboardu
- Utworzono folder `src/lib/stores/` dla zarządzania stanem
- Zainstalowano wymagane zależności:
  - `zustand` - zarządzanie stanem globalnym
  - `recharts` - biblioteka do wykresów
  - `lucide-react` - ikony
- Zainstalowano komponenty Shadcn UI:
  - `skeleton` - stany ładowania
  - `alert` - komunikaty błędów
  - `card` - karty KPI i wykresu
  - `toggle-group` - przełączanie serii na wykresie

### 2. Zarządzanie stanem (useDashboardStore) ✅
**Plik:** `src/lib/stores/useDashboardStore.ts`

Zaimplementowano pełny store Zustand z:

**Stan aplikacji:**
- `gridData: GridDataDto | null` - dane siatki
- `summaryData: DashboardSummaryDto | null` - dane KPI
- `dateRange: { from: Date; to: Date }` - zakres dat (domyślnie ostatnie 12 miesięcy)
- `showArchived: boolean` - filtr zarchiwizowanych kont
- `isLoading: boolean` - stan ładowania
- `error: Error | null` - stan błędu
- `activeModals` - zarządzanie widocznością modali

**Zaimplementowane akcje:**
- `fetchData()` - pobieranie danych z API (`/api/grid-data` i `/api/dashboard/summary`)
- `setDateRange()` - zmiana zakresu dat i automatyczne odświeżenie danych
- `setShowArchived()` - przełączanie widoczności zarchiwizowanych kont
- `addAccount()` - tworzenie nowego konta (POST `/api/accounts`)
- `updateAccount()` - aktualizacja konta (PATCH `/api/accounts/{id}`)
- `deleteAccount()` - usuwanie konta (DELETE `/api/accounts/{id}`)
- `updateValueEntry()` - aktualizacja wartości z optymistyczną aktualizacją UI i mechanizmem rollback
- `openModal()` / `closeModal()` - zarządzanie stanami modali

### 3. IntegratedDashboardPage - Layout główny ✅
**Plik:** `src/components/dashboard/IntegratedDashboardPage.tsx`

Zaimplementowano:
- Połączenie z `useDashboardStore` i automatyczne pobieranie danych przy montowaniu (`useEffect`)
- Pełną obsługę błędów z wyświetlaniem `Alert` i przyciskiem odświeżenia strony
- Podstawowy layout z sekcjami:
  - Header z tytułem i opisem
  - Toolbar (obecnie placeholder ze `Skeleton`)
  - Sekcja KPI
  - Sekcja wykresu
  - Sekcja siatki danych (obecnie placeholder ze `Skeleton`)
- Aktualizacja `src/pages/index.astro` aby renderował `IntegratedDashboardPage` z dyrektywą `client:load`

### 4. KpiSection - Komponenty KPI ✅
**Plik:** `src/components/dashboard/KpiSection.tsx`

Zaimplementowano:
- Komponent wyświetlający 5 kart KPI:
  1. **Wartość netto** - ikona `Wallet`
  2. **Aktywa** - ikona `TrendingUp` (zielony)
  3. **Pasywa** - ikona `TrendingDown` (czerwony)
  4. **Skumulowane wpłaty** - ikona `ArrowUpCircle`
  5. **Skumulowane zyski** - ikona `ArrowDownCircle`
- Formatowanie wartości jako waluta PLN
- Kolorowanie wartości (zielony dla dodatnich, czerwony dla ujemnych)
- Responsywny grid layout (2 kolumny na md, 5 kolumn na lg)
- Obsługa stanów ładowania z `Skeleton`
- Obsługa braku danych (null state)

### 5. NetWorthChart - Wykres wartości netto ✅
**Plik:** `src/components/dashboard/NetWorthChart.tsx`

Zaimplementowano:
- Wykres liniowy z użyciem biblioteki Recharts
- Trzy serie danych z możliwością przełączania widoczności:
  1. **Wartość netto** - główna seria (kolor primary)
  2. **Skumulowane wpłaty** - seria cash flow (kolor zielony)
  3. **Skumulowane zyski** - seria gain/loss (kolor czerwony)
- `ToggleGroup` do przełączania widoczności serii (multiple selection)
- Formatowanie:
  - Oś X: daty w formacie "Sty 2024"
  - Oś Y: wartości jako waluta PLN
  - Tooltip: formatowane wartości i daty
- Responsywny kontener (`ResponsiveContainer`)
- Obsługa stanów ładowania z `Skeleton`
- Obsługa braku danych z komunikatem
- Obliczanie skumulowanych wartości z danych kont

### 6. Integracja komponentów ✅
- Komponenty `KpiSection` i `NetWorthChart` zintegrowane w `IntegratedDashboardPage`
- Dodano importy i podłączono dane ze store
- Wszystkie komponenty wyświetlające działają poprawnie

### 7. DashboardToolbar ✅
**Plik:** `src/components/dashboard/DashboardToolbar.tsx`

Zaimplementowano:
- **DateRangePicker** z użyciem `Calendar` w trybie `range` i `Popover`
- **Przycisk "+ Dodaj konto"** otwierający modal `addAccount`
- **Przycisk "+ Dodaj kolumnę"** z popoverem i kalendarzem (przygotowany do przyszłej implementacji)
- **Switch "Pokaż zarchiwizowane"** podłączony do `setShowArchived()`
- Formatowanie dat z biblioteką `date-fns` (lokalizacja polska)
- Pełna integracja z `useDashboardStore`

Dodatkowe zależności:
- Zainstalowano `date-fns` dla formatowania dat
- Zainstalowano komponenty UI: `calendar`, `popover`, `switch`

### 8. DataGrid - Siatka danych ✅
**Plik:** `src/components/dashboard/DataGrid.tsx`

Zaimplementowano:
- Niestandardowa siatka z `div` i rolami ARIA (`grid`, `row`, `gridcell`)
- **Sticky positioning:**
  - Pierwsza kolumna (nazwy kont) - sticky left
  - Wiersz nagłówka - sticky top
  - Wiersz podsumowania - sticky bottom
- **Renderowanie danych:**
  - Nagłówek z datami z `gridData.dates`
  - Wiersze kont z `gridData.accounts`
  - Komórki wartości z `account.entries[date]`
  - Wiersz podsumowania z `gridData.summary`
- **Interakcje:**
  - Kliknięcie komórki wartości → otwarcie `EditValueModal` (przez `openModal`)
  - `DropdownMenu` przy nazwie konta z akcjami: Edytuj, Archiwizuj, Usuń
  - Dostępność klawiatury (Tab, Enter, Space)
- **Stylowanie:**
  - Hover effects na wierszach i komórkach
  - Kolorowanie wartości (czerwony dla ujemnych)
  - Responsywny layout z overflow-x-auto
- Obsługa stanów ładowania i braku danych

Dodatkowe komponenty UI:
- Zainstalowano `dropdown-menu` i `label`

### 9. Mockowanie danych ✅
**Plik:** `src/lib/stores/useDashboardStore.ts`

Dodano mockowane dane w `fetchData()`:
- 3 przykładowe konta (2 aktywa, 1 pasywo)
- 6 miesięcy danych historycznych (styczeń-czerwiec 2024)
- Wartości wpisów z `cash_flow` i `gain_loss`
- Podsumowania wartości netto dla każdej daty
- Dane KPI dla sekcji podsumowania
- Symulacja opóźnienia sieciowego (500ms)
- **TODO:** Zakomentowany kod z rzeczywistymi wywołaniami API do przywrócenia później

### 10. AddEditAccountModal ✅
**Plik:** `src/components/dashboard/AddEditAccountModal.tsx`

Zaimplementowano:
- Modal z użyciem `Dialog` i `react-hook-form`
- Walidacja z biblioteką `zod`:
  - Nazwa: minimum 3 znaki
  - Typ konta: asset/liability (required)
  - Wartość początkowa: wymagana przy tworzeniu
  - Data: wymagana przy tworzeniu
- **Dwa tryby działania:**
  - Tryb tworzenia: wszystkie pola (nazwa, typ, wartość, data)
  - Tryb edycji: tylko nazwa konta
- Obsługa błędów:
  - Błąd 409 Conflict → "Konto o tej nazwie już istnieje"
  - Inline error messages pod polami
  - Root error message dla błędów globalnych
- Podłączenie do `addAccount()` w store
- Stan ładowania podczas zapisywania
- Automatyczne reset formularza przy zamykaniu

### 11. EditValueModal ✅
**Plik:** `src/components/dashboard/EditValueModal.tsx`

Zaimplementowano:
- Modal z trzema polami: wartość, wpłata/wypłata, zysk/strata
- **Automatyczne przeliczanie wartości** z użyciem `useReducer`:
  - Formuła: `nowa_wartość = poprzednia_wartość + wpłata + zysk`
  - Przy zmianie jednego pola automatycznie przeliczane są pozostałe
  - Śledzenie ostatnio zmodyfikowanego pola
- **Wyświetlanie kontekstu:**
  - Nazwa konta
  - Data (sformatowana z `date-fns`)
  - Poprzednia wartość
- Prefilling danych z istniejącego wpisu (jeśli istnieje)
- Walidacja formularza z `zod`
- Podłączenie do `updateValueEntry()` w store
- Obsługa błędów z rollback w store

### 12. ConfirmActionDialog ✅
**Plik:** `src/components/dashboard/ConfirmActionDialog.tsx`

Zaimplementowano:
- Generyczny `AlertDialog` do potwierdzania akcji destrukcyjnych
- Props przekazywane przez store:
  - `title` - tytuł dialogu
  - `description` - opis akcji
  - `onConfirm` - callback do wykonania po potwierdzeniu
- Przycisk potwierdzenia z wariantem `destructive`
- Podłączenie do `activeModals.confirmAction` w store

### 13. Integracja finalna ✅
**Plik:** `src/components/dashboard/IntegratedDashboardPage.tsx`

- Zintegrowano wszystkie trzy modale:
  - `AddEditAccountModal`
  - `EditValueModal`
  - `ConfirmActionDialog`
- Wszystkie komponenty działają z mockowanymi danymi
- Build projektu zakończony sukcesem

### 14. Dodatkowe komponenty UI ✅
- Ręcznie utworzono `form.tsx` (react-hook-form integration)
- Ręcznie utworzono `alert-dialog.tsx` (confirmation dialogs)
- Naprawiono import typu `FieldValues` w form.tsx

## Kolejne kroki

### 15. Implementacja endpointów API (Backend)
- [ ] Zaktualizować import w `IntegratedDashboardPage.tsx`:
  ```tsx
  import KpiSection from "./KpiSection";
  import NetWorthChart from "./NetWorthChart";
  ```
- [ ] Podłączyć dane ze store do komponentów:
  ```tsx
  const { isLoading, error, gridData, summaryData, fetchData } = useDashboardStore();
  ```
- [ ] Zastąpić placeholder w sekcji KPI:
  ```tsx
  <KpiSection summaryData={summaryData} isLoading={isLoading} />
  ```
- [ ] Zastąpić placeholder w sekcji Chart:
  ```tsx
  <NetWorthChart gridData={gridData} isLoading={isLoading} />
  ```

### 8. Implementacja DashboardToolbar (Krok 7 z planu)
**Plik:** `src/components/dashboard/DashboardToolbar.tsx`

- [ ] Zainstalować komponenty UI:
  - `date-range-picker` lub `calendar` + `popover` dla wyboru zakresu dat
  - `switch` dla "Pokaż zarchiwizowane"
- [ ] Zaimplementować komponent z:
  - DateRangePicker podłączony do `setDateRange()`
  - Przycisk "+ Dodaj konto" otwierający modal
  - Przycisk "+ Dodaj kolumnę" z popoverem i kalendarzem
  - Switch "Pokaż zarchiwizowane" podłączony do `setShowArchived()`
- [ ] Podłączyć do store przez `useDashboardStore`
- [ ] Zastąpić placeholder w `IntegratedDashboardPage`

### 9. Implementacja DataGrid (Krok 5 z planu)
**Plik:** `src/components/dashboard/DataGrid.tsx`

- [ ] Zaimplementować niestandardową siatkę z `div` i rolami ARIA
- [ ] Dodać sticky positioning dla:
  - Pierwszej kolumny (nazwy kont)
  - Wiersza nagłówka
  - Wiersza podsumowania (na dole)
- [ ] Zaimplementować renderowanie:
  - Nagłówka z datami z `gridData.dates`
  - Wierszy kont z `gridData.accounts`
  - Komórek wartości z `account.entries[date]`
  - Wiersza podsumowania z `gridData.summary`
- [ ] Dodać interakcje:
  - Kliknięcie komórki wartości → otwarcie `EditValueModal`
  - Menu akcji przy nazwie konta (Edit, Archive, Delete)
- [ ] Zainstalować i zintegrować `dropdown-menu` dla akcji

### 10. Implementacja AddEditAccountModal (Krok 6 z planu)
**Pliki:**
- `src/components/dashboard/AddEditAccountModal.tsx`
- Zainstalować: `react-hook-form`, `@hookform/resolvers`, `zod`

- [ ] Zainstalować `dialog` z Shadcn UI
- [ ] Zaimplementować formularz z `react-hook-form` i walidacją Zod:
  - Pole `name` (wymagane, min 3 znaki)
  - Pole `type` (select: asset, liability)
  - Pole `initial_value` (wymagane przy tworzeniu, tylko liczby)
- [ ] Obsługa dwóch trybów: tworzenie i edycja
- [ ] Podłączyć akcje:
  - Tworzenie → `addAccount()`
  - Edycja → `updateAccount()`
- [ ] Obsługa błędów:
  - 409 Conflict → "Konto o tej nazwie już istnieje"
  - Inline error messages pod polami
- [ ] Sterowanie widocznością przez `activeModals.addAccount` / `activeModals.editAccount`

### 11. Implementacja EditValueModal (Krok 6 z planu)
**Plik:** `src/components/dashboard/EditValueModal.tsx`

- [ ] Zaimplementować formularz z trzema polami:
  - **Nowa wartość** (wymagane)
  - **Wpłata/Wypłata** (opcjonalne)
  - **Zysk/Strata** (opcjonalne)
- [ ] Dodać logikę automatycznego przeliczania:
  - Użyć `useReducer` do zarządzania stanem formularza
  - Przy zmianie jednego pola, automatycznie przeliczać pozostałe
  - Reguła: `nowa_wartość = poprzednia_wartość + wpłata + zysk`
- [ ] Walidacja spójności gdy wszystkie 3 pola wypełnione
- [ ] Podłączyć do `updateValueEntry()`
- [ ] Wyświetlanie kontekstu:
  - Nazwa konta
  - Data
  - Poprzednia wartość
- [ ] Sterowanie widocznością przez `activeModals.editValue`

### 12. Implementacja ConfirmActionDialog (Krok 6 z planu)
**Plik:** `src/components/dashboard/ConfirmActionDialog.tsx`

- [ ] Zainstalować `alert-dialog` z Shadcn UI
- [ ] Zaimplementować generyczny komponent z propsami:
  - `isOpen`
  - `onOpenChange`
  - `onConfirm`
  - `title`
  - `description`
- [ ] Przycisk potwierdzenia z wariantem `destructive`
- [ ] Sterowanie widocznością przez `activeModals.confirmAction`

### 13. Integracja interakcji (Krok 8 z planu)
- [ ] Podłączyć otwieranie modali z `DataGrid`:
  - Kliknięcie komórki → `openModal('editValue', context)`
  - Menu "Edytuj" → `openModal('editAccount', { account })`
  - Menu "Usuń" → `openModal('confirmAction', { ... })`
  - Menu "Archiwizuj" → `openModal('confirmAction', { ... })`
- [ ] Podłączyć otwieranie modali z `DashboardToolbar`:
  - Przycisk "+ Dodaj konto" → `openModal('addAccount')`
  - Przycisk "+ Dodaj kolumnę" → logika dodawania daty do zakresu

### 14. Testy i dopracowanie (Krok 9 z planu)
- [ ] Przetestować wszystkie przepływy użytkownika
- [ ] Sprawdzić obsługę błędów i stanów pustych
- [ ] Zweryfikować responsywność na różnych urządzeniach
- [ ] Przetestować optymistyczne aktualizacje i rollback
- [ ] Sprawdzić dostępność (ARIA, nawigacja klawiaturą)
- [ ] Przetestować wydajność przy dużej ilości danych

## Uwagi techniczne

### Brakujące endpointy API
Obecnie w projekcie istnieje tylko endpoint `/api/accounts.ts`. Wymagane endpointy do zaimplementowania:
- [ ] `GET /api/grid-data` - dane dla siatki i wykresu
- [ ] `GET /api/dashboard/summary` - dane KPI
- [ ] `POST /api/value-entries` - upsert wartości
- [ ] `GET /api/accounts/[id]` - szczegóły konta
- [ ] `PATCH /api/accounts/[id]` - aktualizacja konta
- [ ] `DELETE /api/accounts/[id]` - usuwanie konta

### Zależności do zainstalowania w kolejnych krokach
- `react-hook-form` - zarządzanie formularzami
- `@hookform/resolvers` - integracja Zod z react-hook-form
- `zod` - walidacja schematów

### Komponenty Shadcn UI do zainstalowania
- `dialog` - dla modali
- `alert-dialog` - dla potwierdzeń
- `dropdown-menu` - dla menu akcji w siatce
- `popover` - dla kalendarza dodawania kolumny
- `calendar` - wybór dat
- `switch` - toggle zarchiwizowanych
- `select` - wybór typu konta
- `input` - pola formularzy
- `form` - komponenty formularza

## Postęp implementacji

**✅ Ukończono:** Kroki 1-14 z planu implementacji (100% Frontend)

### Zrealizowane komponenty:
1. ✅ Struktura plików i zależności
2. ✅ Zarządzanie stanem (useDashboardStore) z Zustand
3. ✅ Layout główny (IntegratedDashboardPage) z obsługą błędów
4. ✅ Integracja API z mockowanymi danymi
5. ✅ KpiSection - 5 kart KPI z formatowaniem
6. ✅ NetWorthChart - wykres liniowy z przełączaniem serii
7. ✅ DashboardToolbar - kontrolki zakresu dat, przyciskistanu
8. ✅ DataGrid - siatka z sticky positioning i interakcjami
9. ✅ AddEditAccountModal - formularz z walidacją Zod
10. ✅ EditValueModal - automatyczne przeliczanie wartości
11. ✅ ConfirmActionDialog - potwierdzanie akcji destrukcyjnych
12. ✅ Integracja wszystkich komponentów
13. ✅ Mockowane dane dla demonstracji
14. ✅ Build projektu zakończony sukcesem

### Zainstalowane zależności:
- `zustand` - zarządzanie stanem globalnym
- `recharts` - biblioteka do wykresów
- `lucide-react` - ikony
- `date-fns` - formatowanie dat
- `react-hook-form` - zarządzanie formularzami
- `@hookform/resolvers` - integracja Zod
- `zod` - walidacja schematów

### Zainstalowane komponenty Shadcn UI:
- `skeleton`, `alert`, `card`, `toggle-group`, `button`
- `calendar`, `popover`, `switch`, `label`
- `dropdown-menu`, `dialog`, `input`, `select`
- `form` (ręcznie), `alert-dialog` (ręcznie)

**⏳ Do ukończenia:** Backend i integracja z rzeczywistym API
- ⏳ Implementacja endpointów API (GET /api/grid-data, GET /api/dashboard/summary, POST /api/value-entries, etc.)
- ⏳ Podmiana mockowanych danych na rzeczywiste wywołania API
- ⏳ Implementacja logiki archiwizacji i usuwania kont
- ⏳ Testy E2E wszystkich przepływów użytkownika
- ⏳ Optymalizacja wydajności (code splitting, lazy loading)
