## 1. WPROWADZENIE

Niniejsza specyfikacja opisuje architekturę i szczegóły techniczne implementacji modułu autentykacji, rejestracji i odzyskiwania hasła dla aplikacji Assetly (US-001, US-002, US-003, US-004, US-016). System wykorzystuje Supabase Auth jako backend autentykacji, zintegrowany z frameworkiem Astro i komponentami React.

## 2. ARCHITEKTURA AUTENTYKACJI

### 2.1. Schemat przepływu danych

```
┌─────────────────┐       ┌──────────────┐       ┌─────────────────┐
│  Klient         │──────▶│  Astro SSR   │──────▶│  Supabase Auth  │
│  (Przeglądarka) │◀──────│  + Middleware│◀──────│  + RLS          │
└─────────────────┘       └──────────────┘       └─────────────────┘
       │                        │                       │
       │                        │                       │
       ▼                        ▼                       ▼
  React Forms            Session Check           JWT Validation
  (client:load)          + Cookie mgmt           + User Storage
```


### 2.2. Warstwy systemu

1. **Warstwa prezentacji** - Strony Astro + komponenty React dla formularzy
2. **Warstwa routingu** - Astro pages z renderowaniem server-side
3. **Warstwa middleware** - Weryfikacja sesji, ochrona tras
4. **Warstwa usług** - Supabase Auth SDK (autentykacja, zarządzanie sesją)
5. **Warstwa danych** - Tabela auth.users (Supabase), tabela accounts (RLS)

## 3. ARCHITEKTURA INTERFEJSU UŻYTKOWNIKA

### 3.1. Struktura stron i komponentów

#### **Strona rejestracji** (`/register`)
- **Ścieżka:** `src/pages/register.astro`
- **Tryb renderowania:** Server-side (SSR)
- **Główny komponent:** `RegisterForm.tsx` (React, client:load)
- **Odpowiedzialność:**
    - Astro: Renderowanie layoutu, SEO, sprawdzenie istniejącej sesji (przekierowanie do `/` jeśli zalogowany)
    - React: Obsługa formularza, walidacja, komunikacja z API auth

**Pola formularza:**
- Email (type="email", required)
- Hasło (type="password", required, min. 8 znaków)
- Potwierdzenie hasła (type="password", required)

**Walidacja client-side:**
- Format email (regex pattern)
- Siła hasła (min. 8 znaków, 1 duża litera, 1 cyfra)
- Zgodność haseł
- Komunikaty błędów wyświetlane inline pod polami (shadcn/ui Form)

**Przepływ:**
1. Użytkownik wypełnia formularz
2. Walidacja po stronie klienta (react-hook-form + zod)
3. Wywołanie `supabase.auth.signUp({ email, password })`
4. Przekierowanie do `/auth/check-email` z komunikatem

---

#### **Strona logowania** (`/login`)
- **Ścieżka:** `src/pages/login.astro`
- **Tryb renderowania:** Server-side (SSR)
- **Główny komponent:** `LoginForm.tsx` (React, client:load)
- **Odpowiedzialność:**
    - Astro: Layout, sprawdzenie sesji (przekierowanie jeśli zalogowany)
    - React: Obsługa formularza, autoryzacja

**Pola formularza:**
- Email (type="email", required)
- Hasło (type="password", required)
- Link "Zapomniałem hasła" → `/forgot-password`

**Walidacja client-side:**
- Format email
- Hasło wymagane (bez ujawniania szczegółów dotyczących siły w formularzu logowania)

**Przepływ:**
1. Użytkownik wprowadza dane
2. Walidacja formularza
3. Wywołanie `supabase.auth.signInWithPassword({ email, password })`
4. **Sukces:** Supabase ustawia cookie sesji, przekierowanie do `/` (server-side redirect w Astro)
5. **Błąd:** Komunikat generyczny "Nieprawidłowy email lub hasło" (security best practice)

---

#### **Strona oczekiwania na potwierdzenie** (`/auth/check-email`)
- **Ścieżka:** `src/pages/auth/check-email.astro`
- **Tryb renderowania:** Statyczny
- **Odpowiedzialność:** Informacja użytkownika o wysłaniu maila aktywacyjnego

**Treść:**
- Nagłówek: "Sprawdź swoją skrzynkę pocztową"
- Komunikat: "Wysłaliśmy link aktywacyjny na adres [email]. Kliknij w link, aby aktywować konto."
- Przycisk: "Powrót do logowania" → `/login`

**Parametry URL:**
- `?email=...` (opcjonalny) - wyświetlenie adresu w komunikacie

---

#### **Strona potwierdzenia konta** (`/auth/confirmed`)
- **Ścieżka:** `src/pages/auth/confirmed.astro`
- **Tryb renderowania:** Server-side
- **Odpowiedzialność:** Potwierdzenie aktywacji, weryfikacja tokena

