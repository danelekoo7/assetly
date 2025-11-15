# Analiza: Brak możliwości usunięcia kolumny

## 1. Opis problemu

Jeśli użytkownik przez przypadek doda nową kolumnę (datę) w siatce danych, nie ma obecnie możliwości jej usunięcia z poziomu interfejsu użytkownika. Po dodaniu kolumny za pomocą przycisku "Dodaj dzisiejszą kolumnę" lub wybraniu dowolnej daty, kolumna pozostaje na stałe w systemie.

## 2. Weryfikacja zgodności z PRD

### Przegląd wymagań w PRD dotyczących zarządzania kolumnami:

**US-008: Dodawanie wpisu z wartościami dla bieżącego dnia**
- ✅ Użytkownik może dodać nową kolumnę z datą
- ❌ **Brak wymagania dotyczącego usuwania kolumny**
- ❌ **Brak wymagania dotyczącego edycji daty kolumny**

**US-009: Edycja wartości konta**
- ✅ Użytkownik może edytować wartości w komórkach
- Nie dotyczy usuwania całych kolumn

**US-006, US-007: Zarządzanie kontami**
- ✅ Użytkownik może archiwizować i usuwać KONTA
- Nie dotyczy usuwania KOLUMN (dat)

### Wnioski z analizy PRD:

**PRD nie zawiera wymagań dotyczących usuwania lub edycji kolumn.** Jest to **luka funkcjonalna** w specyfikacji produktu.

## 3. Analiza obecnej implementacji

### Frontend:
- `DataGridHeader.tsx` - wyświetla daty jako statyczne nagłówki kolumn, bez interakcji
- `useDashboardStore.ts` - zawiera funkcję `addColumn()`, **brak funkcji usuwania**
- Brak UI do usuwania kolumny (np. ikony "X" w nagłówku)

### Backend:
- `POST /api/value-entries` - upsert dla pojedynczych wpisów, działa poprawnie
- **Brak endpointu DELETE dla wielu wpisów naraz** (usunięcie całej kolumny)
- Tabela `value_entries` ma RLS policy dla DELETE, która pozwala na usuwanie wpisów użytkownika

### Baza danych:
- ✅ RLS policy `authenticated_users_delete_own_value_entries` - umożliwia usuwanie
- ✅ Schemat wspiera operację DELETE na `value_entries`

## 4. Przypadki użycia wymagające funkcji usuwania kolumny

1. **Błędna data**: Użytkownik dodał kolumnę z błędną datą historyczną
2. **Przypadkowe kliknięcie**: Użytkownik pomyłkowo dodał dzisiejszą kolumnę
3. **Duplikat**: Użytkownik chce usunąć zduplikowaną kolumnę (chociaż system nie pozwala na duplikaty)
4. **Czyszczenie danych**: Użytkownik chce uporządkować historyczne wpisy i usunąć niepotrzebne daty

## 5. Propozycje rozwiązania

### Opcja A: Usuwanie całej kolumny (REKOMENDOWANE)

**Opis:**
- Dodanie ikony "X" lub menu kontekstowego w nagłówku każdej kolumny
- Kliknięcie otwiera dialog potwierdzenia
- Po potwierdzeniu, system usuwa WSZYSTKIE `value_entries` dla tej daty

**Zalety:**
- Proste w implementacji
- Intuicyjne dla użytkownika
- Rozwiązuje główny problem

**Wady:**
- Nieodwracalna operacja (jak przy usuwaniu konta)
- Może przypadkowo usunąć wiele danych

**Implementacja:**
1. UI: Dodać ikonę/przycisk w `DataGridHeader.tsx`
2. Store: Dodać funkcję `deleteColumn(date: string)` w `useDashboardStore.ts`
3. Backend: Stworzyć endpoint `DELETE /api/value-entries?date=YYYY-MM-DD` (batch delete)
4. Service: Dodać `deleteEntriesByDate()` w `value-entry.service.ts`

### Opcja B: Edycja daty kolumny

**Opis:**
- Możliwość zmiany daty kolumny na inną
- System aktualizuje datę wszystkich `value_entries` dla tej kolumny

**Zalety:**
- Użytkownik nie traci danych
- Naprawia błędną datę zamiast usuwać

**Wady:**
- Bardziej skomplikowana implementacja
- Może prowadzić do konfliktów z istniejącymi datami
- Mniej intuicyjna

### Opcja C: Rozwiązanie hybrydowe (NAJBARDZIEJ KOMPLETNE)

