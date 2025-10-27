# Plan Testów dla Aplikacji Assetly

## 1. Wprowadzenie i cele testowania

### 1.1. Wprowadzenie

Niniejszy dokument opisuje strategię, zakres, podejście i zasoby przeznaczone do testowania aplikacji Assetly. Aplikacja jest zbudowana w oparciu o nowoczesny stos technologiczny, w tym Astro, React, Supabase i Tailwind CSS. Celem planu jest zapewnienie, że aplikacja spełnia wymagania funkcjonalne, jest wydajna, bezpieczna i niezawodna przed wdrożeniem na środowisko produkcyjne.

### 1.2. Cele testowania

- **Zapewnienie jakości**: Weryfikacja, czy wszystkie funkcjonalności działają zgodnie ze specyfikacją.
- **Identyfikacja i eliminacja błędów**: Wczesne wykrywanie i naprawa defektów w kodzie.
- **Weryfikacja bezpieczeństwa**: Upewnienie się, że dane użytkowników są bezpieczne, a aplikacja jest odporna na podstawowe ataki.
- **Ocena wydajności**: Sprawdzenie, czy aplikacja działa płynnie i responsywnie pod oczekiwanym obciążeniem.
- **Zapewnienie kompatybilności**: Testowanie aplikacji na różnych przeglądarkach i urządzeniach.
- **Weryfikacja użyteczności i dostępności (UX/UI/a11y)**: Upewnienie się, że interfejs jest intuicyjny i dostępny dla wszystkich użytkowników.

## 2. Zakres testów

### 2.1. Funkcjonalności objęte testami

- **Moduł autentykacji**:
  - Rejestracja nowego użytkownika.
  - Logowanie i wylogowywanie.
  - Odzyskiwanie i resetowanie hasła.
  - Walidacja formularzy.
- **Dashboard użytkownika**:
  - Wyświetlanie danych finansowych (KPI, wykresy, siatka danych).
  - Dodawanie, edycja i usuwanie kont finansowych.
  - Filtrowanie i sortowanie danych.
  - Poprawność obliczeń i agregacji danych.
- **API Backendowe**:
  - Wszystkie endpointy w `src/pages/api/`.
  - Autoryzacja dostępu do endpointów.
  - Walidacja danych wejściowych i format odpowiedzi.
- **Integracje z usługami zewnętrznymi**:
  - Poprawna komunikacja z Supabase (baza danych, autentykacja).
  - Poprawna komunikacja z Openrouter.ai.

### 2.2. Funkcjonalności wyłączone z testów

- Testowanie wewnętrznej infrastruktury Supabase i DigitalOcean (zakładamy ich niezawodność).
- Szczegółowe testy wydajnościowe bibliotek zewnętrznych (np. shadcn/ui).

## 3. Typy testów do przeprowadzenia

- **Testy jednostkowe (Unit Tests)**:
  - **Cel**: Weryfikacja poprawności działania pojedynczych funkcji, komponentów i modułów w izolacji.
  - **Zakres**: Logika biznesowa w usługach (`src/lib/services`), customowe hooki React, funkcje pomocnicze (`src/lib/utils`), logika store'ów (`src/lib/stores`), walidacja schematów (Zod).
  - **Narzędzia**: Vitest, React Testing Library, `vi.mock` do mockowania zależności.
- **Testy integracyjne (Integration Tests)**:
  - **Cel**: Sprawdzenie poprawności współpracy między różnymi modułami aplikacji.
  - **Zakres**: Integracja komponentów React z usługami, testowanie endpointów API (`src/pages/api`) w połączeniu z mockowaną lub testową bazą danych Supabase.
  - **Narzędzia**: Vitest, Supertest (dla API), mock-service-worker (MSW) do mockowania API.
- **Testy End-to-End (E2E)**:
  - **Cel**: Symulacja rzeczywistych scenariuszy użytkowania aplikacji z perspektywy użytkownika końcowego.
  - **Zakres**: Pełne ścieżki użytkownika, np. rejestracja -> logowanie -> dodanie konta -> wylogowanie.
  - **Narzędzia**: Playwright lub Cypress.