**Przepływ:**
1. Użytkownik klika link z maila: `?token_hash=...&type=signup`
2. Astro SSR wywołuje `supabase.auth.verifyOtp()` na serwerze
3. **Sukces:** Automatyczne przekierowanie do `/login` z parametrem URL `?confirmed=true` (komunikat Toast na stronie logowania: "Konto aktywowane! Możesz się teraz zalogować.")
4. **Błąd:** Komunikat o wygaśnięciu linku z przyciskiem do ponownego wysłania maila (formularz z polem email)

**Treść (błąd - link wygasł):**
- Nagłówek: "Link aktywacyjny wygasł"
- Komunikat: "Link aktywacyjny stracił ważność. Możesz poprosić o nowy."
- Formularz: Pole email + przycisk "Wyślij ponownie link aktywacyjny"

---

#### **Strona resetowania hasła - krok 1** (`/forgot-password`)
- **Ścieżka:** `src/pages/forgot-password.astro`
- **Tryb renderowania:** Server-side
- **Główny komponent:** `ForgotPasswordForm.tsx` (React, client:load)

**Pola formularza:**
- Email (type="email", required)

**Walidacja:**
- Format email

**Przepływ:**
1. Użytkownik podaje email
2. Wywołanie `supabase.auth.resetPasswordForEmail(email, { redirectTo: '/reset-password' })`
3. Przekierowanie do `/auth/check-email-reset` z komunikatem o wysłanym mailu

---

#### **Strona resetowania hasła - krok 2** (`/reset-password`)
- **Ścieżka:** `src/pages/reset-password.astro`
- **Tryb renderowania:** Server-side
- **Główny komponent:** `ResetPasswordForm.tsx` (React, client:load)
- **Odpowiedzialność:**
    - Astro: Weryfikacja tokena z URL (`?token_hash=...&type=recovery`)
    - React: Formularz nowego hasła

**Pola formularza:**
- Nowe hasło (type="password", required, min. 8 znaków)
- Potwierdzenie hasła (type="password", required)

**Walidacja:**
- Siła hasła (jak przy rejestracji)
- Zgodność haseł

**Przepływ:**
1. Użytkownik klika link z maila resetującego
2. Astro weryfikuje token (server-side)
3. Jeśli token ważny, renderuje formularz
4. Użytkownik wprowadza nowe hasło
5. Wywołanie `supabase.auth.updateUser({ password: newPassword })`
6. Przekierowanie do `/login` z komunikatem sukcesu

---

#### **Strona informacyjna - reset hasła wysłany** (`/auth/check-email-reset`)
- **Ścieżka:** `src/pages/auth/check-email-reset.astro`
- **Treść:** Analogiczna do `/auth/check-email`, ale z komunikatem o resetowaniu hasła

---

### 3.2. Rozdzielenie odpowiedzialności: Astro vs React

| **Aspekt**                    | **Astro (SSR)**                                      | **React (Client-side)**                        |
|-------------------------------|------------------------------------------------------|-----------------------------------------------|
| Layout i struktura HTML       | ✓ (src/layouts/AuthLayout.astro)                     | -                                             |
| Weryfikacja sesji             | ✓ (middleware, getSession)                           | -                                             |
| Przekierowania (auth)         | ✓ (return redirect)                                  | - (tylko fallback)                            |
| Weryfikacja tokenów URL       | ✓ (params w Astro)                                   | -                                             |
| Renderowanie formularzy       | - (placeholder div)                                  | ✓ (react-hook-form)                           |
| Walidacja formularzy          | -                                                    | ✓ (zod schemas)                               |
| Wywołania Supabase Auth       | ✓ (server-side gdy potrzebne) / React (client-side) | ✓ (głównie client-side w komponentach)       |
| Obsługa błędów API            | -                                                    | ✓ (try-catch, komunikaty w UI)               |
| Zarządzanie stanem formularza | -                                                    | ✓ (useState, useForm)                         |

---

### 3.3. Komponenty React

#### **RegisterForm.tsx**
```typescript
// src/components/auth/RegisterForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createBrowserClient } from '@/db/client-browser';
import { Button, Input, Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui';

const registerSchema = z.object({
  email: z.string().email('Nieprawidłowy format adresu email'),
  password: z.string()
    .min(8, 'Hasło musi mieć minimum 8 znaków')
    .regex(/[A-Z]/, 'Hasło musi zawierać przynajmniej jedną dużą literę')
    .regex(/[0-9]/, 'Hasło musi zawierać przynajmniej jedną cyfrę'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Hasła nie są zgodne',
  path: ['confirmPassword']
});

export function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createBrowserClient();
  
  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' }
  });

  const onSubmit = async (values: z.infer<typeof registerSchema>) => {
    setIsLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
    } else {
      window.location.href = `/auth/check-email?email=${encodeURIComponent(values.email)}`;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* FormFields dla email, password, confirmPassword */}
        {error && <Alert variant="destructive">{error}</Alert>}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Rejestracja...' : 'Zarejestruj się'}
        </Button>
      </form>
    </Form>
  );
}
```


