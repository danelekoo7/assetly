# Architektura UI dla Assetly

## 1. Przegląd struktury UI

Architektura interfejsu użytkownika (UI) dla Assetly została zaprojektowana w oparciu o koncepcję zintegrowanego pulpitu (Integrated Dashboard), który pełni rolę centrum zarządzania finansami użytkownika. Zamiast wielu oddzielnych stron, aplikacja po zalogowaniu prezentuje jeden, dynamiczny widok, który łączy kluczowe wskaźniki (KPIs), interaktywny wykres oraz siatkę danych przypominającą arkusz kalkulacyjny. Takie podejście minimalizuje nawigację i zapewnia natychmiastowy dostęp do wszystkich kluczowych informacji i funkcji.

Interfejs będzie w pełni responsywny, zoptymalizowany pod kątem zarówno urządzeń desktopowych, jak i mobilnych. Do budowy komponentów zostanie wykorzystana biblioteka `shadcn/ui` oparta na `Tailwind CSS`, co zapewni spójność wizualną, dostępność oraz wsparcie dla trybu ciemnego od samego początku. Zarządzanie stanem po stronie klienta będzie realizowane za pomocą lekkiej biblioteki `Zustand`, co umożliwi implementację optymistycznych aktualizacji UI i zapewni wysoką responsywność interfejsu.

Interakcje takie jak dodawanie konta czy edycja wartości będą odbywać się w oknach modalnych (`Dialog`), aby nie odrywać użytkownika od głównego kontekstu pulpitu.

## 2. Lista widoków

Aplikacja składa się z głównych widoków statycznych (stron) oraz widoków dynamicznych renderowanych jako komponenty lub modale w obrębie zintegrowanego pulpitu.

### Widoki statyczne (Strony)

- **Nazwa widoku**: Logowanie
- **Ścieżka widoku**: `/login`
- **Główny cel**: Uwierzytelnienie istniejącego użytkownika.
- **Kluczowe informacje do wyświetlenia**: Formularz z polami na e-mail i hasło.
- **Kluczowe komponenty widoku**: `Card`, `Input`, `Button`, `Label`.
- **UX, dostępność i względy bezpieczeństwa**: Komunikaty o błędach (np. "Błędne dane logowania") wyświetlane inline. Pola formularza poprawnie oetykietowane dla czytników ekranu.

---

- **Nazwa widoku**: Rejestracja
- **Ścieżka widoku**: `/register`
- **Główny cel**: Utworzenie nowego konta użytkownika.
- **Kluczowe informacje do wyświetlenia**: Formularz z polami na e-mail i hasło.
- **Kluczowe komponenty widoku**: `Card`, `Input`, `Button`, `Label`.
- **UX, dostępność i względy bezpieczeństwa**: Walidacja formatu adresu e-mail po stronie klienta. Wymagania dotyczące siły hasła.

---

- **Nazwa widoku**: Oczekiwanie na potwierdzenie e-mail
- **Ścieżka widoku**: `/auth/check-email`
- **Główny cel**: Poinformowanie użytkownika o konieczności aktywacji konta poprzez link w e-mailu.
- **Kluczowe informacje do wyświetlenia**: Statyczny tekst informacyjny.
- **Kluczowe komponenty widoku**: Komponent tekstowy.

---

- **Nazwa widoku**: Konto potwierdzone
- **Ścieżka widoku**: `/auth/confirmed`
- **Główny cel**: Potwierdzenie pomyślnej aktywacji konta i skierowanie do logowania.
- **Kluczowe informacje do wyświetlenia**: Statyczny tekst z gratulacjami i link do strony logowania.
- **Kluczowe komponenty widoku**: Komponent tekstowy, `Button` (jako link).

### Główny widok aplikacji

- **Nazwa widoku**: Zintegrowany Pulpit
- **Ścieżka widoku**: `/` (po zalogowaniu)
- **Główny cel**: Centralne miejsce do przeglądania, dodawania i zarządzania danymi finansowymi.
- **Kluczowe informacje do wyświetlenia**:
  - Wskaźniki KPI (Wartość netto, Aktywa, Pasywa) z `GET /dashboard/summary`.
  - Wykres historyczny wartości netto z `GET /grid-data`.
  - Siatka danych (konta vs daty) z `GET /grid-data`.
  - Wiersz podsumowania w siatce.
- **Kluczowe komponenty widoku**:
  - Sekcja KPI: `Card`, `Skeleton` (ładowanie).
  - Pasek narzędzi: `DateRangePicker`, `Button` (+ Dodaj konto, + Dodaj kolumnę), `Switch` (Pokaż zarchiwizowane).
  - Wykres: Komponent wykresu (`Recharts`), `ToggleGroup` (do przełączania serii danych).
  - Siatka danych: Niestandardowy komponent oparty na `div` z `role="grid"`, `DropdownMenu` (dla akcji na koncie), `Popover` z `Calendar` (do dodawania kolumny).
