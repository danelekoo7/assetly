# Plan naprawy responsywności siatki

## Cel
Poprawa wyglądu siatki danych na urządzeniach mobilnych poprzez uelastycznienie szerokości kolumn oraz usunięcie zbędnych marginesów.

## Kroki

1.  **Uelastycznienie szerokości kolumny "Konto" i "Wartość netto"**:
    *   **Pliki do modyfikacji**: 
        *   `src/components/dashboard/DataGrid/DataGridHeader.tsx`
        *   `src/components/dashboard/DataGrid/DataGridRow.tsx`
        *   `src/components/dashboard/DataGrid/DataGridSummaryRow.tsx`
    *   **Zmiana**: Zmiana klasy `w-[250px]` na `min-w-[180px] w-[20vw]` w każdym z plików.

2.  **Uelastycznienie szerokości kolumn z danymi**:
    *   **Pliki do modyfikacji**:
        *   `src/components/dashboard/DataGrid/DataGridHeader.tsx`
        *   `src/components/dashboard/DataGrid/DataGridCell.tsx`
        *   `src/components/dashboard/DataGrid/DataGridSummaryRow.tsx`
    *   **Zmiana**: Zmiana klasy `w-[150px]` na `min-w-[120px] w-[25vw]` w każdym z plików.

3.  **Usunięcie zbędnych paddingów i centrowania na urządzeniach mobilnych**:
    *   **Plik do modyfikacji**: `src/components/dashboard/IntegratedDashboardPage.tsx`
    *   **Zmiany**:
        *   Modyfikacja klasy `p-6` na `p-2 sm:p-6` w głównym kontenerze.
        *   Usunięcie klasy `mx-auto` z kontenera `renderContent`, aby zlikwidować boczne marginesy.
