# Dokument wymagań produktu (PRD) - Assetly

## 1. Przegląd produktu

Assetly to aplikacja internetowa w wersji MVP (Minimum Viable Product), zaprojektowana w celu zapewnienia użytkownikom prostego i scentralizowanego narzędzia do śledzenia ich całkowitej wartości netto. Aplikacja pozwala na ręczne dodawanie i zarządzanie różnymi rodzajami aktywów (np. oszczędności, inwestycje) i pasywów (np. kredyty, pożyczki) w jednym miejscu. Głównym interfejsem jest widok tabelaryczny przypominający arkusz kalkulacyjny, który umożliwia łatwą aktualizację i przeglądanie historii finansowej. Aplikacja wizualizuje zmiany wartości netto w czasie za pomocą prostego wykresu liniowego, dając użytkownikowi jasny obraz jego sytuacji finansowej.

Produkt jest skierowany do użytkowników indywidualnych, którzy posiadają swoje środki i zobowiązania w wielu różnych miejscach i potrzebują narzędzia do ich agregacji bez konieczności automatycznej synchronizacji z bankami.

Wersja MVP zostanie zbudowana jako responsywna aplikacja webowa przeznaczona zarówno na komputery stacjonarne, jak i telefony komórkowe, z wykorzystaniem stosu technologicznego: Astro, React, TypeScript, Tailwind CSS, Shadcn/ui oraz Supabase jako backend (BaaS).

## 2. Problem użytkownika

Użytkownicy, którzy posiadają aktywa i pasywa w różnych instytucjach (konta bankowe, domy maklerskie, kredyty hipoteczne), nie mają prostego, scentralizowanego narzędzia do śledzenia swojej całkowitej wartości netto. Obecne rozwiązania, takie jak ręczne prowadzenie arkuszy kalkulacyjnych, są czasochłonne, podatne na błędy i nie oferują dynamicznego wglądu w historyczne zmiany sytuacji finansowej. Brak jednego źródła prawdy o stanie majątkowym utrudnia podejmowanie świadomych decyzji finansowych i zrozumienie, jak wartość netto zmienia się w czasie.

## 3. Wymagania funkcjonalne

### 3.1. Autentykacja i zarządzanie kontem użytkownika

- Użytkownicy mogą założyć konto za pomocą adresu e-mail i hasła.
- Po rejestracji wymagane jest potwierdzenie adresu e-mail poprzez kliknięcie w link wysłany na podany adres.
- Zalogowani użytkownicy mają dostęp do swoich danych.
- Użytkownik może trwale usunąć swoje konto. Operacja ta wymaga potwierdzenia hasłem i jest nieodwracalna.

### 3.2. Pulpit (Dashboard)

- Po zalogowaniu użytkownik widzi pulpit główny.
- Pulpit wyświetla trzy kluczowe informacje:
  1.  Aktualna całkowita wartość netto (duża, czytelna liczba).
  2.  Suma wartości wszystkich aktywów.
  3.  Suma wartości wszystkich pasywów.
- Dodatkowo pulpit pokazuje szczegółowy podział wpływu na wartość netto:
  1.  Skumulowana wartość wpłat/wypłat (przepływy środków).
  2.  Skumulowana wartość zysków/strat z inwestycji.
- Na pulpicie znajduje się główny wykres liniowy, który prezentuje historyczne zmiany całkowitej wartości netto w czasie.
- Wykres może opcjonalnie pokazywać podział na wartość pochodzącą z wpłat/wypłat i wartość wypracowaną przez inwestycje.

### 3.3. Interfejs tabelaryczny (Zarządzanie danymi)

