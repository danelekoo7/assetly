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

### 2.3. Mechanizm zbierania opinii ✅

- **Wymaganie PRD:** 3.6, Historyjka US-012
- **Opis:** W stopce aplikacji powinny znaleźć się dwa linki: jeden do ankiety (np. Google Forms) i drugi `mailto:` do bezpośredniego kontaktu.
- **Stan obecny:** ✅ **ZREALIZOWANE** (15.11.2025)
- **Implementacja:**
    1.  ✅ Utworzono reużywalny komponent `src/components/Footer.astro`.
    2.  ✅ Zintegrowano Footer z oboma layoutami: `src/layouts/Layout.astro` i `src/layouts/AuthLayout.astro`.
    3.  ✅ Dodano link "Przekaż opinię" → Google Forms (target="_blank", rel="noopener noreferrer").
    4.  ✅ Dodano element kontaktowy: "Kontakt: assetly.mail@gmail.com" (tekst z select-all dla łatwego kopiowania).
    5.  ✅ Zaimplementowano responsywność (mobile: kolumna, desktop: wiersz z separatorem).
    6.  ✅ Stopka widoczna na wszystkich stronach aplikacji, w tym krytycznie na stronach logowania/rejestracji.

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

### 3.2. Stany puste i onboarding ✅

- **Wymaganie PRD:** 3.5, Historyjka US-004
- **Opis:** Aplikacja powinna wyświetlać przyjazny komunikat dla nowych użytkowników bez żadnych danych.
- **Stan obecny:** ✅ **ZREALIZOWANE** (15.11.2025)
- **Implementacja:**
    1.  ✅ Utworzono komponent `src/components/dashboard/EmptyState.tsx` z przyjaznym komunikatem i CTA.
    2.  ✅ Utworzono komponent `src/components/dashboard/DashboardLoadingSkeleton.tsx` dla spójnego stanu ładowania, co eliminuje "mignięcie" interfejsu.
    3.  ✅ Zrefaktoryzowano `IntegratedDashboardPage.tsx` do obsługi trzech stanów: ładowanie (szkielet), pusty (`EmptyState`) i z danymi (dashboard).
    4.  ✅ Uproszczono komponenty `KpiSection`, `NetWorthChart` i `DataGrid` poprzez usunięcie z nich indywidualnej logiki ładowania.
    5.  ✅ Dodano i zweryfikowano testy jednostkowe dla `EmptyState.tsx`.
