# Plan naprawy: Zwiększenie szerokości dashboardu

## Cel
Naprawa problemu z ograniczoną szerokością dashboardu, aby wykres i siatka danych zajmowały całą dostępną przestrzeń na większych ekranach, jednocześnie zachowując responsywność na urządzeniach mobilnych.

## Kroki implementacji
1.  **Lokalizacja problemu:** Zidentyfikowano, że w pliku `src/components/dashboard/IntegratedDashboardPage.tsx` kontener `div` z klasą `max-w-7xl` ogranicza szerokość całego widoku.
2.  **Modyfikacja kodu:** Usunięcie klasy `max-w-7xl` z kontenera `div` w funkcji `renderContent` w pliku `src/components/dashboard/IntegratedDashboardPage.tsx`.
3.  **Weryfikacja:** Sprawdzenie, czy po wprowadzeniu zmiany dashboard poprawnie rozciąga się na całą szerokość ekranu na komputerach stacjonarnych oraz czy układ pozostaje czytelny i funkcjonalny na urządzeniach mobilnych.