- Główny widok do zarządzania danymi ma formę siatki przypominającej arkusz kalkulacyjny.
- Wiersze reprezentują poszczególne konta (aktywa lub pasywa).
- Kolumny reprezentują daty, dla których wprowadzono wartości.
- Użytkownik może dodać nową kolumnę z danymi dla bieżącego dnia. Nowa kolumna automatycznie kopiuje wartości z ostatniej istniejącej kolumny.
- Użytkownik może edytować wartość dowolnego konta w dowolnej komórce (data historyczna lub bieżąca).
- Przy edycji wartości konta, użytkownik może wprowadzić dane na trzy sposoby:
  1.  **Tylko nową wartość**: System automatycznie przypisuje zmianę do wpłaty lub zysku w zależności od typu konta (Aktywo gotówkowe/Pasywo → wpłata; Aktywo inwestycyjne → zysk).
  2.  **Nową wartość + wpłatę/wypłatę**: System automatycznie oblicza zysk/stratę jako różnicę (zysk = nowa wartość - poprzednia wartość - wpłata).
  3.  **Nową wartość + wpłatę + zysk/stratę**: System waliduje spójność danych (poprzednia wartość + wpłata + zysk = nowa wartość).
- Interfejs edycji oferuje:
  - Pole "Nowa wartość" (wymagane).
  - Pole "Wpłata/Wypłata" (opcjonalne, domyślnie 0 dla aktywów inwestycyjnych lub obliczone dla aktywów gotówkowych/pasywów).
  - Pole "Zysk/Strata" (opcjonalne, domyślnie 0 dla aktywów gotówkowych/pasywów lub obliczone dla aktywów inwestycyjnych, można nadpisać).
- Jeśli użytkownik ręcznie wpisze wszystkie trzy wartości, system waliduje ich spójność przed zapisem.
- Wszystkie zmiany w komórkach są zapisywane automatycznie w tle. Dyskretny wskaźnik wizualny informuje użytkownika o stanie zapisu (np. "Zapisywanie...", "Zapisano").
- Komórki edytowalne wizualnie sygnalizują możliwość edycji po najechaniu na nie kursorem (np. zmiana tła, ikona ołówka).
- Pola do wprowadzania wartości akceptują tylko dane liczbowe. Wartości pasywów wprowadza się jako liczby dodatnie.
- Tabela zawiera wiersz podsumowania na dole, który pokazuje sumę aktywów, pasywów oraz wartość netto dla każdej kolumny (daty).
- **Automatyczne przepisywanie wartości (forward-fill)**: Gdy użytkownik dodaje nowe konto z datą początkową wcześniejszą niż istniejące kolumny w siatce, system automatycznie przepisuje wartość początkową konta dla wszystkich późniejszych dat, dla których nie istnieje wpis w bazie danych. Dzięki temu użytkownik widzi ciągłość wartości zamiast pustych komórek ("-"). Dla dat wcześniejszych niż data początkowa konta wyświetlane jest "-", ponieważ konto wtedy nie istniało.
  - **Przykład**: Użytkownik ma konto "portfel" z datą początkową 01.01.2025 i wartością 200 zł. Następnie dodaje konto "bank" z datą początkową 10.10.2024 i wartością początkową 5000 zł. Dla konta "bank" i daty 01.01.2025 zostanie automatycznie wyświetlona wartość 5000 zł (przepisana z wartości początkowej), a nie "-". Natomiast dla konta "portfel" i daty 10.10.2024 będzie widoczne "-", ponieważ konto wtedy nie istniało.

### 3.4. Zarządzanie kontami finansowymi (Aktywa/Pasywa)

- Użytkownik może dodawać nowe konta, określając ich:
  - Nazwę (np. "mBank", "Portfel", "XTB").
  - Typ konta, który determinuje domyślne zachowanie przy edycji wartości:
    - **Aktywo inwestycyjne** - wartość zmienia się samoistnie w czasie (akcje, fundusze, kryptowaluty, nieruchomości). Zmiana wartości domyślnie = zysk/strata (wpłata = 0).
    - **Aktywo gotówkowe** - wartość stała, zmienia się tylko przez wpłaty/wypłaty (portfel, konto bankowe, gotówka w sejfie). Zmiana wartości domyślnie = wpłata/wypłata (zysk = 0).
    - **Pasywo** - zobowiązanie (kredyt, pożyczka, dług). Zmiana wartości domyślnie = wpłata/wypłata (zysk = 0). Zmniejszenie wartości pasywa (np. spłata części kredytu) jest interpretowane jako dodatni przepływ pieniężny (wpłata), ponieważ zwiększa to wartość netto użytkownika. Zwiększenie wartości pasywa (np. zaciągnięcie nowego długu) jest interpretowane jako ujemny przepływ (wypłata).