- **Testy wizualnej regresji (Visual Regression Testing)**:
  - **Cel**: Wykrywanie niezamierzonych zmian w interfejsie użytkownika.
  - **Zakres**: Kluczowe widoki i komponenty aplikacji.
  - **Narzędzia**: Playwright (porównywanie screenshotów), Chromatic.
- **Testy bezpieczeństwa (Security Testing)**:
  - **Cel**: Identyfikacja podstawowych luk bezpieczeństwa.
  - **Zakres**: Sprawdzanie uprawnień do API, ochrona przed XSS, weryfikacja polityk RLS w Supabase.
  - **Narzędzia**: Ręczne testy penetracyjne, skanery bezpieczeństwa (np. Snyk, OWASP ZAP).
- **Testy dostępności (Accessibility Testing)**:
  - **Cel**: Zapewnienie zgodności z standardami WCAG.
  - **Zakres**: Audyt kluczowych stron i komponentów interaktywnych.
  - **Narzędzia**: Audyty w przeglądarce (Lighthouse), `axe-core` zintegrowane z testami E2E.

## 4. Scenariusze testowe dla kluczowych funkcjonalności

### 4.1. Rejestracja i logowanie

| ID    | Opis scenariusza                                                      | Oczekiwany rezultat                                                               | Priorytet |
| :---- | :-------------------------------------------------------------------- | :-------------------------------------------------------------------------------- | :-------- |
| TC-01 | Użytkownik rejestruje się z poprawnymi danymi.                        | Konto zostaje utworzone, użytkownik jest zalogowany i przekierowany na dashboard. | Krytyczny |
| TC-02 | Użytkownik próbuje zarejestrować się z zajętym adresem e-mail.        | Wyświetlany jest komunikat o błędzie.                                             | Wysoki    |
| TC-03 | Użytkownik loguje się z poprawnymi danymi.                            | Użytkownik jest zalogowany i przekierowany na dashboard.                          | Krytyczny |
| TC-04 | Użytkownik próbuje zalogować się z niepoprawnym hasłem.               | Wyświetlany jest komunikat o błędzie.                                             | Wysoki    |
| TC-05 | Niezalogowany użytkownik próbuje uzyskać dostęp do strony dashboardu. | Użytkownik jest przekierowany na stronę logowania.                                | Krytyczny |

### 4.2. Zarządzanie kontami finansowymi

| ID    | Opis scenariusza                                                            | Oczekiwany rezultat                                                                | Priorytet |
| :---- | :-------------------------------------------------------------------------- | :--------------------------------------------------------------------------------- | :-------- |
| TC-06 | Zalogowany użytkownik dodaje nowe konto z poprawnymi danymi.                | Konto pojawia się na liście, dane na dashboardzie (KPI, wykresy) są aktualizowane. | Krytyczny |
| TC-07 | Użytkownik próbuje dodać konto z niepoprawnymi danymi (np. ujemna wartość). | Formularz wyświetla błędy walidacji.                                               | Wysoki    |
| TC-08 | Użytkownik edytuje istniejące konto.                                        | Dane konta oraz dashboardu zostają zaktualizowane.                                 | Wysoki    |
| TC-09 | Użytkownik usuwa istniejące konto.                                          | Konto znika z listy, dane na dashboardzie są przeliczane ponownie.                 | Wysoki    |

## 5. Środowisko testowe

- **Środowisko lokalne**: Deweloperzy uruchamiają testy jednostkowe i integracyjne na swoich maszynach.
- **Środowisko CI (Continuous Integration)**: Github Actions. Wszystkie testy (jednostkowe, integracyjne, E2E) są automatycznie uruchamiane dla każdego pull requesta do głównego brancha.
- **Środowisko Staging**: Kopia środowiska produkcyjnego hostowana na DigitalOcean. Używane do testów E2E, testów manualnych i UAT (User Acceptance Testing) przed wdrożeniem.
- **Baza danych**: Dedykowana, odizolowana instancja projektu Supabase dla środowiska Staging i testów E2E, regularnie czyszczona i wypełniana danymi testowymi.