Podobne komponenty: `LoginForm.tsx`, `ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx`

---

### 3.4. Komunikaty błędów i walidacja

| **Scenariusz**                       | **Miejsce walidacji** | **Typ komunikatu** | **Przykład komunikatu**                                |
|--------------------------------------|-----------------------|--------------------|-------------------------------------------------------|
| Niepoprawny format email             | Client (zod)          | Inline (pod polem) | "Nieprawidłowy format adresu email"                   |
| Hasło za krótkie                     | Client (zod)          | Inline             | "Hasło musi mieć minimum 8 znaków"                    |
| Hasła niezgodne                      | Client (zod)          | Inline             | "Hasła nie są zgodne"                                 |
| Email już istnieje (rejestracja)     | Server (Supabase)     | Alert (root)       | "Użytkownik o tym adresie email już istnieje"         |
| Nieprawidłowe dane logowania         | Server (Supabase)     | Alert (root)       | "Nieprawidłowy email lub hasło"                       |
| Konto nie aktywowane                 | Server (Supabase)     | Alert (root)       | "Konto nie zostało aktywowane. Sprawdź swoją pocztę." |
| Link resetujący wygasł               | Server (Astro SSR)    | Komunikat strony   | "Link resetujący wygasł. Poproś o nowy."              |
| Błąd sieciowy                        | Client (catch)        | Toast (Sonner)     | "Błąd połączenia. Spróbuj ponownie."                  |

---

### 3.5. Scenariusze użytkownika

#### **Scenariusz 1: Rejestracja nowego użytkownika**
1. Użytkownik wchodzi na `/register`
2. Wypełnia formularz (email, hasło, potwierdzenie)
3. Kliknięcie "Zarejestruj się" → walidacja client-side
4. **Sukces:** Wywołanie `signUp` → przekierowanie do `/auth/check-email`
5. **Błąd (email istnieje):** Alert na stronie `/register`
6. Użytkownik otwiera maila, klika link aktywacyjny
7. Ląduje na `/auth/confirmed` → automatyczne przekierowanie do `/login?confirmed=true` z komunikatem Toast

#### **Scenariusz 2: Logowanie**
1. Użytkownik wchodzi na `/login`
2. Wprowadza email i hasło
3. Kliknięcie "Zaloguj" → walidacja client-side
4. Wywołanie `signInWithPassword`
5. **Sukces:** Supabase ustawia cookie, middleware wykrywa sesję → redirect do `/`
6. **Błąd:** Alert "Nieprawidłowy email lub hasło"

#### **Scenariusz 3: Odzyskiwanie hasła**
1. Użytkownik klika "Zapomniałem hasła" na `/login`
2. Wchodzi na `/forgot-password`, podaje email
3. Wywołanie `resetPasswordForEmail` → redirect do `/auth/check-email-reset`
4. Użytkownik otwiera maila, klika link resetujący
5. Ląduje na `/reset-password` z tokenem w URL
6. Astro weryfikuje token server-side
7. **Token ważny:** Renderuje formularz nowego hasła
8. Użytkownik wprowadza nowe hasło → `updateUser`
9. **Sukces:** Redirect do `/login` z komunikatem Toast

---

## 4. LOGIKA BACKENDOWA

### 4.1. Endpointy API

**Uwaga:** Większość operacji autentykacji odbywa się bezpośrednio przez Supabase Auth SDK (client-side), bez potrzeby custom API endpoints. Poniżej opisane są miejsca, gdzie backend (Astro SSR) angażuje się w proces.

#### **Endpoint weryfikacji sesji** (Middleware)
- **Lokalizacja:** `src/middleware/index.ts`
- **Funkcja:** Sprawdzenie sesji przy każdym żądaniu do chronionych tras
- **Mechanizm:** Odczyt cookie Supabase, wywołanie `getSession()`
- **Akcje:**
    - Jeśli sesja ważna: Dołączenie `locals.session` i `locals.supabase`
    - Jeśli brak sesji na chronionej trasie: Redirect do `/login`

```typescript
// src/middleware/index.ts
import { defineMiddleware } from 'astro:middleware';
import { createServerClient } from '@/db/client-server';

export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createServerClient(context);
  const { data: { session } } = await supabase.auth.getSession();

  context.locals.supabase = supabase;
  context.locals.session = session;

  // Ochrona tras
  const protectedRoutes = ['/', '/dashboard'];
  const authRoutes = ['/login', '/register'];
  
  if (protectedRoutes.some(route => context.url.pathname.startsWith(route))) {
    if (!session) {
      return context.redirect('/login');
    }
  }

  if (authRoutes.includes(context.url.pathname) && session) {
    return context.redirect('/');
  }

  return next();
});
```


---