- Typ konta wpływa na domyślne przypuszczenie systemu przy edycji:
  - Dla **Aktywów gotówkowych** i **Pasywów**: jeśli użytkownik poda tylko nową wartość, system zakłada, że cała zmiana to wpłata/wypłata (zysk = 0).
  - Dla **Aktywów inwestycyjnych**: jeśli użytkownik poda tylko nową wartość, system zakłada, że cała zmiana to zysk/strata (wpłata = 0).
- Użytkownik zawsze może ręcznie zmienić podział na wpłaty i zyski niezależnie od typu konta.
- Typy kont są wizualnie rozróżnione w tabeli (np. kolor tła, ikony) w celu zapewnienia czytelności i dostępności.
- Użytkownik może zarchiwizować konto. Zarchiwizowane konto jest wyszarzone i ukryte z domyślnego widoku tabeli, ale jego historyczne dane nadal są uwzględniane na wykresie wartości netto. Operacja wymaga potwierdzenia w oknie dialogowym.
- Użytkownik może trwale usunąć konto. Usunięcie konta powoduje skasowanie całej jego historii wartości i jest operacją nieodwracalną. Operacja wymaga potwierdzenia w oknie dialogowym.
- Użytkownik może zmienić typ istniejącego konta pomiędzy "Aktywo inwestycyjne" a "Aktywo gotówkowe". Zmiana typu nie wpływa na historyczne wpisy, a jedynie na domyślne zachowanie aplikacji przy tworzeniu nowych wpisów w przyszłości.

### 3.5. Stany puste i onboarding

- Aplikacja posiada zaprojektowany "pusty stan" dla nowych użytkowników (lub po usunięciu wszystkich kont), który zawiera jasny komunikat i przycisk wzywający do działania (np. "+ Dodaj nowe konto"), aby poprowadzić użytkownika do wykonania pierwszej akcji.

### 3.6. Zbieranie opinii

- W stopce aplikacji znajdują się dwa elementy:
  1.  Link do prostej ankiety (3-4 pytania) w celu zebrania opinii na temat użyteczności i brakujących funkcji. Link otwiera się w nowej karcie przeglądarki.
  2.  Element tekstowy z adresem e-mail kontaktowym, umożliwiający łatwe skopiowanie adresu do schowka i bezpośredni kontakt z użyciem dowolnego klienta poczty.

### 3.7. Responsywność i interfejs mobilny

- Interfejs aplikacji jest w pełni responsywny i dostosowuje się do różnych rozmiarów ekranu (desktop, tablet, telefon).
- Na urządzeniach mobilnych:
  - Tabela danych jest scrollowalna poziomo, aby umożliwić przeglądanie wszystkich kolumn (dat).
  - Kluczowe akcje (dodawanie konta, dodawanie kolumny z datą) są łatwo dostępne poprzez przyciski dostosowane do interakcji dotykowych (większe obszary klikalne).
  - Edycja wartości w komórkach tabeli jest możliwa poprzez dotknięcie komórki, co aktywuje natywną klawiaturę numeryczną.
  - Wykres wartości netto jest responsywny i czytelny na małych ekranach.
  - Menu i opcje nawigacji są dostępne poprzez hamburger menu lub dolny pasek nawigacyjny.
  - Formularze i modale są optymalizowane pod kątem małych ekranów (pełna szerokość, czytelne czcionki, odpowiednie odstępy).

### 3.8. Wymagania niefunkcjonalne

