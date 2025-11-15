# Podsumowanie: Implementacja trwałego usuwania konta użytkownika

**Data:** 14.11.2025  
**Funkcjonalność:** Trwałe usuwanie konta użytkownika (US-011 z PRD)  
**Status:** ✅ Zaimplementowana i przetestowana

---

## 1. Cel implementacji

Zaimplementowanie funkcjonalności pozwalającej użytkownikowi na trwałe usunięcie swojego konta wraz ze wszystkimi powiązanymi danymi finansowymi (konta, wpisy wartości), zgodnie z wymaganiami z `ai/prd.md` (Historyjka US-011).

---

## 2. Decyzje architektoniczne

### Wybór podejścia do usuwania użytkownika

**Rozważane opcje:**

1. **Service Role Key + `supabase.auth.admin.deleteUser()`**
   - ✅ Proste API
   - ❌ Wymaga przechowywania service role key (ryzyko bezpieczeństwa)
2. **RPC + Funkcja SQL z SECURITY DEFINER** ⭐ **WYBRANA**
   - ✅ Bezpieczniejsze (brak service role key w aplikacji)
   - ✅ Logika w bazie danych (single source of truth)
   - ✅ Użytkownik może usunąć tylko swoje konto (`auth.uid()`)

### Strategia CASCADE DELETE

Wykorzystanie istniejącej struktury bazy danych z `ON DELETE CASCADE`:

```
auth.users → accounts → value_entries
```

Usunięcie użytkownika automatycznie usuwa wszystkie powiązane dane.

---

## 3. Implementacja Backend

### 3.1. Migracja SQL

**Plik:** `supabase/migrations/20251114192000_add_delete_user_function.sql`

Utworzono funkcję PostgreSQL:

```sql
CREATE OR REPLACE FUNCTION delete_current_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION delete_current_user() TO authenticated;
REVOKE EXECUTE ON FUNCTION delete_current_user() FROM anon;
```

**Bezpieczeństwo:**

- `SECURITY DEFINER` - podnosi uprawnienia do usunięcia z `auth.users`
- Sprawdzenie `auth.uid()` - tylko zalogowany użytkownik
- Tylko swoje konto - `WHERE id = auth.uid()`
- Uprawnienia tylko dla `authenticated`

### 3.2. Schema walidacji

**Plik:** `src/lib/validation/user.schemas.ts`

```typescript
export const deleteUserAccountSchema = z.object({
  password: z.string().min(1, "Hasło jest wymagane").min(6, "Hasło musi mieć co najmniej 6 znaków"),
});
```

### 3.3. Endpoint API

**Plik:** `src/pages/api/user/profile.ts`

**Endpoint:** `DELETE /api/user/profile`

**Przepływ:**

1. Walidacja hasła (Zod schema)
2. Weryfikacja hasła (`supabase.auth.signInWithPassword()`)
3. Wywołanie funkcji RPC (`supabase.rpc('delete_current_user')`)
4. Zwrot 204 No Content przy sukcesie

**Komunikaty błędów (po polsku):**

- 400: "Nieprawidłowe dane"
- 401: "Nieprawidłowe hasło"
- 500: "Nie udało się usunąć konta" / "Wewnętrzny błąd serwera"

---

## 4. Implementacja Frontend

### 4.1. Strona potwierdzenia usunięcia

**Plik:** `src/pages/account-deleted.astro`

- Publiczna strona (dodana do `PUBLIC_PATHS`)
- Komunikat o pomyślnym usunięciu konta
- Przycisk "Przejdź do strony głównej" → `/login`
- Ikona potwierdzenia (checkmark)

### 4.2. Strona ustawień

**Plik:** `src/pages/settings.astro`

- Chroniona strona (wymaga autentykacji)
- Sekcja "Informacje o koncie" - wyświetla email użytkownika
- Sekcja "Strefa niebezpieczna" - przycisk usuwania konta
- Wykorzystuje komponent `DeleteAccountModal`

### 4.3. Modal potwierdzenia

**Plik:** `src/components/dashboard/DeleteAccountModal.tsx`

**Funkcjonalności:**

- `AlertDialog` z wyraźnym ostrzeżeniem o nieodwracalności
- Lista konsekwencji (usunięcie kont, historii, ustawień)
- Pole input na hasło (type="password")
- Przyciski: "Anuluj" (domyślny focus) i "Usuń konto" (destructive)
- Obsługa błędów z toastami (sonner)
- Walidacja - przycisk aktywny tylko gdy hasło nie jest puste
- Obsługa Enter - submit formularza
- Reset hasła po zamknięciu modala

**Toast notifications:**

- ✅ Sukces → redirect do `/account-deleted`
- ❌ Błąd → komunikat po polsku

### 4.4. Menu użytkownika

**Plik:** `src/components/dashboard/UserMenu.tsx`

Komponent React z dropdown menu:

- Wyświetlanie email użytkownika
- Link "Ustawienia" → `/settings`
- Przycisk "Wyloguj" (form POST do `/api/auth/logout`)
- Ikona użytkownika (SVG)

---

## 5. Integracja i modyfikacje

### 5.1. Layout

**Plik:** `src/layouts/Layout.astro`

**Zmiany:**

1. Import `UserMenu` i `Toaster`
2. Zamiana prostego przycisku "Wyloguj" na komponent `UserMenu` (z `client:load`)
3. Dodanie `<Toaster client:load />` przed zamknięciem `</body>`

### 5.2. Middleware