#### **Endpoint wylogowania** (opcjonalny)
- **Lokalizacja:** `src/pages/api/auth/logout.ts`
- **Metoda:** `POST`
- **Przepływ:**
    1. Wywołanie `supabase.auth.signOut()`
    2. Usunięcie cookie sesji
    3. Redirect do `/login`

```typescript
// src/pages/api/auth/logout.ts
export const prerender = false;

export async function POST({ locals, redirect }: APIContext) {
  const { supabase } = locals;
  await supabase.auth.signOut();
  return redirect('/login');
}
```


---

### 4.2. Walidacja danych wejściowych

| **Endpoint/Komponent**     | **Walidacja**                                                   | **Biblioteka** | **Miejsce**   |
|----------------------------|-----------------------------------------------------------------|----------------|---------------|
| RegisterForm               | Email format, password strength, password match                 | Zod            | Client-side   |
| LoginForm                  | Email format, password required                                 | Zod            | Client-side   |
| ForgotPasswordForm         | Email format                                                    | Zod            | Client-side   |
| ResetPasswordForm          | Password strength, password match                               | Zod            | Client-side   |
| /auth/confirmed (token)    | Token presence & validity                                       | Supabase SDK   | Server-side   |
| /reset-password (token)    | Token presence & validity                                       | Supabase SDK   | Server-side   |

**Schemat walidacji (przykład):**
```typescript
// src/lib/validation/auth.schemas.ts
import { z } from 'zod';

export const emailSchema = z.string().email('Nieprawidłowy format adresu email');

export const passwordSchema = z.string()
  .min(8, 'Hasło musi mieć minimum 8 znaków')
  .regex(/[A-Z]/, 'Hasło musi zawierać przynajmniej jedną dużą literę')
  .regex(/[0-9]/, 'Hasło musi zawierać przynajmniej jedną cyfrę');

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Hasła nie są zgodne',
  path: ['confirmPassword']
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Hasło jest wymagane')
});
```


---

### 4.3. Obsługa wyjątków

**Błędy Supabase Auth:**
| **Kod błędu**                     | **Scenariusz**                      | **Obsługa**                                      |
|-----------------------------------|-------------------------------------|--------------------------------------------------|
| `user_already_exists`             | Rejestracja z istniejącym emailem   | Alert: "Email już używany"                       |
| `invalid_credentials`             | Nieprawidłowe logowanie             | Alert: "Nieprawidłowy email lub hasło"           |
| `email_not_confirmed`             | Logowanie przed aktywacją           | Alert: "Aktywuj konto poprzez link w mailu"      |
| `invalid_token`                   | Wygasły link aktywacyjny/resetujący | Komunikat na stronie + opcja ponownego wysłania  |
| Network error                     | Brak połączenia                     | Toast (Sonner): "Błąd połączenia"                |

**Przykład obsługi w komponencie:**
```typescript
const onSubmit = async (values) => {
  const { error } = await supabase.auth.signInWithPassword(values);
  
  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      setError('Nieprawidłowy email lub hasło');
    } else if (error.message.includes('Email not confirmed')) {
      setError('Aktywuj swoje konto poprzez link w mailu');
    } else {
      setError('Wystąpił błąd. Spróbuj ponownie później.');
    }
  }
};
```


---

### 4.4. Aktualizacja renderowania stron server-side

**Konfiguracja Astro dla autentykacji:**
- **Output mode:** `server` (już ustawiony w `astro.config.mjs`)
- **Adapter:** `@astrojs/node` (standalone mode)
- **Middleware:** Aktywny dla wszystkich tras

**Przykład strony z weryfikacją sesji:**
```astro
---
// src/pages/index.astro
import Layout from '@/layouts/Layout.astro';

const { session } = Astro.locals;

if (!session) {
  return Astro.redirect('/login');
}
---

<Layout title="Dashboard">
  <h1>Witaj, {session.user.email}</h1>
  <!-- IntegratedDashboardPage -->
</Layout>
```


---

## 5. SYSTEM AUTENTYKACJI - INTEGRACJA Z SUPABASE

### 5.1. Inicjalizacja klientów Supabase

**Client-side (przeglądarki):**
```typescript
// src/db/client-browser.ts
import { createBrowserClient as createClient } from '@supabase/ssr';

export function createBrowserClient() {
  return createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true
      }
    }
  );
}
```


**Server-side (Astro):**
```typescript
// src/db/client-server.ts
import { createServerClient as createClient } from '@supabase/ssr';

export function createServerClient(context: AstroContext) {
  return createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(key) {
          return context.cookies.get(key)?.value;
        },
        set(key, value, options) {
          context.cookies.set(key, value, options);
        },
        remove(key, options) {
          context.cookies.delete(key, options);
        }
      }
    }
  );
}
```


---

### 5.2. Funkcje Supabase Auth używane w systemie

