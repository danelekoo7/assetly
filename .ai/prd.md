# Dokument wymagań produktu (PRD) - Assetly
## 1. Przegląd produktu
Assetly to aplikacja internetowa w wersji MVP (Minimum Viable Product), zaprojektowana w celu zapewnienia użytkownikom prostego i scentralizowanego narzędzia do śledzenia ich całkowitej wartości netto. Aplikacja pozwala na ręczne dodawanie i zarządzanie różnymi rodzajami aktywów (np. oszczędności, inwestycje) i pasywów (np. kredyty, pożyczki) w jednym miejscu. Głównym interfejsem jest widok tabelaryczny przypominający arkusz kalkulacyjny, który umożliwia łatwą aktualizację i przeglądanie historii finansowej. Aplikacja wizualizuje zmiany wartości netto w czasie za pomocą prostego wykresu liniowego, dając użytkownikowi jasny obraz jego sytuacji finansowej.

Produkt jest skierowany do użytkowników indywidualnych, którzy posiadają swoje środki i zobowiązania w wielu różnych miejscach i potrzebują narzędzia do ich agregacji bez konieczności automatycznej synchronizacji z bankami.

Wersja MVP zostanie zbudowana jako aplikacja webowa przeznaczona na komputery stacjonarne, z wykorzystaniem stosu technologicznego: Astro, React, TypeScript, Tailwind CSS, Shadcn/ui oraz Supabase jako backend (BaaS).

## 2. Problem użytkownika
Użytkownicy, którzy posiadają aktywa i pasywa w różnych instytucjach (konta bankowe, domy maklerskie, kredyty hipoteczne), nie mają prostego, scentralizowanego narzędzia do śledzenia swojej całkowitej wartości netto. Obecne rozwiązania, takie jak ręczne prowadzenie arkuszy kalkulacyjnych, są czasochłonne, podatne na błędy i nie oferują dynamicznego wglądu w historyczne zmiany sytuacji finansowej. Brak jednego źródła prawdy o stanie majątkowym utrudnia podejmowanie świadomych decyzji finansowych i zrozumienie, jak wartość netto zmienia się w czasie.

## 3. Wymagania funkcjonalne
### 3.1. Autentykacja i zarządzanie kontem użytkownika
-   Użytkownicy mogą założyć konto za pomocą adresu e-mail i hasła.
-   Po rejestracji wymagane jest potwierdzenie adresu e-mail poprzez kliknięcie w link wysłany na podany adres.
-   Zalogowani użytkownicy mają dostęp do swoich danych.
-   Użytkownik może trwale usunąć swoje konto. Operacja ta wymaga potwierdzenia hasłem i jest nieodwracalna.

### 3.2. Pulpit (Dashboard)
-   Po zalogowaniu użytkownik widzi pulpit główny.
-   Pulpit wyświetla trzy kluczowe informacje:
    1.  Aktualna całkowita wartość netto (duża, czytelna liczba).
    2.  Suma wartości wszystkich aktywów.
    3.  Suma wartości wszystkich pasywów.
-   Na pulpicie znajduje się główny wykres liniowy, który prezentuje historyczne zmiany całkowitej wartości netto w czasie.

### 3.3. Interfejs tabelaryczny (Zarządzanie danymi)
-   Główny widok do zarządzania danymi ma formę siatki przypominającej arkusz kalkulacyjny.
-   Wiersze reprezentują poszczególne konta (aktywa lub pasywa).
-   Kolumny reprezentują daty, dla których wprowadzono wartości.
-   Użytkownik może dodać nową kolumnę z danymi dla bieżącego dnia. Nowa kolumna automatycznie kopiuje wartości z ostatniej istniejącej kolumny.
-   Użytkownik może edytować wartość dowolnego konta w dowolnej komórce (data historyczna lub bieżąca).
-   Wszystkie zmiany w komórkach są zapisywane automatycznie w tle. Dyskretny wskaźnik wizualny informuje użytkownika o stanie zapisu (np. "Zapisywanie...", "Zapisano").
-   Komórki edytowalne wizualnie sygnalizują możliwość edycji po najechaniu na nie kursorem (np. zmiana tła, ikona ołówka).
-   Pola do wprowadzania wartości akceptują tylko dane liczbowe. Wartości pasywów wprowadza się jako liczby dodatnie.
-   Tabela zawiera wiersz podsumowania na dole, który pokazuje sumę aktywów, pasywów oraz wartość netto dla każdej kolumny (daty).

