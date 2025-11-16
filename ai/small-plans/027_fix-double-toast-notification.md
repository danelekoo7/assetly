# Plan naprawy podwójnych powiadomień "toast"

## Problem

Obecnie, podczas dodawania lub usuwania kolumn w siatce danych, użytkownik otrzymuje podwójne powiadomienia "toast" (zarówno na górze, jak i na dole ekranu). Dzieje się tak, ponieważ komponent `<Toaster />` jest renderowany w dwóch miejscach w aplikacji.

## Cel

Celem jest usunięcie podwójnych powiadomień i zapewnienie, że użytkownik otrzymuje tylko jedno, spójne powiadomienie.

## Plan implementacji

1.  **Identyfikacja zduplikowanych komponentów**:
    *   Zlokalizowano dwie instancje komponentu `<Toaster />`: jedną w `src/layouts/Layout.astro` i drugą w `src/components/dashboard/IntegratedDashboardPage.tsx`.

2.  **Usunięcie zduplikowanego komponentu**:
    *   Usunięto instancję `<Toaster />` z `src/components/dashboard/IntegratedDashboardPage.tsx`, pozostawiając tylko tę w głównym layoucie aplikacji.

3.  **Konfiguracja centralnego komponentu**:
    *   Dodano atrybuty `position="top-right"` i `richColors` do instancji `<Toaster />` w `src/layouts/Layout.astro`, aby zapewnić spójny wygląd powiadomień w całej aplikacji.

4.  **Weryfikacja**:
    *   Po wprowadzeniu zmian, uruchomiono linter (`npm run lint`), aby upewnić się, że kod jest zgodny ze standardami projektu.
