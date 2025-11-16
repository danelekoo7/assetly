# Zaktualizowany Plan Poprawki: Responsywna szerokość kolumn w siatce danych

1.  **Cel:** Dostosowanie szerokości kolumn w siatce danych, aby były węższe na komputerach stacjonarnych, jednocześnie zachowując dobry i spójny wygląd na urządzeniach mobilnych.
2.  **Diagnoza:** Szerokość kolumn była zdefiniowana jako `w-[25vw]`, co powodowało problemy na szerokich ekranach. Dodatkowo, wiersze danych i podsumowania nie miały spójnych definicji szerokości z nagłówkiem, co prowadziło do błędów w wyrównaniu.
3.  **Proponowane zmiany (z uwzględnieniem responsywności):**
    *   **Plik:** `src/components/dashboard/DataGrid/DataGridCell.tsx`
        *   **Zmiana:** Zastąpiono `min-w-[120px] w-[25vw]` klasami `w-[25vw] md:w-[150px]`.
    *   **Plik:** `src/components/dashboard/DataGrid/DataGridHeader.tsx`
        *   **Zmiana (kolumna "Konto"):** Zastąpiono `min-w-[180px] w-[20vw]` klasami `w-[35vw] md:w-[200px]`.
        *   **Zmiana (kolumny z datami):** Zastąpiono `min-w-[120px] w-[25vw]` klasami `w-[25vw] md:w-[150px]`.
    *   **Plik:** `src/components/dashboard/DataGrid/DataGridRow.tsx`
        *   **Zmiana (kolumna z nazwą konta):** Zastąpiono `min-w-[180px] w-[20vw]` klasami `w-[35vw] md:w-[200px]`.
    *   **Plik:** `src/components/dashboard/DataGrid/DataGridSummaryRow.tsx`
        *   **Zmiana (kolumna "Wartość netto"):** Zastąpiono `min-w-[180px] w-[20vw]` klasami `w-[35vw] md:w-[200px]`.
        *   **Zmiana (kolumny z podsumowaniem):** Zastąpiono `min-w-[120px] w-[25vw]` klasami `w-[25vw] md:w-[150px]`.
4.  **Uzasadnienie:** Ujednolicenie responsywnych klas szerokości we wszystkich komponentach siatki (`DataGridHeader`, `DataGridCell`, `DataGridRow`, `DataGridSummaryRow`) zapewniło spójny i poprawny wygląd na wszystkich rozdzielczościach. Na małych ekranach siatka używa elastycznych jednostek `vw`, a na ekranach od `768px` szerokości przełącza się na stałe, zoptymalizowane szerokości w pikselach.