- **UX, dostępność i względy bezpieczeństwa**:
  - **UX**: Optymistyczne aktualizacje po edycji komórki. Stany ładowania obsługiwane przez `Skeleton`. Płynne animacje przy interakcjach. Wskaźnik zapisu komórki.
  - **UX**: Optymistyczne aktualizacje po edycji komórki i zmianie kolejności kont. Stany ładowania obsługiwane przez `Skeleton`. Płynne animacje przy interakcjach. Wskaźnik zapisu komórki.
  - **Dostępność**: Pierwsza kolumna siatki ("Konto") jest "lepka" (sticky). Semantyczny HTML (`role="grid"`). Typy kont rozróżnione ikoną/tekstem, a nie tylko kolorem. Interakcja `drag-and-drop` ma odpowiedniki klawiaturowe.
  - **Bezpieczeństwo**: Wszystkie dane pobierane w kontekście zalogowanego użytkownika (RLS).

### Widoki modalne (Komponenty React)

- **Nazwa widoku**: Modal Dodawania/Edycji Konta
- **Ścieżka widoku**: (wyświetlany nad pulpitem)
- **Główny cel**: Tworzenie nowego lub edycja istniejącego konta.
- **Kluczowe informacje do wyświetlenia**: Formularz z polami: Nazwa, Typ konta, Wartość początkowa (tylko przy tworzeniu).
- **Kluczowe komponenty widoku**: `Dialog`, `Input`, `Select`, `Button`.
- **UX, dostępność i względy bezpieczeństwa**: Walidacja (min. 3 znaki, unikalność nazwy) z komunikatami inline. Fokus zarządzany po otwarciu/zamknięciu modala.

---

- **Nazwa widoku**: Modal Edycji Wartości
- **Ścieżka widoku**: (wyświetlany nad pulpitem)
- **Główny cel**: Aktualizacja wartości konta w danym dniu.
- **Kluczowe informacje do wyświetlenia**: Formularz z polami: "Nowa wartość", "Wpłata/Wypłata", "Zysk/Strata".
- **Kluczowe komponenty widoku**: `Dialog`, `Input` (typu number), `Button`.
- **UX, dostępność i względy bezpieczeństwa**: Logika automatycznego obliczania pól w zależności od typu konta i wprowadzonych danych. Walidacja spójności danych (`wartość = poprzednia + wpłata + zysk`).

---

- **Nazwa widoku**: Dialog Potwierdzenia Akcji Destrukcyjnej
- **Ścieżka widoku**: (wyświetlany nad pulpitem)
- **Główny cel**: Zapobieganie przypadkowemu usunięciu lub archiwizacji konta.
- **Kluczowe informacje do wyświetlenia**: Wyraźne ostrzeżenie o nieodwracalności operacji.
- **Kluczowe komponenty widoku**: `AlertDialog`, `Button` (w wariancie `destructive`).
- **UX, dostępność i względy bezpieczeństwa**: Fokus skierowany na przycisk anulowania. Przycisk potwierdzający jest wyraźnie oznaczony jako akcja destrukcyjna.

## 3. Mapa podróży użytkownika

### Główny przepływ (Onboarding i pierwsze użycie)

1.  **Rejestracja**: Użytkownik trafia na `/register`, tworzy konto.
2.  **Aktywacja**: Jest przekierowany na `/auth/check-email` i klika link aktywacyjny w swojej skrzynce pocztowej.
3.  **Logowanie**: Ląduje na `/auth/confirmed`, przechodzi do `/login` i loguje się.
4.  **Pusty stan**: Widzi Zintegrowany Pulpit w stanie pustym, z wyraźnym wezwaniem do działania: `+ Dodaj nowe konto`.
5.  **Dodanie pierwszego konta**: Klika przycisk, otwiera się **Modal Dodawania Konta**. Wprowadza nazwę, typ i wartość początkową.
6.  **Aktualizacja UI**: Po zapisie modal znika, a siatka danych, KPI i wykres zostają zaktualizowane.
7.  **Wskazówka (Guidance)**: Pojawia się `Tooltip` lub `Popover`, który wskazuje na przycisk `+ Dodaj kolumnę`, sugerując następny krok.
8.  **Dodanie nowej kolumny**: Użytkownik klika przycisk, wybiera datę w kalendarzu, a nowa kolumna jest dodawana do siatki z wartościami skopiowanymi z poprzedniego dnia.
9.  **Edycja wartości**: Użytkownik klika na komórkę w siatce, co otwiera **Modal Edycji Wartości**. Wprowadza nową wartość, a reszta pól oblicza się automatycznie.
10. **Zmiana kolejności kont**: Użytkownik chwyta za uchwyt przy nazwie konta i przeciąga wiersz w nowe miejsce. UI aktualizuje się natychmiast.
11. **Zapis optymistyczny**: Po kliknięciu "Zapisz" w modalu lub po upuszczeniu wiersza, UI natychmiast się aktualizuje, a w tle wysyłane jest żądanie do API. Komórka pokazuje subtelny wskaźnik statusu zapisu.