| **Funkcja**                                  | **Użycie**                                  | **Miejsce**                    |
|----------------------------------------------|---------------------------------------------|--------------------------------|
| `supabase.auth.signUp()`                     | Rejestracja nowego użytkownika              | RegisterForm.tsx               |
| `supabase.auth.signInWithPassword()`         | Logowanie                                   | LoginForm.tsx                  |
| `supabase.auth.signOut()`                    | Wylogowanie                                 | /api/auth/logout.ts            |
| `supabase.auth.getSession()`                 | Sprawdzenie bieżącej sesji                  | Middleware, strony Astro       |
| `supabase.auth.resetPasswordForEmail()`      | Wysłanie maila resetującego hasło           | ForgotPasswordForm.tsx         |
| `supabase.auth.updateUser({ password })`     | Ustawienie nowego hasła                     | ResetPasswordForm.tsx          |
| `supabase.auth.verifyOtp()`                  | Weryfikacja tokena aktywacyjnego (optional) | /auth/confirmed.astro          |

---

### 5.3. Konfiguracja maili Supabase Auth

**Wymagane szablony email w Supabase Dashboard:**
1. **Confirm signup** (aktywacja konta)
    - Link: `{{ .ConfirmationURL }}`
    - Redirect URL: `https://yourdomain.com/auth/confirmed`

2. **Reset password** (resetowanie hasła)
    - Link: `{{ .ConfirmationURL }}`
    - Redirect URL: `https://yourdomain.com/reset-password`

**Konfiguracja Site URL i Redirect URLs w Supabase:**
- Site URL: `https://yourdomain.com`
- Redirect URLs:
    - `https://yourdomain.com/auth/confirmed`
    - `https://yourdomain.com/reset-password`

---

### 5.4. Row-Level Security (RLS) dla autentykacji

**Polityki RLS dla tabeli `accounts`:**
```sql
-- Użytkownik może widzieć tylko swoje konta
CREATE POLICY "Users can view own accounts"
  ON accounts FOR SELECT
  USING (auth.uid() = user_id);

-- Użytkownik może tworzyć tylko swoje konta
CREATE POLICY "Users can create own accounts"
  ON accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Użytkownik może aktualizować tylko swoje konta
CREATE POLICY "Users can update own accounts"
  ON accounts FOR UPDATE
  USING (auth.uid() = user_id);

-- Użytkownik może usuwać tylko swoje konta
CREATE POLICY "Users can delete own accounts"
  ON accounts FOR DELETE
  USING (auth.uid() = user_id);
```


**Automatyczne usuwanie danych użytkownika:**
- Kaskadowe usuwanie poprzez relację `ON DELETE CASCADE` (już w schemacie DB)
- Przy usunięciu użytkownika z `auth.users`, wszystkie jego konta i wpisy wartości są automatycznie usuwane

---

## 6. STRUKTURA PLIKÓW I MODUŁÓW

```
src/
├── pages/
│   ├── index.astro                   # Dashboard (chroniony)
│   ├── login.astro                   # Strona logowania (SSR)
│   ├── register.astro                # Strona rejestracji (SSR)
│   ├── forgot-password.astro         # Strona zapomnienia hasła (SSR)
│   ├── reset-password.astro          # Strona resetowania hasła (SSR)
│   ├── settings.astro                # Ustawienia użytkownika (chroniony, SSR)
│   ├── auth/
│   │   ├── check-email.astro         # Komunikat po rejestracji (statyczny)
│   │   ├── check-email-reset.astro   # Komunikat po prośbie o reset (statyczny)
│   │   ├── confirmed.astro           # Potwierdzenie aktywacji (SSR, redirect)
│   │   └── resend-activation.astro   # Ponowne wysłanie maila aktywacyjnego (SSR)
│   └── api/
│       └── auth/
│           ├── logout.ts             # Endpoint wylogowania (POST)
│           ├── delete-account.ts     # Endpoint usuwania konta (POST)
│           └── resend-activation.ts  # Endpoint ponownego wysyłania aktywacji (POST)
├── components/
│   ├── auth/
│   │   ├── RegisterForm.tsx          # Formularz rejestracji (React)
│   │   ├── LoginForm.tsx             # Formularz logowania (React)
│   │   ├── ForgotPasswordForm.tsx    # Formularz zapomnienia hasła (React)
│   │   ├── ResetPasswordForm.tsx     # Formularz resetowania hasła (React)
│   │   ├── DeleteAccountForm.tsx     # Formularz usuwania konta (React)
│   │   └── ResendActivationForm.tsx  # Formularz ponownego wysłania aktywacji (React)
│   └── settings/
│       └── UserSettings.tsx          # Komponenty ustawień użytkownika (React)
├── layouts/
│   ├── AuthLayout.astro              # Layout dla stron autentykacji
│   └── SettingsLayout.astro          # Layout dla strony ustawień
├── middleware/
│   └── index.ts                      # Middleware sesji i ochrony tras (UWAGA: integracja z istniejącym)
├── db/
│   ├── supabase.client.ts            # Główny klient Supabase (ISTNIEJĄCY - do weryfikacji)
│   ├── client-browser.ts             # Klient Supabase dla przeglądarki (NOWY)
│   ├── client-server.ts              # Klient Supabase dla serwera (NOWY)
│   └── database.types.ts             # Typy generowane przez Supabase
├── lib/
│   └── validation/
│       └── auth.schemas.ts           # Schematy walidacji Zod dla formularzy
└── types.ts                          # Typy DTO i Command Models
```


