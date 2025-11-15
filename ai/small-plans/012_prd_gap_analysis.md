# Analiza Różnic: Wymagania PRD vs. Aktualny Stan Projektu

**Data utworzenia:** 14.11.2025
**Status:** Do implementacji
**Cel:** Zidentyfikowanie i zaplanowanie implementacji brakujących funkcjonalności z dokumentu wymagań produktu (PRD).

---

## 1. Przegląd

Na podstawie analizy dokumentu `ai/prd.md` i porównania go z obecnym stanem projektu, zidentyfikowano następujące brakujące elementy, które należy zaimplementować, aby w pełni zrealizować wizję MVP.

---

## 2. Elementy do zaimplementowania

### 2.1. Trwałe usuwanie konta użytkownika

- **Wymaganie PRD:** 3.1, Historyjka US-011
- **Opis:** Użytkownik powinien mieć możliwość trwałego usunięcia swojego konta wraz ze wszystkimi danymi. Operacja musi być zabezpieczona hasłem.
- **Stan obecny:** Brakuje dedykowanego endpointu API oraz interfejsu użytkownika do tej operacji. Istnieje tylko API do usuwania pojedynczych kont finansowych.
- **Plan działania:**
    1.  Stworzyć nowy endpoint `DELETE /api/user/profile`.
    2.  Endpoint powinien weryfikować hasło użytkownika.
    3.  Implementacja funkcji w Supabase (np. `delete_user()`), która usunie użytkownika z `auth.users` i kaskadowo wszystkie jego dane.
    4.  Dodanie odpowiedniej opcji w interfejsie użytkownika (np. w ustawieniach konta).

### 2.2. Automatyczne przepisywanie wartości (forward-fill)

- **Wymaganie PRD:** 3.3
- **Opis:** Gdy użytkownik dodaje nowe konto z datą początkową wcześniejszą niż istniejące daty w siatce, jego wartość początkowa powinna być automatycznie "przeniesiona" na wszystkie późniejsze daty, aż do pierwszego ręcznego wpisu.
- **Stan obecny:** Zaimplementowano. Logika `forward-fill` została dodana w serwisie `GridDataService` po stronie backendu, zgodnie z preferowanym podejściem.
- **Plan działania:**
    -   ~~Zmodyfikować serwis `GridDataService` na backendzie.~~ (Zrealizowane)
    -   ~~Po pobraniu danych z bazy, serwis powinien zidentyfikować konta z datą początkową wcześniejszą niż najwcześniejsza data w wybranym zakresie.~~ (Zrealizowane w ramach ogólnej logiki forward-fill)
    -   ~~W pętli "wypełnić" brakujące wpisy wartością początkową konta dla każdej daty, aż do napotkania pierwszego istniejącego wpisu.~~ (Zrealizowane)
    -   ~~Alternatywnie, logikę można zaimplementować po stronie frontendu w `useDashboardStore` po otrzymaniu danych, ale backend jest preferowany jako "single source of truth".~~ (Zrealizowane na backendzie)

### 2.3. Mechanizm zbierania opinii

- **Wymaganie PRD:** 3.6, Historyjka US-012
- **Opis:** W stopce aplikacji powinny znaleźć się dwa linki: jeden do ankiety (np. Google Forms) i drugi `mailto:` do bezpośredniego kontaktu.
- **Stan obecny:** Brak stopki z linkami w głównym layoucie.
- **Plan działania:**
    1.  Zmodyfikować komponent `src/layouts/Layout.astro`.
    2.  Dodać element `<footer>`.
    3.  W stopce umieścić dwa linki (`<a>`) z odpowiednimi atrybutami `href` (jeden do zewnętrznej ankiety, drugi `mailto:adres@email.com`).

---

## 3. Elementy do weryfikacji

Poniższe funkcjonalności są częściowo zaimplementowane, ale wymagają pełnego przetestowania i ewentualnych poprawek.

### 3.1. Pełna responsywność i interfejs mobilny

- **Wymaganie PRD:** 3.7, Historyjki US-013, US-014, US-015
- **Opis:** Aplikacja musi być w pełni użyteczna na urządzeniach mobilnych.
- **Stan obecny:** Projekt używa Tailwind CSS, co ułatwia RWD, ale poszczególne komponenty (zwłaszcza siatka danych i modale) mogą wymagać dopracowania.
- **Plan działania:**
    1.  Przeprowadzić manualne testy na różnych urządzeniach (lub w trybie deweloperskim przeglądarki).
    2.  Zweryfikować poziome przewijanie siatki danych.
    3.  Sprawdzić czytelność i użyteczność modali na małych ekranach.
    4.  Upewnić się, że przyciski mają odpowiedni rozmiar (`touch target`).
    5.  Dodać testy E2E (Playwright) dla widoku mobilnego.

### 3.2. Stany puste i onboarding

- **Wymaganie PRD:** 3.5, Historyjka US-004
- **Opis:** Aplikacja powinna wyświetlać przyjazny komunikat dla nowych użytkowników bez żadnych danych.
- **Stan obecny:** Prawdopodobnie siatka danych jest po prostu pusta.
- **Plan działania:**
    1.  W komponencie `IntegratedDashboardPage.tsx` lub `DataGrid.tsx` dodać warunek sprawdzający, czy `gridData.accounts` jest puste.
    2.  Jeśli tak, wyświetlić dedykowany komponent "pustego stanu" z komunikatem i przyciskiem "Dodaj swoje pierwsze konto", który otwiera modal dodawania konta.
    3.  Dodać test E2E dla scenariusza pierwszego logowania nowego użytkownika.