- Waluta: Aplikacja obsługuje jedną walutę (PLN). Interfejs nie wyświetla symbolu waluty, ale baza danych jest przygotowana na jego dodanie w przyszłości.
- Bezpieczeństwo: Wszystkie dane użytkownika są szyfrowane w spoczynku i podczas przesyłania (at-rest, in-transit) z wykorzystaniem mechanizmów platformy Supabase.
- Platforma: Aplikacja jest przeznaczona do użytku na przeglądarkach internetowych zarówno na komputerach stacjonarnych, jak i na urządzeniach mobilnych (telefony, tablety).

## 4. Granice produktu

Następujące funkcje i elementy są świadomie wyłączone z zakresu MVP, aby zapewnić terminowe dostarczenie produktu:

- Brak obsługi wielu walut i automatycznego przeliczania kursów.
- Brak automatycznych integracji z bankami, giełdami i innymi instytucjami finansowymi. Wszystkie dane są wprowadzane wyłącznie ręcznie.
- Brak natywnej aplikacji mobilnej (iOS/Android). MVP oferuje responsywną aplikację webową dostępną w przeglądarce mobilnej.
- Brak możliwości przywrócenia (cofnięcia archiwizacji) zarchiwizowanego konta.
- Brak zaawansowanych narzędzi analitycznych i raportów poza głównym wykresem wartości netto.
- Brak ostatecznego projektu logo. Na potrzeby MVP zostanie użyte proste logo tekstowe.

## 5. Historyjki użytkowników

### Autentykacja i Onboarding

- ID: US-001
- Tytuł: Rejestracja nowego użytkownika
- Opis: Jako nowy odwiedzający, chcę móc założyć konto w aplikacji używając mojego adresu e-mail i hasła, abym mógł zacząć śledzić moje finanse.
- Kryteria akceptacji:
  - Formularz rejestracji zawiera pola na adres e-mail i hasło.
  - System waliduje poprawność formatu adresu e-mail.
  - System sprawdza, czy użytkownik o danym e-mailu już nie istnieje.
  - Po pomyślnej rejestracji, na podany adres e-mail wysyłana jest wiadomość z linkiem aktywacyjnym.
  - Użytkownik jest informowany, że musi potwierdzić swój adres e-mail.

- ID: US-002
- Tytuł: Potwierdzenie adresu e-mail
- Opis: Jako nowo zarejestrowany użytkownik, chcę potwierdzić mój adres e-mail klikając w link, aby aktywować moje konto i uzyskać możliwość logowania.
- Kryteria akceptacji:
  - Po kliknięciu w link aktywacyjny, status konta użytkownika w systemie zmienia się na "aktywny".
  - Użytkownik jest przekierowywany na stronę logowania z komunikatem o pomyślnej aktywacji konta.
  - Link aktywacyjny jest jednorazowy i/lub ma ograniczony czas ważności.

- ID: US-003
- Tytuł: Logowanie do aplikacji
- Opis: Jako zarejestrowany użytkownik, chcę móc zalogować się na moje konto podając e-mail i hasło, aby uzyskać dostęp do mojego pulpitu.
- Kryteria akceptacji:
  - Formularz logowania zawiera pola na e-mail i hasło.
  - Po poprawnym uwierzytelnieniu, jestem przekierowany na mój pulpit (dashboard).
  - W przypadku podania błędnych danych, wyświetlany jest stosowny komunikat o błędzie.
  - Logowanie jest niemożliwe dla konta, które nie zostało aktywowane.

- ID: US-004
- Tytuł: Pierwsze logowanie i pusty stan
- Opis: Jako nowy użytkownik, po pierwszym zalogowaniu chcę zobaczyć czytelny interfejs, który pokieruje mnie, jak dodać moje pierwsze aktywo lub pasywo.
- Kryteria akceptacji:
  - Po zalogowaniu na puste konto, pulpit i tabela danych są puste.
  - Na środku ekranu widoczny jest komunikat powitalny oraz przycisk/link "+ Dodaj nowe konto".
  - Wykres wartości netto jest pusty i wyświetla informację, że potrzebne są dane.