**UWAGI dotyczące struktury:**
- **ISTNIEJĄCY KOD:** Plik `src/db/supabase.client.ts` już istnieje w projekcie. Należy zweryfikować czy potrzebne są osobne pliki `client-browser.ts` i `client-server.ts`, czy też należy rozszerzyć istniejący plik.
- **MIDDLEWARE:** Plik `src/middleware/index.ts` już istnieje. Nowa implementacja musi być zintegrowana z istniejącą logiką, nie nadpisywać jej całkowicie.
- **AuthLayout.astro:** Wymaga szczegółowej specyfikacji (patrz sekcja 6.1 poniżej).


### 6.1. Szczegóły layoutów

#### **AuthLayout.astro**
Layout dla wszystkich stron autentykacji (login, register, forgot-password, reset-password).

**Struktura:**
- Prosty, minimalistyczny design
- Logo Assetly (tymczasowe tekstowe)
- Centrowany kontener formularza
- Opcjonalny link powrotny (np. "← Powrót do logowania")
- Brak nawigacji użytkownika (bo niezalogowany)
- Responsywny na mobile (pełna szerokość na małych ekranach)

**Przykładowa struktura HTML:**
```astro
---
// src/layouts/AuthLayout.astro
interface Props {
  title: string;
  backLink?: { href: string; text: string };
}

const { title, backLink } = Astro.props;
---

<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} | Assetly</title>
</head>
<body class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
  <div class="w-full max-w-md">
    {backLink && (
      <a href={backLink.href} class="text-sm text-gray-600 hover:text-gray-900 mb-4 inline-block">
        ← {backLink.text}
      </a>
    )}
    <div class="bg-white rounded-lg shadow-md p-8">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Assetly</h1>
      </div>
      <slot />
    </div>
  </div>
</body>
</html>
```

#### **SettingsLayout.astro**
Layout dla strony ustawień użytkownika (chronionej).

**Struktura:**
- Nagłówek z logo i menu użytkownika (wylogowanie)
- Sidebar z opcjami ustawień (na razie tylko "Konto")
- Główna treść z formularzami/opcjami
- Responsywny (sidebar zamienia się w tabs na mobile)

---

## 7. USUWANIE KONTA UŻYTKOWNIKA (US-011)

### 7.1. Opis funkcjonalności

**Lokalizacja:** Strona `/settings` (nowa strona, chroniona)

**Przepływ:**
1. Użytkownik wchodzi na `/settings` (zalogowany)
2. W sekcji "Konto" znajduje przycisk "Usuń konto" w strefie niebezpiecznej (danger zone)
3. Po kliknięciu otwiera się modal z ostrzeżeniem i formularzem
4. Użytkownik musi wpisać swoje hasło jako potwierdzenie
5. Po zatwierdzeniu:
   - Wywołanie API endpoint `/api/auth/delete-account` (POST)
   - Backend weryfikuje hasło poprzez Supabase Auth
   - **Sukces:** Usunięcie użytkownika z `auth.users` (kaskadowo usuwa wszystkie powiązane dane)
   - Automatyczne wylogowanie i przekierowanie do `/login` z komunikatem Toast
6. **Błąd (niepoprawne hasło):** Alert w modalu "Nieprawidłowe hasło"

### 7.2. Strona ustawień

**Ścieżka:** `src/pages/settings.astro`
**Layout:** `SettingsLayout.astro`
**Główny komponent:** `UserSettings.tsx` (React, client:load)

**Sekcje na stronie:**
1. **Informacje o koncie** (tylko do odczytu):
   - Email użytkownika
   - Data rejestracji (opcjonalnie)

2. **Zmiana hasła** (opcjonalnie w MVP):
   - Link do `/forgot-password` z informacją "Aby zmienić hasło, użyj funkcji resetowania hasła"

3. **Danger Zone**:
   - Sekcja wizualnie oddzielona (czerwone obramowanie)
   - Przycisk "Usuń konto" z warningiem
   - Komunikat: "Ta operacja jest nieodwracalna. Wszystkie Twoje dane zostaną trwale usunięte."

### 7.3. Komponent DeleteAccountForm.tsx