### 3.4. Zarządzanie kontami finansowymi (Aktywa/Pasywa)
-   Użytkownik może dodawać nowe konta, określając ich nazwę i typ (akrywo/pasywo).
-   Aktywa i pasywa są wizualnie rozróżnione w tabeli (np. kolor tła, ikona ▲/▼) w celu zapewnienia czytelności i dostępności.
-   Użytkownik może zarchiwizować konto. Zarchiwizowane konto jest wyszarzone i ukryte z domyślnego widoku tabeli, ale jego historyczne dane nadal są uwzględniane na wykresie wartości netto. Operacja wymaga potwierdzenia w oknie dialogowym.
-   Użytkownik może trwale usunąć konto. Usunięcie konta powoduje skasowanie całej jego historii wartości i jest operacją nieodwracalną. Operacja wymaga potwierdzenia w oknie dialogowym.

### 3.5. Stany puste i onboarding
-   Aplikacja posiada zaprojektowany "pusty stan" dla nowych użytkowników (lub po usunięciu wszystkich kont), który zawiera jasny komunikat i przycisk wzywający do działania (np. "+ Dodaj nowe konto"), aby poprowadzić użytkownika do wykonania pierwszej akcji.

### 3.6. Zbieranie opinii
-   W stopce aplikacji znajdują się dwa linki:
    1.  Link do prostej ankiety (3-4 pytania) w celu zebrania opinii na temat użyteczności i brakujących funkcji.
    2.  Link `mailto:` do kontaktowego adresu e-mail, umożliwiający bezpośredni kontakt.

### 3.7. Wymagania niefunkcjonalne
-   Waluta: Aplikacja obsługuje jedną walutę (PLN). Interfejs nie wyświetla symbolu waluty, ale baza danych jest przygotowana na jego dodanie w przyszłości.
-   Bezpieczeństwo: Wszystkie dane użytkownika są szyfrowane w spoczynku i podczas przesyłania (at-rest, in-transit) z wykorzystaniem mechanizmów platformy Supabase.
-   Platforma: Aplikacja jest przeznaczona do użytku na przeglądarkach internetowych na komputerach stacjonarnych. Optymalizacja pod kątem urządzeń mobilnych nie jest priorytetem dla MVP.

## 4. Granice produktu
Następujące funkcje i elementy są świadomie wyłączone z zakresu MVP, aby zapewnić terminowe dostarczenie produktu:
-   Brak obsługi wielu walut i automatycznego przeliczania kursów.
-   Brak automatycznych integracji z bankami, giełdami i innymi instytucjami finansowymi. Wszystkie dane są wprowadzane wyłącznie ręcznie.
-   Brak dedykowanej wersji mobilnej lub interfejsu w pełni responsywnego.
-   Brak możliwości przywrócenia (cofnięcia archiwizacji) zarchiwizowanego konta.
-   Brak zaawansowanych narzędzi analitycznych i raportów poza głównym wykresem wartości netto.
-   Brak funkcji resetowania hasła (może zostać dodane w razie potrzeby, ale nie jest w minimalnym zakresie).
-   Brak ostatecznego projektu logo. Na potrzeby MVP zostanie użyte proste logo tekstowe.

## 5. Historyjki użytkowników

### Autentykacja i Onboarding
-   ID: US-001
-   Tytuł: Rejestracja nowego użytkownika
-   Opis: Jako nowy odwiedzający, chcę móc założyć konto w aplikacji używając mojego adresu e-mail i hasła, abym mógł zacząć śledzić moje finanse.
-   Kryteria akceptacji:
    -   Formularz rejestracji zawiera pola na adres e-mail i hasło.
    -   System waliduje poprawność formatu adresu e-mail.
    -   System sprawdza, czy użytkownik o danym e-mailu już nie istnieje.
    -   Po pomyślnej rejestracji, na podany adres e-mail wysyłana jest wiadomość z linkiem aktywacyjnym.
    -   Użytkownik jest informowany, że musi potwierdzić swój adres e-mail.

-   ID: US-002
-   Tytuł: Potwierdzenie adresu e-mail
-   Opis: Jako nowo zarejestrowany użytkownik, chcę potwierdzić mój adres e-mail klikając w link, aby aktywować moje konto i uzyskać możliwość logowania.
-   Kryteria akceptacji:
    -   Po kliknięciu w link aktywacyjny, status konta użytkownika w systemie zmienia się na "aktywny".
    -   Użytkownik jest przekierowywany na stronę logowania z komunikatem o pomyślnej aktywacji konta.
    -   Link aktywacyjny jest jednorazowy i/lub ma ograniczony czas ważności.