- ID: US-016
- Tytuł: Odzyskiwanie hasła
- Opis: Jako użytkownik, który zapomniał hasła, chcę mieć możliwość jego zresetowania, aby odzyskać dostęp do mojego konta.
- Kryteria akceptacji:
  - Na stronie logowania znajduje się link "Zapomniałem hasła".
  - Po kliknięciu w link, użytkownik jest proszony o podanie adresu e-mail powiązanego z kontem.
  - Po podaniu e-maila, na adres użytkownika wysyłana jest wiadomość z unikalnym linkiem do zresetowania hasła.
  - Link do resetowania hasła prowadzi do formularza, w którym można ustawić nowe hasło.
  - Po pomyślnym ustawieniu nowego hasła, użytkownik może zalogować się przy jego użyciu.
  - Link do resetowania hasła jest jednorazowy i ma ograniczony czas ważności.

### Zarządzanie kontami finansowymi

- ID: US-005
- Tytuł: Dodawanie nowego konta z typem
- Opis: Jako użytkownik, chcę móc dodać nowe konto, podając jego nazwę, typ (Aktywo inwestycyjne, Aktywo gotówkowe lub Pasywo) i początkową wartość, aby rozpocząć śledzenie.
- Kryteria akceptacji:
  - Istnieje przycisk "+ Dodaj nowe konto", który otwiera formularz/modal.
  - Formularz zawiera:
    - Pole na nazwę konta.
    - Wybór typu konta: Aktywo inwestycyjne, Aktywo gotówkowe, lub Pasywo.
    - Pole na wartość początkową.
  - Po dodaniu, nowe konto pojawia się jako nowy wiersz w tabeli.
  - Typ konta jest zapisany i będzie wpływać na domyślne zachowanie przy edycji wartości.
  - Pulpit i wykres są aktualizowane o wartość nowego konta.

- ID: US-006
- Tytuł: Archiwizacja konta
- Opis: Jako użytkownik, chcę móc zarchiwizować konto, którego już aktywnie nie używam (np. spłacony kredyt), aby ukryć je z głównego widoku, ale zachować jego dane w historii.
- Kryteria akceptacji:
  - Przy każdym koncie w tabeli istnieje opcja "Archiwizuj".
  - Po kliknięciu opcji, pojawia się okno dialogowe z prośbą o potwierdzenie.
  - Po potwierdzeniu, konto znika z aktywnej listy w tabeli (lub zostaje wyszarzone i przeniesione na dół).
  - Dane z zarchiwizowanego konta nadal są uwzględniane w obliczeniach historycznych na wykresie i w wierszu podsumowania.

- ID: US-007
- Tytuł: Trwałe usuwanie konta
- Opis: Jako użytkownik, chcę móc trwale usunąć konto wraz z całą jego historią, jeśli zostało dodane przez pomyłkę lub nie jest już potrzebne.
- Kryteria akceptacji:
  - Przy każdym koncie istnieje opcja "Usuń".
  - Po kliknięciu, pojawia się okno dialogowe z wyraźnym ostrzeżeniem, że operacja jest nieodwracalna, i prośbą o potwierdzenie.
  - Po potwierdzeniu, konto i wszystkie powiązane z nim historyczne wartości są trwale usuwane z bazy danych.
  - Pulpit, wykres i podsumowania są natychmiast aktualizowane.

### Zarządzanie danymi i wizualizacja

- ID: US-008
- Tytuł: Dodawanie wpisu z wartościami dla bieżącego dnia
- Opis: Jako użytkownik, chcę mieć prostą możliwość dodania nowej kolumny z dzisiejszą datą, aby szybko zaktualizować stan moich finansów.
- Kryteria akceptacji:
  - Istnieje przycisk "Dodaj dzisiejszą kolumnę" (lub podobny).
  - Po kliknięciu, do tabeli dodawana jest nowa kolumna z bieżącą datą.
  - Wartości w nowej kolumnie są automatycznie wypełniane wartościami z ostatniej istniejącej kolumny.
  - Jeśli jest to pierwsza kolumna, wartości są ustawiane na 0 lub wartości początkowe kont.

