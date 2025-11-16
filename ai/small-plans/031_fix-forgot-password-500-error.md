# Plan naprawy błędu 500 na stronie forgot-password

## Analiza problemu

### Obecna sytuacja
- Po kliknięciu "zapomniałem hasła" użytkownik otrzymuje błąd 500
- Błąd: `GET https://assetly.pages.dev/forgot-password net::ERR_HTTP_RESPONSE_CODE_FAILURE 500`
- Potwierdzenie aktywacji konta działa poprawnie

### Przyczyna
Po analizie kodu zidentyfikowano problem:

1. **Konfiguracja zmiennych środowiskowych** (`astro.config.mjs`):
   ```javascript
   SUPABASE_URL: envField.string({
     context: "server",  // ❌ Niedostępne w przeglądarce
     access: "secret",
   }),
   SUPABASE_KEY: envField.string({
     context: "server",  // ❌ Niedostępne w przeglądarce
     access: "secret",
   }),
   ```

2. **Client-side usage** (`ForgotPasswordForm.tsx`):
   ```typescript
   import { supabaseClient } from "@/db/supabase.client";
   // ...
   const { error } = await supabaseClient.auth.resetPasswordForEmail(...)
   ```

3. **Inicjalizacja klienta** (`supabase.client.ts`):
   ```typescript
   const supabaseUrl = import.meta.env.SUPABASE_URL;  // undefined w przeglądarce
   const supabaseAnonKey = import.meta.env.SUPABASE_KEY;  // undefined w przeglądarce
   ```

**Wniosek:** Zmienne środowiskowe są zdefiniowane jako server-only, więc `supabaseClient` inicjalizuje się z wartościami `undefined`, co powoduje błąd 500.

## Rozwiązanie

### Opcja 1: Publiczne zmienne środowiskowe (ZALECANA)

Supabase ANON KEY jest bezpieczny do użycia po stronie klienta - jest to klucz publiczny zaprojektowany do tego celu i chroniony przez Row Level Security.

**Zmiany:**

1. **Zmienić konfigurację Astro** aby zmienne były dostępne w przeglądarce
2. **Dodać prefix `PUBLIC_`** do zmiennych środowiskowych
3. **Zaktualizować pliki** używające tych zmiennych

### Opcja 2: API Endpoint (bardziej złożona)

Utworzyć endpoint `/api/auth/forgot-password.ts` i przenieść logikę na serwer.

**Plusy:** Większa kontrola nad procesem
**Minusy:** Niepotrzebna złożoność dla standardowej funkcjonalności Supabase

## Rekomendacja

Wybieram **Opcję 1** - jest zgodna z best practices Supabase i upraszcza implementację.

## Kroki implementacji

### Krok 1: Aktualizacja konfiguracji Astro
- Zmienić `context: "server"` na `context: "client"`
- Zmienić `access: "secret"` na `access: "public"`
- Zmienić nazwy zmiennych na `PUBLIC_SUPABASE_URL` i `PUBLIC_SUPABASE_KEY`

### Krok 2: Aktualizacja plików .env
- `.env.example` - zmienić nazwy zmiennych
- Użytkownik musi zaktualizować swój lokalny `.env`

### Krok 3: Aktualizacja kodu
- `src/db/supabase.client.ts` - użyć nowych nazw zmiennych
- `src/db/supabase.server.ts` - sprawdzić czy używa poprawnych zmiennych (lub dodać nowe server-only jeśli potrzebne)
- `src/env.d.ts` - zaktualizować typy dla `ImportMetaEnv`

### Krok 4: Weryfikacja
- Przetestować forgot-password
- Przetestować login/register
- Upewnić się, że inne funkcje Supabase działają

## Konfiguracja Supabase (do weryfikacji przez użytkownika)

W panelu Supabase należy sprawdzić:

1. **Email Templates** → **Reset Password**
   - Czy template jest skonfigurowany
   - Czy zawiera poprawny link: `{{ .ConfirmationURL }}`

2. **Authentication** → **URL Configuration**
   - Site URL: `https://assetly.pages.dev` (dla produkcji)
   - Redirect URLs: 
     - `https://assetly.pages.dev/reset-password`
     - `http://localhost:3000/reset-password` (dla dev)

3. **Authentication** → **Email Auth**
   - Czy "Enable email confirmations" jest włączone

## Uwagi

- Supabase ANON KEY jest bezpieczny dla klienta - to klucz publiczny
- Row Level Security (RLS) chroni dane mimo publicznego klucza
- Service Role Key (jeśli używany) NIGDY nie powinien być w kliencie