### Przepływ zarządzania kontem

1.  Użytkownik klika ikonę "..." przy nazwie konta w siatce.
2.  Otwiera się `DropdownMenu` z opcjami "Archiwizuj" i "Usuń".
3.  Po wybraniu jednej z opcji, pojawia się **Dialog Potwierdzenia** z odpowiednim komunikatem.
4.  Po potwierdzeniu, konto jest archiwizowane (znika z widoku, jeśli przełącznik "Pokaż zarchiwizowane" jest wyłączony) lub trwale usuwane. UI natychmiast się aktualizuje.

## 4. Układ i struktura nawigacji

Nawigacja w aplikacji jest celowo zminimalizowana, aby skupić użytkownika na zarządzaniu danymi.

- **Nawigacja globalna (po zalogowaniu)**:
  - Składa się z pojedynczego nagłówka (`Header`).
  - Po lewej stronie znajduje się logo aplikacji (działające jako link do `/`).
  - Po prawej stronie znajduje się menu użytkownika, dostępne po kliknięciu na `Avatar`.
  - Menu użytkownika (`DropdownMenu`) zawiera:
    - Adres e-mail użytkownika.
    - Przełącznik trybu Jasny/Ciemny.
    - Opcję "Ustawienia" (otwierającą modal do zarządzania profilem, np. usunięcia konta).
    - Przycisk "Wyloguj".
- **Stopka (Footer)**:
  - Znajduje się na dole każdej strony aplikacji (zarówno po zalogowaniu, jak i na stronach autentykacji).
  - Zawiera dwa elementy:
    - Link "Przekaż opinię" prowadzący do zewnętrznej ankiety Google Forms (otwiera się w nowej karcie).
    - Element kontaktowy: "Kontakt: assetly.mail@gmail.com" (tekst z możliwością łatwego zaznaczenia i skopiowania).
  - Responsywność: na urządzeniach mobilnych elementy układają się w kolumnę, na desktop w wiersz z separatorem.
- **Nawigacja na urządzeniach mobilnych**:
  - Układ pozostaje ten sam: nagłówek z logo i menu użytkownika. Jest to proste i efektywne dla aplikacji opartej na jednym głównym widoku.
  - Główna siatka danych jest przewijana horyzontalnie, aby umożliwić dostęp do wszystkich kolumn z datami.
  - Stopka pozostaje widoczna na dole ekranu ze zoptymalizowanym układem kolumnowym.

## 5. Kluczowe komponenty

Poniżej znajduje się lista kluczowych, reużywalnych komponentów UI, które będą stanowić podstawę interfejsu, w większości bazując na `shadcn/ui`.

- **`Footer`**: Reużywalny komponent Astro (`src/components/Footer.astro`) wyświetlający stopkę z linkami do zbierania opinii i kontaktu. Używany w obu layoutach (`Layout.astro` i `AuthLayout.astro`).
- **`DataGrid`**: Niestandardowy, złożony komponent do wyświetlania siatki danych. Będzie obsługiwał "lepkie" kolumny/wiersze, wirtualizację (w przyszłości) i interakcje z komórkami.
- **`DateRangePicker`**: Hybrydowy komponent do wybierania zakresu dat, który filtruje dane w `DataGrid` i na wykresie. Łączy w sobie dwie funkcjonalności:
  - **Predefiniowane zakresy**: Umożliwia szybki wybór najczęściej używanych okresów (np. "Ostatnie 3 miesiące", "Bieżący rok", "Cały okres") za pomocą jednego kliknięcia.
  - **Niestandardowy wybór**: Zawiera również tradycyjny kalendarz (`Calendar` w trybie `range`), który pozwala na precyzyjne zdefiniowanie dowolnego zakresu dat. Zmiany są zatwierdzane dopiero po kliknięciu przycisku "Zastosuj", co zapobiega przypadkowemu zamknięciu okna podczas wyboru.
- **`Dialog` / `AlertDialog`**: Standardowe komponenty `shadcn/ui` do wszystkich interakcji modalnych i potwierdzeń.
- **`Card`**: Używany do wyświetlania wskaźników KPI w sekcji pulpitu.
- **`Skeleton`**: Używany jako placeholder podczas ładowania danych dla KPI, wykresu i siatki, poprawiając postrzeganą wydajność.
- **`DropdownMenu`**: Używany do menu użytkownika oraz do menu kontekstowego akcji dla każdego konta w siatce.
- **`Popover`**: Używany w połączeniu z komponentem `Calendar` do wyboru daty dla nowej kolumny.
- **`Toast` (`Sonner`)**: Do wyświetlania globalnych powiadomień o błędach lub sukcesach (np. "Błąd połączenia z serwerem").
- **`Input` / `Select` / `Switch` / `Button`**: Podstawowe elementy formularzy i akcji, stylizowane zgodnie z motywem `shadcn/ui`.
- **`ToggleGroup`**: Do interaktywnego przełączania widoczności serii danych na wykresie `Recharts`.