- ID: US-009
- Tytuł: Edycja wartości konta z automatycznym podziałem na wpłaty i zyski
- Opis: Jako użytkownik, chcę móc zaktualizować wartość konta w prosty sposób, a system automatycznie obliczy podział na wpłaty i zyski w zależności od typu konta, z możliwością ręcznego doprecyzowania.
- Kryteria akceptacji:
  - Najazd kursorem na komórkę z wartością zmienia jej wygląd, sugerując możliwość edycji.
  - Kliknięcie w komórkę otwiera formularz z trzema polami:
    1. "Nowa wartość" (wymagane, puste pole do wypełnienia).
    2. "Wpłata/Wypłata" (opcjonalne).
    3. "Zysk/Strata" (opcjonalne).
  - System automatycznie oblicza wartości w zależności od typu konta:
    - **Aktywo gotówkowe/Pasywo**: Jeśli podano tylko nową wartość, cała zmiana trafia do "Wpłata/Wypłata", "Zysk/Strata" = 0. W przypadku pasywów, logika jest odwrotna: zmniejszenie wartości długu (np. z 1000 zł do 700 zł) jest traktowane jako dodatnia wpłata (+300 zł), ponieważ zwiększa to majątek netto.
    - **Aktywo inwestycyjne**: Jeśli podano tylko nową wartość, cała zmiana trafia do "Zysk/Strata", "Wpłata/Wypłata" = 0.
  - Gdy użytkownik wpisuje nową wartość i wpłatę, pole "Zysk/Strata" automatycznie się aktualizuje: zysk = nowa wartość - poprzednia wartość - wpłata.
  - Użytkownik może ręcznie edytować wszystkie pola niezależnie od typu konta.
  - Jeśli użytkownik ręcznie zmieni wszystkie trzy pola, system waliduje spójność przed zapisem.
  - Jeśli walidacja nie przechodzi, wyświetlany jest komunikat o błędzie z wyjaśnieniem.
  - Po zatwierdzeniu, zmiana jest automatycznie zapisywana.
  - Wskaźnik zapisu informuje o statusie operacji.
  - Po zapisaniu, wszystkie sumy (pulpit, wiersz podsumowania) oraz wykres są aktualizowane z uwzględnieniem podziału na wpłaty i zyski.

- ID: US-010
- Tytuł: Przeglądanie pulpitu z podziałem na wpłaty i zyski dla wybranego okresu
- Opis: Jako użytkownik, chcę po zalogowaniu widzieć na pulpicie kluczowe wskaźniki finansowe (KPI) dla wybranego przeze mnie okresu czasu, aby móc porównywać różne okresy (np. poszczególne lata, kwartały).
- Kryteria akceptacji:
  - Pulpit jest domyślnym widokiem po zalogowaniu.
  - KPI są obliczane dla **wybranego zakresu dat** widocznego w siatce danych:
    - **Wartość netto**: Stan na **koniec wybranego okresu** (ostatnia data w zakresie) = suma aktywów - suma pasywów
    - **Suma aktywów**: Stan na **koniec wybranego okresu** (ostatnia data w zakresie)
    - **Suma pasywów**: Stan na **koniec wybranego okresu** (ostatnia data w zakresie)
    - **Skumulowane wpłaty/wypłaty**: **Suma wszystkich przepływów** w wybranym okresie
    - **Skumulowane zyski/straty**: **Suma wszystkich zysków/strat** w wybranym okresie
  - Zmiana zakresu dat w siatce automatycznie aktualizuje wszystkie KPI.
  - KPI są zawsze zsynchronizowane z danymi widocznymi w siatce, co zapewnia spójność widoku.
  - Ta synchronizacja pozwala użytkownikowi na porównywanie różnych okresów - np. zmiana zakresu na rok 2023 pokaże KPI dla 2023, zmiana na 2024 pokaże KPI dla 2024.
  - Wykres liniowy poprawnie renderuje dane historyczne wartości netto dla wybranego okresu.
  - Wykres może opcjonalnie pokazywać podział na wartość pochodzącą z wpłat/wypłat i wartość wypracowaną przez inwestycje.
  - Oś X wykresu reprezentuje czas (daty), a oś Y reprezentuje wartość netto.