```typescript
// src/components/auth/DeleteAccountForm.tsx
import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createBrowserClient } from '@/db/client-browser';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, Input, Button, Alert } from '@/components/ui';

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Hasło jest wymagane')
});

export function DeleteAccountForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createBrowserClient();
  
  const form = useForm({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { password: '' }
  });

  const onSubmit = async (values: z.infer<typeof deleteAccountSchema>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Weryfikacja hasła poprzez re-autentykację
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error('Brak danych użytkownika');
      }
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: values.password
      });
      
      if (signInError) {
        setError('Nieprawidłowe hasło');
        setIsLoading(false);
        return;
      }
      
      // Wywołanie endpoint do usunięcia konta
      const response = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Błąd podczas usuwania konta');
      }
      
      // Przekierowanie nastąpi automatycznie przez backend
      window.location.href = '/login?deleted=true';
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystąpił błąd');
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button 
        variant="destructive" 
        onClick={() => setIsOpen(true)}
      >
        Usuń konto
      </Button>
      
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć konto?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta operacja jest nieodwracalna. Wszystkie Twoje dane (konta, historia wartości) zostaną trwale usunięte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Potwierdź swoim hasłem</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Wprowadź hasło" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {error && <Alert variant="destructive" className="mt-4">{error}</Alert>}
              
              <AlertDialogFooter className="mt-6">
                <AlertDialogCancel disabled={isLoading}>Anuluj</AlertDialogCancel>
                <Button type="submit" variant="destructive" disabled={isLoading}>
                  {isLoading ? 'Usuwanie...' : 'Usuń konto'}
                </Button>
              </AlertDialogFooter>
            </form>
          </Form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

### 7.4. API Endpoint - Usuwanie konta

**Ścieżka:** `src/pages/api/auth/delete-account.ts`

```typescript
// src/pages/api/auth/delete-account.ts
import type { APIContext } from 'astro';

export const prerender = false;