-   ID: US-003
-   Tytuł: Logowanie do aplikacji
-   Opis: Jako zarejestrowany użytkownik, chcę móc zalogować się na moje konto podając e-mail i hasło, aby uzyskać dostęp do mojego pulpitu.
-   Kryteria akceptacji:
    -   Formularz logowania zawiera pola na e-mail i hasło.
    -   Po poprawnym uwierzytelnieniu, jestem przekierowany na mój pulpit (dashboard).
    -   W przypadku podania błędnych danych, wyświetlany jest stosowny komunikat o błędzie.
    -   Logowanie jest niemożliwe dla konta, które nie zostało aktywowane.

-   ID: US-004
-   Tytuł: Pierwsze logowanie i pusty stan
-   Opis: Jako nowy użytkownik, po pierwszym zalogowaniu chcę zobaczyć czytelny interfejs, który pokieruje mnie, jak dodać moje pierwsze aktywo lub pasywo.
-   Kryteria akceptacji:
    -   Po zalogowaniu na puste konto, pulpit i tabela danych są puste.
    -   Na środku ekranu widoczny jest komunikat powitalny oraz przycisk/link "+ Dodaj nowe konto".
    -   Wykres wartości netto jest pusty i wyświetla informację, że potrzebne są dane.

### Zarządzanie kontami finansowymi
-   ID: US-005
-   Tytuł: Dodawanie nowego konta (aktywa/pasywa)
-   Opis: Jako użytkownik, chcę móc dodać nowe konto, podając jego nazwę, typ (aktywo lub pasywo) i początkową wartość, aby rozpocząć śledzenie.
-   Kryteria akceptacji:
    -   Istnieje przycisk "+ Dodaj nowe konto", który otwiera formularz/modal.
    -   Formularz zawiera pole na nazwę konta, przełącznik typu (aktywo/pasywo) i pole na jego wartość początkową.
    -   Po dodaniu, nowe konto pojawia się jako nowy wiersz w tabeli.
    -   Pulpit i wykres są aktualizowane o wartość nowego konta.

-   ID: US-006
-   Tytuł: Archiwizacja konta
-   Opis: Jako użytkownik, chcę móc zarchiwizować konto, którego już aktywnie nie używam (np. spłacony kredyt), aby ukryć je z głównego widoku, ale zachować jego dane w historii.
-   Kryteria akceptacji:
    -   Przy każdym koncie w tabeli istnieje opcja "Archiwizuj".
    -   Po kliknięciu opcji, pojawia się okno dialogowe z prośbą o potwierdzenie.
    -   Po potwierdzeniu, konto znika z aktywnej listy w tabeli (lub zostaje wyszarzone i przeniesione na dół).
    -   Dane z zarchiwizowanego konta nadal są uwzględniane w obliczeniach historycznych na wykresie i w wierszu podsumowania.

-   ID: US-007
-   Tytuł: Trwałe usuwanie konta
-   Opis: Jako użytkownik, chcę móc trwale usunąć konto wraz z całą jego historią, jeśli zostało dodane przez pomyłkę lub nie jest już potrzebne.
-   Kryteria akceptacji:
    -   Przy każdym koncie istnieje opcja "Usuń".
    -   Po kliknięciu, pojawia się okno dialogowe z wyraźnym ostrzeżeniem, że operacja jest nieodwracalna, i prośbą o potwierdzenie.
    -   Po potwierdzeniu, konto i wszystkie powiązane z nim historyczne wartości są trwale usuwane z bazy danych.
    -   Pulpit, wykres i podsumowania są natychmiast aktualizowane.

### Zarządzanie danymi i wizualizacja
-   ID: US-008
-   Tytuł: Dodawanie wpisu z wartościami dla bieżącego dnia
-   Opis: Jako użytkownik, chcę mieć prostą możliwość dodania nowej kolumny z dzisiejszą datą, aby szybko zaktualizować stan moich finansów.
-   Kryteria akceptacji:
    -   Istnieje przycisk "Dodaj dzisiejszą kolumnę" (lub podobny).
    -   Po kliknięciu, do tabeli dodawana jest nowa kolumna z bieżącą datą.
    -   Wartości w nowej kolumnie są automatycznie wypełniane wartościami z ostatniej istniejącej kolumny.
    -   Jeśli jest to pierwsza kolumna, wartości są ustawiane na 0 lub wartości początkowe kont.