- ID: US-017
- Tytuł: Usuwanie kolumny z przypadkowo dodaną datą
- Opis: Jako użytkownik, chcę móc usunąć całą kolumnę (datę) wraz z wszystkimi wpisami, jeśli dodałem ją przez pomyłkę, aby skorygować błędy w danych i utrzymać porządek w historii finansowej.
- Kryteria akceptacji:
  - W nagłówku każdej kolumny (daty) znajduje się menu kontekstowe z opcjami zarządzania.
  - Menu zawiera opcję "Usuń kolumnę".
  - Po wybraniu opcji usunięcia, system wyświetla dialog potwierdzenia z wyraźnym ostrzeżeniem o nieodwracalności operacji.
  - Dialog informuje, że operacja usunie wszystkie wpisy wartości dla tej daty dla wszystkich kont użytkownika.
  - Po potwierdzeniu przez użytkownika, wszystkie wpisy wartości (value_entries) dla tej daty są trwale usuwane z bazy danych.
  - Kolumna natychmiast znika z interfejsu tabeli.
  - System automatycznie odświeża dane na pulpicie, wykresie i w wierszu podsumowania.
  - Użytkownik otrzymuje potwierdzenie sukcesu operacji z informacją o liczbie usuniętych wpisów.
  - Nie ma ograniczenia dotyczącego usuwania ostatniej kolumny - użytkownik może usunąć wszystkie kolumny i dodać nowe w dowolnym momencie.
  - Operacja jest nieodwracalna - nie ma możliwości przywrócenia usuniętych danych.

### Responsywność i mobilność

- ID: US-013
- Tytuł: Przeglądanie aplikacji na telefonie
- Opis: Jako użytkownik korzystający z telefonu, chcę mieć dostęp do wszystkich funkcji aplikacji w wygodny sposób, aby móc zarządzać swoimi finansami w dowolnym miejscu.
- Kryteria akceptacji:
  - Wszystkie elementy interfejsu (przyciski, formularze, tabele) są czytelne i dostępne na ekranie telefonu.
  - Tabela z danymi jest scrollowalna poziomo, umożliwiając przeglądanie wszystkich kolumn z datami.
  - Przyciski są wystarczająco duże, aby można było w nie łatwo trafić palcem (minimum 44x44px).
  - Wykres wartości netto dostosowuje się do szerokości ekranu i pozostaje czytelny.
  - Nawigacja jest intuicyjna i dostępna (np. hamburger menu lub dolny pasek nawigacyjny).

- ID: US-014
- Tytuł: Edycja wartości na urządzeniu dotykowym
- Opis: Jako użytkownik telefonu, chcę móc łatwo edytować wartości w tabeli, używając klawiatury dotykowej.
- Kryteria akceptacji:
  - Dotknięcie komórki z wartością aktywuje pole edycji.
  - Automatycznie pojawia się klawiatura numeryczna (input type="number" lub inputmode="numeric").
  - Pole edycji jest wystarczająco duże, aby komfortowo wprowadzać dane.
  - Po zatwierdzeniu wartości (np. blur lub Enter), zmiana jest zapisywana automatycznie.

- ID: US-015
- Tytuł: Dodawanie konta na telefonie
- Opis: Jako użytkownik telefonu, chcę móc dodać nowe konto finansowe w prosty sposób, używając formularza zoptymalizowanego pod ekran dotykowy.
- Kryteria akceptacji:
  - Formularz dodawania konta zajmuje pełną szerokość ekranu na urządzeniach mobilnych.
  - Wszystkie pola formularza są czytelne i łatwe do wypełnienia.
  - Przełącznik typu konta (aktywo/pasywo) jest duży i łatwy do użycia na ekranie dotykowym.
  - Klawiatura dostosowuje się do typu pola (numeryczna dla wartości, standardowa dla nazwy).