**Plik:** `src/middleware/index.ts`

**Zmiana:**

- Dodano `/account-deleted` do `PUBLIC_PATHS`

---

## 6. Napotkane problemy i rozwiązania

### Problem 1: "MenuItem must be used within Menu"

**Przyczyna:** Bezpośrednie użycie `DropdownMenu` w pliku `.astro`

**Rozwiązanie:** Utworzenie osobnego komponentu React `UserMenu.tsx` i użycie z `client:load`

### Problem 2: Brak wyświetlania toastów

**Przyczyna:** Brak komponentu `<Toaster />` w layout'cie

**Rozwiązanie:** Dodanie `<Toaster client:load />` do `Layout.astro`

### Problem 3: Komunikaty błędów po angielsku

**Przyczyna:** "Validation failed" z backendu

**Rozwiązanie:** Zmiana komunikatu na "Nieprawidłowe dane"

### Problem 4: Błędy formatowania (326 błędów prettier)

**Rozwiązanie:** `npm run lint:fix` - naprawione automatycznie

### Problem 5: Accessibility issue (autoFocus)

**Przyczyna:** `autoFocus` na input hasła

**Rozwiązanie:** Usunięcie `autoFocus` (linter warning)

---

## 7. Utworzone pliki

### Backend (3 pliki):

1. `supabase/migrations/20251114192000_add_delete_user_function.sql` - Funkcja SQL
2. `src/lib/validation/user.schemas.ts` - Schema Zod
3. `src/pages/api/user/profile.ts` - Endpoint DELETE

### Frontend (4 pliki):

4. `src/pages/account-deleted.astro` - Strona potwierdzenia
5. `src/pages/settings.astro` - Strona ustawień
6. `src/components/dashboard/DeleteAccountModal.tsx` - Modal
7. `src/components/dashboard/UserMenu.tsx` - Menu użytkownika

---

## 8. Zmodyfikowane pliki

1. `src/layouts/Layout.astro` - Dodano UserMenu i Toaster
2. `src/middleware/index.ts` - Dodano `/account-deleted` do PUBLIC_PATHS

---

## 9. Testy manualne

**Przepływ pomyślnego usunięcia:**

1. ✅ Zalogowanie na konto
2. ✅ Kliknięcie "Konto" → "Ustawienia"
3. ✅ Kliknięcie "Usuń konto"
4. ✅ Wprowadzenie poprawnego hasła
5. ✅ Przekierowanie na `/account-deleted`
6. ✅ Dane użytkownika usunięte z bazy (wraz z accounts i value_entries)

**Testy walidacji:**

1. ✅ Błędne hasło → Toast: "Nieprawidłowe hasło"
2. ✅ Puste hasło → Przycisk nieaktywny

---

## 10. Bezpieczeństwo

### Zaimplementowane zabezpieczenia:

1. **Weryfikacja hasła** - `signInWithPassword()` przed usunięciem
2. **RPC z SECURITY DEFINER** - brak service role key w aplikacji
3. **Sprawdzenie auth.uid()** - użytkownik może usunąć tylko siebie
4. **CASCADE delete** - automatyczne usuwanie powiązanych danych
5. **Middleware** - endpoint wymaga autentykacji
6. **Potwierdzenie użytkownika** - wyraźne ostrzeżenie w modalu
7. **Komunikaty po polsku** - user-friendly error messages

---

## 11. Compliance z PRD

### Wymaganie US-011: ✅ ZREALIZOWANE

**Kryteria akceptacji:**

- ✅ W ustawieniach konta znajduje się opcja "Usuń konto"
- ✅ Po kliknięciu pojawia się okno modalne z prośbą o potwierdzenie poprzez wpisanie hasła
- ✅ Po poprawnym podaniu hasła i potwierdzeniu, wszystkie dane użytkownika są trwale usuwane
- ✅ Użytkownik jest automatycznie wylogowywany i nie może się już zalogować na to konto

---

## 12. Workflow 3x3

Implementacja była realizowana zgodnie z zasadą workflow 3x3:

### Etap 1 (Backend - 3 kroki):

1. ✅ Migracja SQL
2. ✅ Schema walidacji
3. ✅ Endpoint API

### Etap 2 (Frontend - 3 kroki):

4. ✅ Strona potwierdzenia
5. ✅ Strona ustawień
6. ✅ Modal usuwania

### Etap 3 (Integracja - 2 kroki):

7. ✅ Menu użytkownika
8. ✅ Middleware

### Dodatkowe kroki (naprawy):

9. ✅ Naprawa DropdownMenu
10. ✅ Dodanie Toaster
11. ✅ Linter fixes
12. ✅ Tłumaczenia na polski

---

## 13. Uwagi końcowe

- Implementacja jest **kompletna i w pełni funkcjonalna**
- Wszystkie komunikaty są **po polsku**
- Kod przeszedł **linter** (3 warningi o console.error są akceptowalne)
- Funkcjonalność została **przetestowana manualnie**
- Bezpieczeństwo zapewnione przez **RPC + weryfikację hasła**

### Zalecenia na przyszłość:

1. **Testy automatyczne** - dodać testy E2E (Playwright) gdy użytkownik potwierdzi działanie
2. **Testy jednostkowe** - endpoint API i funkcja SQL
3. **Rate limiting** - zabezpieczenie przed brute-force atakami na hasło
4. **Email confirmation** - dodatkowe potwierdzenie przez email przed usunięciem

---

**Koniec implementacji** ✅