-   ID: US-009
-   Tytuł: Edycja wartości konta
-   Opis: Jako użytkownik, chcę móc kliknąć w dowolną komórkę z wartością w tabeli i ją edytować, aby poprawić błąd lub zaktualizować dane.
-   Kryteria akceptacji:
    -   Najazd kursorem na komórkę z wartością zmienia jej wygląd, sugerując możliwość edycji.
    -   Kliknięcie w komórkę zmienia ją w pole edytowalne.
    -   Pole akceptuje tylko wartości liczbowe.
    -   Po zmianie wartości i opuszczeniu pola (np. kliknięcie poza), zmiana jest automatycznie zapisywana.
    -   Wskaźnik zapisu informuje o statusie operacji.
    -   Po zapisaniu, wszystkie sumy (pulpit, wiersz podsumowania) oraz wykres są aktualizowane.

-   ID: US-010
-   Tytuł: Przeglądanie pulpitu
-   Opis: Jako użytkownik, chcę po zalogowaniu widzieć na pulpicie moją aktualną wartość netto, sumy aktywów/pasywów i wykres historyczny, aby szybko ocenić moją sytuację finansową.
-   Kryteria akceptacji:
    -   Pulpit jest domyślnym widokiem po zalogowaniu.
    -   Wyświetlana wartość netto jest poprawnie obliczona (suma aktywów - suma pasywów) dla ostatniej daty.
    -   Wykres liniowy poprawnie renderuje dane historyczne wartości netto.
    -   Oś X wykresu reprezentuje czas (daty), a oś Y reprezentuje wartość netto.

### Zarządzanie kontem i feedback
-   ID: US-011
-   Tytuł: Usuwanie konta użytkownika
-   Opis: Jako użytkownik, chcę mieć możliwość trwałego usunięcia mojego konta i wszystkich moich danych z aplikacji.
-   Kryteria akceptacji:
    -   W ustawieniach konta użytkownika znajduje się opcja "Usuń konto".
    -   Po kliknięciu, pojawia się okno modalne z prośbą o potwierdzenie operacji poprzez wpisanie hasła.
    -   Po poprawnym podaniu hasła i potwierdzeniu, wszystkie dane użytkownika (konto, aktywa, pasywa, historia) są trwale usuwane.
    -   Użytkownik jest automatycznie wylogowywany i nie może się już zalogować na to konto.

-   ID: US-012
-   Tytuł: Przekazywanie opinii
-   Opis: Jako użytkownik, chcę mieć łatwy dostęp do sposobu przekazania mojej opinii lub zgłoszenia problemu, aby pomóc w rozwoju aplikacji.
-   Kryteria akceptacji:
    -   W stopce aplikacji stale widoczne są dwa linki: "Przekaż opinię" i "Kontakt".
    -   Link "Przekaż opinię" otwiera zewnętrzną ankietę (np. Google Forms, Tally) w nowej karcie.
    -   Link "Kontakt" jest linkiem typu `mailto:`, który otwiera domyślnego klienta poczty e-mail z wpisanym adresem odbiorcy.

## 6. Metryki sukcesu
### 6.1. Kryteria sukcesu MVP
-   Dostarczenie działającej aplikacji webowej, która realizuje wszystkie wymienione wymagania funkcjonalne, w ciągu 6 tygodni.
-   Aplikacja jest stabilna i pozwala na bezbłędne wykonywanie kluczowych operacji (CRUD na kontach i wartościach).

### 6.2. Kluczowe wskaźniki efektywności (KPI)
-   Zaangażowanie użytkowników: Celem jest osiągnięcie wskaźnika, w którym przeciętny aktywny użytkownik wykonuje co najmniej jedną aktualizację wartości swoich kont w miesiącu (>=1).
-   Retencja użytkowników: Śledzenie, jaki procent użytkowników powraca do aplikacji po pierwszym tygodniu od rejestracji.

### 6.3. Jakościowe miary sukcesu
-   Jakość i prostota (ankieta): Zbieranie jakościowych opinii za pomocą ankiety w celu mierzenia postrzeganej łatwości obsługi, satysfakcji oraz identyfikacji najbardziej pożądanych nowych funkcji. Wyniki ankiety będą kluczowym wkładem w planowanie kolejnych iteracji produktu.

### 6.4. Zidentyfikowane ryzyka
-   Ryzyko harmonogramu vs. technologia: Istnieje zidentyfikowane ryzyko związane z napiętym, 6-tygodniowym terminem wdrożenia MVP przy jednoczesnym wykorzystaniu projektu do nauki nowego stosu technologicznego (Astro, React, Tailwind). Zespół akceptuje to ryzyko, priorytetyzując bezwzględnie minimalny zakres funkcjonalny.
-   Projekt logo: Ostateczny projekt logo "Assetly" nie jest częścią MVP. Zostanie użyte tymczasowe logo tekstowe, co jest akceptowalnym kompromisem.