### Zarządzanie kontem i feedback

- ID: US-011
- Tytuł: Usuwanie konta użytkownika
- Opis: Jako użytkownik, chcę mieć możliwość trwałego usunięcia mojego konta i wszystkich moich danych z aplikacji.
- Kryteria akceptacji:
  - W ustawieniach konta użytkownika znajduje się opcja "Usuń konto".
  - Po kliknięciu, pojawia się okno modalne z prośbą o potwierdzenie operacji poprzez wpisanie hasła.
  - Po poprawnym podaniu hasła i potwierdzeniu, wszystkie dane użytkownika (konto, aktywa, pasywa, historia) są trwale usuwane.
  - Użytkownik jest automatycznie wylogowywany i nie może się już zalogować na to konto.

- ID: US-012
- Tytuł: Przekazywanie opinii
- Opis: Jako użytkownik, chcę mieć łatwy dostęp do sposobu przekazania mojej opinii lub zgłoszenia problemu, aby pomóc w rozwoju aplikacji.
- Kryteria akceptacji:
  - W stopce aplikacji stale widoczne są dwa elementy: link "Przekaż opinię" i element kontaktowy.
  - Link "Przekaż opinię" otwiera zewnętrzną ankietę (Google Forms) w nowej karcie przeglądarki (target="_blank", rel="noopener noreferrer").
  - Element kontaktowy wyświetla widoczny tekst "Kontakt:" oraz adres e-mail (assetly.mail@gmail.com) z możliwością łatwego zaznaczenia i skopiowania.
  - Stopka jest widoczna na wszystkich stronach aplikacji, w tym na stronach autentykacji (logowanie, rejestracja), aby umożliwić kontakt nawet użytkownikom z problemami z dostępem.
  - Stopka jest w pełni responsywna: na urządzeniach mobilnych elementy układają się w kolumnę, na desktopie w wiersz z separatorem wizualnym.

## 6. Metryki sukcesu

### 6.1. Kryteria sukcesu MVP

- Dostarczenie działającej aplikacji webowej, która realizuje wszystkie wymienione wymagania funkcjonalne, w ciągu 6 tygodni.
- Aplikacja jest stabilna i pozwala na bezbłędne wykonywanie kluczowych operacji (CRUD na kontach i wartościach).

### 6.2. Kluczowe wskaźniki efektywności (KPI)

- Zaangażowanie użytkowników: Celem jest osiągnięcie wskaźnika, w którym przeciętny aktywny użytkownik wykonuje co najmniej jedną aktualizację wartości swoich kont w miesiącu (>=1).
- Retencja użytkowników: Śledzenie, jaki procent użytkowników powraca do aplikacji po pierwszym tygodniu od rejestracji.

### 6.3. Jakościowe miary sukcesu

- Jakość i prostota (ankieta): Zbieranie jakościowych opinii za pomocą ankiety w celu mierzenia postrzeganej łatwości obsługi, satysfakcji oraz identyfikacji najbardziej pożądanych nowych funkcji. Wyniki ankiety będą kluczowym wkładem w planowanie kolejnych iteracji produktu.

### 6.4. Zidentyfikowane ryzyka

- Ryzyko harmonogramu vs. technologia: Istnieje zidentyfikowane ryzyko związane z napiętym, 6-tygodniowym terminem wdrożenia MVP przy jednoczesnym wykorzystaniu projektu do nauki nowego stosu technologicznego (Astro, React, Tailwind). Zespół akceptuje to ryzyko, priorytetyzując bezwzględnie minimalny zakres funkcjonalny.
- Projekt logo: Ostateczny projekt logo "Assetly" nie jest częścią MVP. Zostanie użyte tymczasowe logo tekstowe, co jest akceptowalnym kompromisem.
