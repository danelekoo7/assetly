# Plan naprawy tła siatki danych przy przewijaniu

## Problem

Gdy w siatce danych (`DataGrid`) jest więcej kolumn niż mieści się na ekranie i pojawia się poziomy pasek przewijania, tło wierszy nie rozciąga się na całą szerokość siatki. Pusta przestrześć po prawej stronie ma nieprawidłowy, domyślny kolor tła, zamiast koloru wiersza.

## Przyczyna

Problem wynikał z faktu, że główny kontener siatki (`div` z `role="grid"`) nie rozszerzał się prawidłowo, aby jego dzieci (wiersze z `display: flex`) mogły wypełnić całą dostępną szerokość wewnątrz przewijanego obszaru. Szerokość wierszy była ograniczona do sumy szerokości ich komórek.

## Plan implementacji

1.  **Modyfikacja komponentu `DataGrid.tsx`**:
    *   Do głównego kontenera siatki (`div` z `role="grid"`) została dodana klasa `inline-block`.
    *   Zmiana ta sprawia, że kontener siatki rozszerza się, aby dopasować się do całkowitej szerokości swojej zawartości (wszystkich kolumn), a `min-w-full` zapewnia, że nie jest węższy niż widoczny obszar.
    *   Dzięki temu, wiersze (`div` z `role="row"` i `display: flex`) wewnątrz siatki naturalnie rozciągają się na całą szerokość kontenera siatki, co eliminuje problem z tłem.

## Oczekiwany rezultat

Po wprowadzeniu zmian, tło każdego wiersza w siatce danych poprawnie rozciąga się na całą szerokość przewijanego kontenera, zapewniając spójny wygląd podczas przewijania.