**Opis:**
- Możliwość zarówno edycji jak i usunięcia kolumny
- Menu kontekstowe w nagłówku kolumny z opcjami:
  - "Edytuj datę"
  - "Usuń kolumnę"

**Zalety:**
- Maksymalna elastyczność
- Pokrywa wszystkie przypadki użycia

**Wady:**
- Najwięcej pracy implementacyjnej
- Może być over-engineering dla MVP

## 6. Rekomendacja

**Proponuję implementację Opcji A: Usuwanie całej kolumny**

**Uzasadnienie:**
1. ✅ Rozwiązuje zgłoszony problem w najprostszy sposób
2. ✅ Spójna z istniejącym wzorcem usuwania kont (nieodwracalna operacja z potwierdzeniem)
3. ✅ Minimalna złożoność implementacji dla MVP
4. ✅ Pokrywa 90% przypadków użycia
5. ✅ Edycję daty można dodać w przyszłości jeśli zajdzie potrzeba

**Funkcjonalność:**
- Ikona "X" w prawym górnym rogu każdego nagłówka kolumny (daty)
- Kliknięcie otwiera `ConfirmActionDialog`:
  - Tytuł: "Usuń kolumnę"
  - Opis: "Czy na pewno chcesz usunąć wszystkie wpisy z dnia {data}? Ta operacja jest nieodwracalna i usunie dane dla wszystkich kont w tym dniu."
  - Przyciski: "Anuluj" / "Usuń"
- Po potwierdzeniu: batch DELETE wszystkich `value_entries` dla tej daty
- Toast z komunikatem sukcesu: "Usunięto kolumnę {data}"
- Auto-refresh danych

## 7. Plan implementacji (wysokopoziomowy)

### Krok 1: Backend - Endpoint DELETE
- Plik: `src/pages/api/value-entries.ts`
- Dodać handler `DELETE` z parametrem `date`
- Walidacja: data w formacie ISO, użytkownik zalogowany
- Wywołanie serwisu do usunięcia wpisów

### Krok 2: Backend - Service
- Plik: `src/lib/services/value-entry.service.ts`
- Dodać metodę `deleteEntriesByDate(supabase, userId, date)`
- Wykorzystać RLS - automatycznie ograniczy do kont użytkownika

### Krok 3: Frontend - Store
- Plik: `src/lib/stores/useDashboardStore.ts`
- Dodać akcję `deleteColumn(date: string)`
- Wywołanie API DELETE
- Optimistic update (usunięcie kolumny z UI przed odpowiedzią)
- Rollback w przypadku błędu
- Toast z komunikatem

### Krok 4: Frontend - UI
- Plik: `src/components/dashboard/DataGrid/DataGridHeader.tsx`
- Dodać ikonę Trash lub X dla każdej kolumny
- OnClick: `openModal('confirmAction', { ... })`

### Krok 5: Walidacja i testy
- Zablokować usuwanie ostatniej kolumny (?)
- Unit testy dla serwisu
- E2E testy dla flow usuwania kolumny

## 8. Pytania do rozstrzygnięcia

1. **Czy zablokować usuwanie ostatniej kolumny?**
   - Opcja A: Tak, wymagać minimum 1 kolumny z danymi
   - Opcja B: Nie, pozwolić na całkowite wyczyszczenie (użytkownik wróci do pustego stanu)

2. **Czy pozwolić na usuwanie kolumn z przeszłością?**
   - Opcja A: Tylko najnowsza kolumna (najbezpieczniejsze)
   - Opcja B: Dowolna kolumna (największa elastyczność) ← REKOMENDOWANE

3. **Gdzie umieścić ikonę usuwania?**
   - Opcja A: Zawsze widoczna ikona X w nagłówku
   - Opcja B: Menu kontekstowe (3 kropki) w nagłówku ← REKOMENDOWANE (skalowalność)
   - Opcja C: Ikona pojawia się tylko przy hover

## 9. Aktualizacja PRD

Po implementacji należy zaktualizować PRD i dodać nową historyjkę użytkownika:

**US-017: Usuwanie kolumny z przypadkowo dodaną datą**
- Jako użytkownik, chcę móc usunąć całą kolumnę (datę) wraz z wszystkimi wpisami, jeśli dodałem ją przez pomyłkę.
- Kryteria akceptacji:
  - W nagłówku każdej kolumny znajduje się opcja usunięcia
  - Po kliknięciu, system wyświetla dialog potwierdzenia z ostrzeżeniem
  - Po potwierdzeniu, wszystkie wpisy dla tej daty są usuwane
  - System automatycznie odświeża dane i wykres
  - Operacja jest nieodwracalna