## 6. Narzędzia do testowania

| Kategoria                  | Narzędzie                 | Zastosowanie                                        |
| :------------------------- | :------------------------ | :-------------------------------------------------- |
| **Framework testowy**      | Vitest                    | Testy jednostkowe i integracyjne                    |
| **Testowanie komponentów** | React Testing Library     | Testowanie komponentów React                        |
| **Testy E2E**              | Playwright                | Automatyzacja testów w przeglądarce, testy wizualne |
| **Mockowanie API**         | Mock Service Worker (MSW) | Mockowanie żądań sieciowych w testach               |
| **Asercje**                | Vitest (`expect`)         | Sprawdzanie poprawności wyników testów              |
| **CI/CD**                  | Github Actions            | Automatyzacja uruchamiania testów                   |
| **Zarządzanie zadaniami**  | GitHub Issues / Projects  | Śledzenie zadań i raportowanie błędów               |

## 7. Harmonogram testów

- **Testy jednostkowe i integracyjne**: Pisane na bieżąco przez deweloperów w trakcie implementacji nowych funkcjonalności.
- **Testy E2E**: Rozwijane równolegle z kluczowymi funkcjonalnościami. Pełna regresja E2E uruchamiana przed każdym wdrożeniem na produkcję.
- **Testy manualne i UAT**: Przeprowadzane na środowisku Staging po zakończeniu implementacji większego etapu (np. sprintu).

## 8. Kryteria akceptacji testów

### 8.1. Kryteria wejścia

- Kod źródłowy został zintegrowany i wdrożony na środowisku testowym.
- Wszystkie testy jednostkowe i integracyjne przechodzą pomyślnie.
- Środowisko testowe jest stabilne i skonfigurowane.

### 8.2. Kryteria wyjścia

- 100% testów jednostkowych i integracyjnych przechodzi pomyślnie.
- Co najmniej 95% krytycznych i wysokich scenariuszy testowych E2E przechodzi pomyślnie.
- Brak nierozwiązanych błędów o priorytecie krytycznym lub wysokim.
- Pokrycie kodu testami (code coverage) na poziomie co najmniej 80% dla logiki biznesowej.

## 9. Role i odpowiedzialności w procesie testowania

- **Deweloperzy**:
  - Pisanie testów jednostkowych i integracyjnych dla swojego kodu.
  - Naprawianie błędów znalezionych podczas testów.
  - Utrzymywanie pipeline'u CI/CD.
- **Inżynier QA / Tester**:
  - Tworzenie i utrzymywanie planu testów.
  - Projektowanie i implementacja testów E2E.
  - Przeprowadzanie testów manualnych i eksploracyjnych.
  - Raportowanie i weryfikacja błędów.
- **Product Owner / Manager**:
  - Definiowanie wymagań i kryteriów akceptacji.
  - Udział w testach UAT.
  - Priorytetyzacja naprawy błędów.

## 10. Procedury raportowania błędów

1.  **Zgłoszenie błędu**: Każdy znaleziony błąd jest zgłaszany jako "Issue" w repozytorium GitHub.
2.  **Zawartość zgłoszenia**:
    - **Tytuł**: Krótki, zwięzły opis problemu.
    - **Opis**: Szczegółowy opis błędu, w tym:
      - Kroki do reprodukcji (krok po kroku).
      - Oczekiwany rezultat.
      - Rzeczywisty rezultat.
    - **Środowisko**: Wersja aplikacji, przeglądarka, system operacyjny.
    - **Załączniki**: Screenshoty, nagrania wideo, logi z konsoli.
    - **Priorytet**: Krytyczny, Wysoki, Średni, Niski.
3.  **Cykl życia błędu**:
    - `New`: Nowo zgłoszony błąd.
    - `In Progress`: Błąd jest analizowany i naprawiany.
    - `In Review`: Naprawa czeka na code review.
    - `Ready for Testing`: Błąd jest gotowy do weryfikacji na środowisku Staging.
    - `Closed`: Błąd został zweryfikowany i naprawiony.
    - `Rejected`: Zgłoszenie nie jest błędem.
