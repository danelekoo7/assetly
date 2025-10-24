### 1. Lista tabel z ich kolumnami, typami danych i ograniczeniami

#### Typy niestandardowe (ENUM)

- **`account_type`**: Definiuje dozwolone typy kont.
  ```sql
  CREATE TYPE account_type AS ENUM ('investment_asset', 'cash_asset', 'liability');
  ```

#### Tabela `accounts`

Przechowuje informacje o kontach finansowych użytkowników.

| Nazwa kolumny | Typ danych     | Ograniczenia                                                          | Opis                                                             |
| :------------ | :------------- | :-------------------------------------------------------------------- | :--------------------------------------------------------------- |
| `id`          | `uuid`         | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`                            | Unikalny identyfikator konta.                                    |
| `user_id`     | `uuid`         | `NOT NULL`, `FOREIGN KEY REFERENCES auth.users(id) ON DELETE CASCADE` | Odniesienie do użytkownika w systemie autentykacji Supabase.     |
| `name`        | `text`         | `NOT NULL`                                                            | Nazwa konta (np. "mBank", "Portfel XTB").                        |
| `type`        | `account_type` | `NOT NULL`                                                            | Typ konta (Aktywo inwestycyjne, Aktywo gotówkowe, Pasywo).       |
| `currency`    | `text`         | `NOT NULL`, `DEFAULT 'PLN'`                                           | Waluta konta, z domyślną wartością 'PLN'.                        |
| `archived_at` | `timestamptz`  | `NULL`                                                                | Data i czas zarchiwizowania konta. `NULL` oznacza aktywne konto. |
| `created_at`  | `timestamptz`  | `NOT NULL`, `DEFAULT now()`                                           | Data i czas utworzenia rekordu.                                  |
| `updated_at`  | `timestamptz`  | `NOT NULL`, `DEFAULT now()`                                           | Data i czas ostatniej aktualizacji rekordu.                      |
|               |                | `UNIQUE (user_id, name)`                                              | Zapewnia, że nazwy kont są unikalne dla każdego użytkownika.     |

#### Tabela `value_entries`

Przechowuje historyczne wpisy wartości dla każdego konta.

| Nazwa kolumny | Typ danych       | Ograniczenia                                                        | Opis                                                                                             |
| :------------ | :--------------- | :------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------- |
| `id`          | `uuid`           | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`                          | Unikalny identyfikator wpisu.                                                                    |
| `account_id`  | `uuid`           | `NOT NULL`, `FOREIGN KEY REFERENCES accounts(id) ON DELETE CASCADE` | Odniesienie do konta, którego dotyczy wpis. `ON DELETE CASCADE` usunie wpisy po usunięciu konta. |
| `date`        | `timestamptz`    | `NOT NULL`                                                          | Data, dla której zapisano wartość.                                                               |
| `value`       | `numeric(18, 4)` | `NOT NULL`                                                          | Całkowita wartość konta na dany dzień.                                                           |
| `cash_flow`   | `numeric(18, 4)` | `NOT NULL`, `DEFAULT 0`                                             | Wpłata lub wypłata środków.                                                                      |
| `gain_loss`   | `numeric(18, 4)` | `NOT NULL`, `DEFAULT 0`                                             | Zysk lub strata wynikająca ze zmiany wartości (np. na giełdzie).                                 |
| `created_at`  | `timestamptz`    | `NOT NULL`, `DEFAULT now()`                                         | Data i czas utworzenia rekordu.                                                                  |
| `updated_at`  | `timestamptz`    | `NOT NULL`, `DEFAULT now()`                                         | Data i czas ostatniej aktualizacji rekordu.                                                      |
|               |                  | `UNIQUE (account_id, date)`                                         | Zapewnia, że dla danego konta istnieje tylko jeden wpis na dany dzień.                           |

---

### 2. Relacje między tabelami

- **`auth.users` -> `accounts` (Jeden-do-wielu)**
  - Jeden użytkownik (`users`) może mieć wiele kont finansowych (`accounts`).
  - Relacja jest zdefiniowana przez klucz obcy `accounts.user_id`, który odnosi się do `auth.users.id`.

- **`accounts` -> `value_entries` (Jeden-do-wielu)**
  - Jedno konto (`accounts`) może mieć wiele historycznych wpisów wartości (`value_entries`).
  - Relacja jest zdefiniowana przez klucz obcy `value_entries.account_id`, który odnosi się do `accounts.id`.

---

### 3. Indeksy

- **Indeks na `accounts(user_id)`**:
  - Cel: Przyspieszenie zapytań filtrujących konta dla zalogowanego użytkownika.

  ```sql
  CREATE INDEX idx_accounts_user_id ON accounts(user_id);
  ```

- **Indeks złożony na `value_entries(account_id, date)`**:
  - Cel: Optymalizacja wydajności zapytań pobierających serie czasowe wartości dla konkretnego konta, co jest kluczowe dla renderowania wykresów.
  ```sql
  CREATE INDEX idx_value_entries_account_id_date ON value_entries(account_id, date DESC);
  ```

---

### 4. Zasady PostgreSQL (Row-Level Security)

W celu zapewnienia pełnej izolacji danych pomiędzy użytkownikami, dla obu tabel zostanie włączone zabezpieczenie na poziomie wiersza (RLS).

---

### 5. Dodatkowe uwagi i decyzje projektowe

1.  **Usuwanie danych użytkownika**: Zgodnie z wymaganiami, usunięcie użytkownika z `auth.users` powinno skutkować kaskadowym usunięciem wszystkich jego danych. Klucz obcy `accounts.user_id` z opcją `ON DELETE CASCADE` automatycznie usunie wszystkie konta (`accounts`) powiązane z usuniętym użytkownikiem. Następnie, dzięki opcji `ON DELETE CASCADE` na kluczu `value_entries.account_id`, zostaną usunięte wszystkie wpisy wartości (`value_entries`) dla tych kont. Nie jest potrzebny dodatkowy trigger, ponieważ relacje z `ON DELETE CASCADE` w pełni realizują to wymaganie.

2.  **Precyzja finansowa**: Wybór typu `NUMERIC(18, 4)` dla wszystkich kolumn finansowych (`value`, `cash_flow`, `gain_loss`) gwarantuje wysoką precyzję i eliminuje problemy z zaokrągleniami, które mogłyby wystąpić przy użyciu typów zmiennoprzecinkowych (`float`/`double`).

3.  **Strefy czasowe**: Użycie typu `TIMESTAMPTZ` (`timestamp with time zone`) dla wszystkich kolumn z datami jest najlepszą praktyką, zapewniającą spójność danych niezależnie od lokalnych ustawień serwera czy klienta.

4.  **Normalizacja**: Schemat jest znormalizowany. Celowo nie dodano kolumny `user_id` do tabeli `value_entries`, aby uniknąć redundancji danych. Własność danych jest weryfikowana na poziomie zapytań poprzez relację z tabelą `accounts`, co jest obsługiwane przez polityki RLS.

5.  **Logika biznesowa w backendzie**: Zgodnie z ustaleniami, bardziej złożone operacje, takie jak:
    - Automatyczne tworzenie pierwszego wpisu `value_entries` po utworzeniu nowego konta.
    - Walidacja spójności danych (`poprzednia wartość + wpłata + zysk = nowa wartość`) przy edycji.
      ...będą implementowane w warstwie backendowej aplikacji (np. przy użyciu Supabase Edge Functions lub bezpośrednio w kliencie), a nie w bazie danych za pomocą triggerów. Takie podejście zapewnia większą elastyczność.