export async function POST({ locals, redirect }: APIContext) {
  const { supabase, session } = locals;
  
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Usunięcie użytkownika z Supabase Auth
    // Kaskadowe usuwanie danych obsłuży RLS i ON DELETE CASCADE
    const { error } = await supabase.auth.admin.deleteUser(session.user.id);
    
    if (error) {
      throw error;
    }
    
    // Wylogowanie
    await supabase.auth.signOut();
    
    return redirect('/login?deleted=true');
    
  } catch (error) {
    console.error('Error deleting account:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete account' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

**UWAGA:** W środowisku produkcyjnym `supabase.auth.admin.deleteUser()` wymaga klucza service role. Alternatywnie można użyć Supabase Edge Function lub Database Function do usuwania użytkownika.

---

## 8. PONOWNE WYSYŁANIE MAILA AKTYWACYJNEGO

### 8.1. Scenariusze użycia

1. **Po wygaśnięciu linku aktywacyjnego:**
   - Użytkownik ląduje na `/auth/confirmed` z błędem tokena
   - Widzi formularz do ponownego wysłania maila

2. **Logowanie przed aktywacją:**
   - Użytkownik próbuje się zalogować
   - Otrzymuje błąd "Email not confirmed"
   - W komunikacie błędu znajduje się link do `/auth/resend-activation`

### 8.2. Strona resend-activation

**Ścieżka:** `src/pages/auth/resend-activation.astro`
**Layout:** `AuthLayout.astro`
**Główny komponent:** `ResendActivationForm.tsx` (React, client:load)

**Komponent ResendActivationForm.tsx:**
```typescript
// src/components/auth/ResendActivationForm.tsx
import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createBrowserClient } from '@/db/client-browser';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, Input, Button, Alert } from '@/components/ui';

const resendSchema = z.object({
  email: z.string().email('Nieprawidłowy format adresu email')
});

export function ResendActivationForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createBrowserClient();
  
  const form = useForm({
    resolver: zodResolver(resendSchema),
    defaultValues
|-----------------------------------------------------|---------------------------------------------------------------------------------------------------|
| Użytkownik klika ponownie link aktywacyjny          | Supabase zwraca błąd "Token już użyty" → komunikat "Konto już aktywowane, przejdź do logowania"  |
| Użytkownik próbuje się zalogować przed aktywacją    | Błąd "Email not confirmed" → komunikat z linkiem do ponownego wysłania maila aktywacyjnego       |
| Link resetujący hasło wygasł                        | `/reset-password` wykrywa błąd tokena → komunikat + przycisk "Poproś o nowy link"                |
| Użytkownik próbuje wejść na `/login` będąc zalogowanym | Middleware wykrywa sesję → redirect do `/`                                                       |
| Użytkownik próbuje wejść na `/` będąc wylogowanym   | Middleware nie wykrywa sesji → redirect do `/login`                                               |
| Błąd sieciowy podczas rejestracji/logowania         | Wyświetlenie Toast (Sonner) z komunikatem "Błąd połączenia. Spróbuj ponownie."                   |
| Użytkownik zamyka kartę podczas rejestracji         | Sesja nie jest utworzona, użytkownik musi się zalogować po aktywacji                              |

---

## 8. BEZPIECZEŃSTWO

### 8.1. Mechanizmy bezpieczeństwa

1. **Hashowanie haseł:** Obsługiwane przez Supabase Auth (bcrypt)
2. **HTTPS:** Wymagany w produkcji (wszystkie dane przesyłane szyfrowanym kanałem)
3. **CSRF Protection:** Wbudowany w Supabase Auth (PKCE flow)
4. **Rate limiting:** Konfiguracja w Supabase Dashboard (domyślnie włączone)
5. **JWT Tokens:** Krótki czas życia (default 1h), automatyczne odświeżanie
6. **Secure Cookies:** Flagi `httpOnly`, `secure`, `sameSite` dla cookie sesji
7. **Row-Level Security:** Wszystkie zapytania do `accounts` i `value_entries` autoryzowane przez RLS

### 8.2. Dobre praktyki zaimplementowane

- Generyczne komunikaty błędów logowania (nie ujawnianie czy email istnieje)
- Wymuszenie siły hasła (min. 8 znaków, 1 duża litera, 1 cyfra)
- Jednorazowe linki aktywacyjne i resetujące
- Ograniczony czas życia tokenów w linkach (default 24h)
- Automatyczne wylogowanie po wygaśnięciu sesji (obsługiwane przez Supabase)
- Brak przechowywania haseł w plain text (nigdzie w systemie)

---

## 9. TESTY I WALIDACJA

### 9.1. Przypadki testowe

| **ID** | **Scenariusz**                                | **Oczekiwany rezultat**                          |
|--------|-----------------------------------------------|--------------------------------------------------|
| T-001  | Rejestracja z poprawnymi danymi               | Email wysłany, przekierowanie do check-email     |
| T-002  | Rejestracja z istniejącym emailem             | Komunikat błędu "Email już używany"              |
| T-003  | Rejestracja z hasłem < 8 znaków               | Walidacja client-side, brak wywołania API        |
| T-004  | Logowanie z poprawnymi danymi                 | Sesja utworzona, przekierowanie do `/`           |
| T-005  | Logowanie z niepoprawnym hasłem               | Komunikat "Nieprawidłowy email lub hasło"        |
| T-006  | Logowanie przed aktywacją konta               | Komunikat "Aktywuj konto"                        |
| T-007  | Kliknięcie linku aktywacyjnego                | Konto aktywowane, komunikat sukcesu              |
| T-008  | Kliknięcie wygasłego linku aktywacyjnego      | Komunikat "Link wygasł"                          |
| T-009  | Reset hasła z poprawnym emailem               | Email wysłany, przekierowanie do check-email-reset |
| T-010  | Kliknięcie linku resetującego hasło           | Formularz nowego hasła wyświetlony               |
| T-011  | Ustawienie nowego hasła                       | Hasło zmienione, przekierowanie do `/login`      |
| T-012  | Próba wejścia na `/` bez sesji                | Przekierowanie do `/login`                       |
| T-013  | Próba wejścia na `/login` z aktywną sesją     | Przekierowanie do `/`                            |
| T-014  | Wylogowanie                                   | Sesja usunięta, przekierowanie do `/login`       |

---

## 10. PODSUMOWANIE I KLUCZOWE DECYZJE ARCHITEKTONICZNE

1. **Supabase Auth jako single source of truth** - Cała logika autentykacji delegowana do Supabase, minimalizacja custom kodu
2. **Server-side rendering dla autentykacji** - Wszystkie strony auth renderowane przez Astro SSR dla lepszego SEO i bezpieczeństwa
3. **React tylko dla formularzy** - Komponenty React używane wyłącznie do obsługi formularzy (interaktywność), reszta statyczna
4. **Middleware dla ochrony tras** - Centralne miejsce do weryfikacji sesji, unikanie duplikacji kodu
5. **Client-side walidacja z Zod** - Szybkie feedback dla użytkownika, mniej requestów do serwera
6. **Komunikaty generyczne dla logowania** - Security best practice, nie ujawnianie czy email istnieje w bazie
7. **Brak custom tokenów** - Wykorzystanie wbudowanych mechanizmów Supabase (maile aktywacyjne, reset hasła)
8. **Row-Level Security** - Automatyczna autoryzacja na poziomie bazy danych, bezpieczeństwo przez design

---

## 11. NASTĘPNE KROKI (IMPLEMENTACJA)

1. Utworzenie layoutu `AuthLayout.astro`
2. Implementacja middleware w `src/middleware/index.ts`
3. Utworzenie klientów Supabase (client-browser.ts, client-server.ts)
4. Implementacja schematów walidacji Zod w `auth.schemas.ts`
5. Utworzenie stron Astro dla autentykacji (login, register, forgot-password, reset-password, auth/*)
6. Implementacja komponentów React dla formularzy (RegisterForm, LoginForm, etc.)
7. Konfiguracja szablonów email w Supabase Dashboard
8. Konfiguracja redirect URLs w Supabase Dashboard
9. Testowanie wszystkich scenariuszy użytkownika
10. Integracja z istniejącym dashboardem (dodanie wylogowania w menu użytkownika)

---
