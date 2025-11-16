# Plan: Konfiguracja Gmail SMTP dla Rejestracji Użytkowników

## Problem
Rejestracja nowych użytkowników nie wysyła emaili z linkiem aktywacyjnym. Użytkownicy widzą komunikat sukcesu, ale nie otrzymują wiadomości email. Obecnie w trybie lokalnym używany jest Inbucket (testowy serwer email), a potwierdzenia emaili są wyłączone w konfiguracji Supabase.

## Cel
Skonfigurować Gmail SMTP do wysyłania prawdziwych emaili aktywacyjnych podczas rejestracji oraz włączyć wymaganie potwierdzenia emaila.

---

## Krok 1: Konfiguracja Gmail - Wygenerowanie App Password

### Dlaczego potrzebne?
Gmail nie pozwala na używanie zwykłego hasła do konta w aplikacjach zewnętrznych. Trzeba wygenerować specjalne "App Password" (hasło aplikacji).

### Kroki do wykonania:

1. **Włącz weryfikację dwuetapową (2FA)** na koncie Gmail:
   - Przejdź do https://myaccount.google.com/security
   - W sekcji "Signing in to Google" kliknij "2-Step Verification"
   - Postępuj zgodnie z instrukcjami, aby włączyć 2FA

2. **Wygeneruj App Password**:
   - Przejdź do https://myaccount.google.com/apppasswords
   - Wybierz "Mail" jako aplikację
   - Wybierz "Other (Custom name)" jako urządzenie
   - Wpisz nazwę: "Assetly SMTP"
   - Kliknij "Generate"
   - **Skopiuj i zapisz wygenerowane hasło** (16 znaków bez spacji)
   - ⚠️ **WAŻNE**: To hasło pojawi się tylko raz, zapisz je bezpiecznie!

### Wynik:
Hasło w formacie: `abcd efgh ijkl mnop` (użyj bez spacji: `abcdefghijklmnop`)

---

## Krok 2: Aktualizacja Zmiennych Środowiskowych

### Plik: `.env` (lokalny) i zmienne środowiskowe na produkcji

Dodaj nowe zmienne:

```env
# Existing variables
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key

# SMTP Configuration (NEW)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=twoj-email@gmail.com
SMTP_PASS=abcdefghijklmnop
SMTP_SENDER_NAME=Assetly
SMTP_SENDER_EMAIL=twoj-email@gmail.com
```

### Plik: `.env.example`

Zaktualizuj szablon:

```env
SUPABASE_URL=
SUPABASE_KEY=

# SMTP Configuration for email sending
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_SENDER_NAME=Assetly
SMTP_SENDER_EMAIL=
```

### Na produkcji (Cloudflare Pages):
Ustaw zmienne środowiskowe w Cloudflare Dashboard:
1. Przejdź do swojego projektu w Cloudflare Pages
2. Settings > Environment Variables
3. Dodaj wszystkie zmienne `SMTP_*` wymienione powyżej
4. ⚠️ **WAŻNE**: Dodaj je zarówno dla Production jak i Preview environments
5. Po dodaniu zmiennych, wdróż aplikację ponownie (redeploy)

---

## Krok 3: Aktualizacja Konfiguracji Supabase

### Plik: `supabase/config.toml`

#### 3.1 Włącz potwierdzenia emaili

```toml
[auth.email]
# Change from false to true
enable_confirmations = true
double_confirm_changes = true
enable_signup = true
```

#### 3.2 Włącz i skonfiguruj SMTP dla Gmail

Odkomentuj i zaktualizuj sekcję `[auth.email.smtp]`:

```toml
[auth.email.smtp]
enabled = true
host = "smtp.gmail.com"
port = 587
user = "env(SMTP_USER)"
pass = "env(SMTP_PASS)"
admin_email = "env(SMTP_SENDER_EMAIL)"
sender_name = "env(SMTP_SENDER_NAME)"

# TLS/SSL settings for Gmail
max_frequency = "1s"
```

#### 3.3 Opcjonalnie: Dostosuj szablony emaili

Jeśli chcesz zmienić treść emaili, możesz dostosować szablony w Supabase Dashboard:
- Authentication > Email Templates
- Lub dodaj custom templates w `supabase/templates/`

**Domyślne szablony Supabase są w języku angielskim.** Rozważ utworzenie polskich wersji.

---

## Krok 4: Weryfikacja i Restart Supabase (Lokalnie)

### Dla local development:

1. **Zatrzymaj Supabase**:
   ```bash
   npx supabase stop
   ```

2. **Zastosuj zmiany konfiguracji**:
   ```bash
   npx supabase start
   ```

3. **Sprawdź logi SMTP**:
   ```bash
   npx supabase status
   ```

### Dla produkcji (Supabase Cloud):
Jeśli używasz Supabase Cloud (hosted):
- Przejdź do Dashboard Supabase
- Settings > Auth > SMTP Settings
- Wprowadź dane konfiguracyjne Gmail SMTP
- Włącz email confirmations

**Cloudflare Pages**: Zmienne środowiskowe ustawione w dashboardzie zostaną automatycznie użyte przy następnym wdrożeniu.

---

## Krok 5: Aktualizacja Kodu (Opcjonalnie)

### 5.1 Endpoint rejestracji (już poprawnie skonfigurowany)

Plik `src/pages/api/auth/register.ts` już używa:
```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: { emailRedirectTo },
});
```

✅ **Nie wymaga zmian** - Supabase automatycznie wyśle email gdy SMTP jest skonfigurowany.

### 5.2 Komunikaty dla użytkownika

Rozważ aktualizację komunikatu sukcesu, aby był bardziej precyzyjny:

**Opcja 1**: Obecny komunikat (wystarczający):
```typescript
return new Response(
  JSON.stringify({
    message: 'Rejestracja rozpoczęta. Sprawdź skrzynkę e‑mail i potwierdź konto, korzystając z linku aktywacyjnego.',
  }),
  { status: 200, headers: { 'Content-Type': 'application/json' } }
);
```

**Opcja 2**: Bardziej szczegółowy (opcjonalnie):
```typescript
return new Response(
  JSON.stringify({
    message: `Link aktywacyjny został wysłany na adres ${email}. Sprawdź skrzynkę odbiorczą (oraz folder spam) i kliknij link, aby aktywować konto.`,
  }),
  { status: 200, headers: { 'Content-Type': 'application/json' } }
);
```

---

## Krok 6: Testowanie

### 6.1 Test lokalny (z prawdziwym Gmail SMTP)

1. **Upewnij się, że wszystkie zmienne środowiskowe są ustawione** w `.env`
2. **Restart Supabase lokalnie**:
   ```bash
   npx supabase stop
   npx supabase start
   ```
3. **Uruchom aplikację**:
   ```bash
   npm run dev
   ```
4. **Zarejestruj nowego użytkownika** z prawdziwym adresem email
5. **Sprawdź skrzynkę odbiorczą** - powinien pojawić się email z linkiem aktywacyjnym
6. **Kliknij link** i zweryfikuj, czy użytkownik zostaje przekierowany do `/login`
7. **Zaloguj się** na nowo utworzone konto

### 6.2 Test produkcyjny

1. **Deploy zmian** na Cloudflare Pages (git push do repozytorium)
2. **Ustaw zmienne środowiskowe SMTP** w Cloudflare Pages Dashboard (Settings > Environment Variables)
3. **Zarejestruj testowego użytkownika** na https://assetly.pages.dev/
4. **Sprawdź email i aktywuj konto**
5. **Sprawdź redirect URL** - link aktywacyjny powinien kierować na https://assetly.pages.dev/login

### 6.3 Sprawdzanie błędów

#### Problem: Email nie przychodzi
- Sprawdź folder SPAM
- Sprawdź logi Supabase: `npx supabase logs --db postgres`
- Sprawdź czy App Password jest poprawny
- Sprawdź czy 2FA jest włączone na koncie Gmail

#### Problem: SMTP authentication failed
- Sprawdź czy `SMTP_USER` to pełny adres email (@gmail.com)
- Sprawdź czy `SMTP_PASS` to App Password (nie zwykłe hasło)
- Sprawdź czy nie ma spacji w App Password

#### Problem: Link aktywacyjny nie działa
- Sprawdź `emailRedirectTo` w `register.ts`
- Sprawdź czy URL jest dodany do "Redirect URLs" w Supabase Dashboard (Auth > URL Configuration)

---

## Krok 7: Customizacja Szablonów Email (Wymagane)

### 7.1 Polskie szablony emaili

Supabase domyślnie wysyła emaile po angielsku. Dla polskich użytkowników **musisz** dostosować szablony.

**Kroki do wykonania:**

1. **Przejdź do Supabase Dashboard**:
   - Authentication > Email Templates

2. **Dostosuj szablon "Confirm signup"**:
   - Kliknij "Confirm signup" w liście szablonów
   - Podmień treść na poniższą:

```html
<h2>Potwierdź swój adres email</h2>
<p>Witaj!</p>
<p>Dziękujemy za rejestrację w Assetly - aplikacji do śledzenia Twojego majątku.</p>
<p>Aby aktywować konto, kliknij poniższy link:</p>
<p><a href="{{ .ConfirmationURL }}">Aktywuj konto</a></p>
<p><em>Link jest ważny przez 24 godziny.</em></p>
<p>Jeśli to nie Ty zarejestrowałeś to konto, zignoruj tę wiadomość.</p>
<br>
<p>Pozdrawiamy,<br>Zespół Assetly</p>
```

3. **Dostosuj inne szablony** (opcjonalnie teraz, ale zalecane):
   - **Magic Link**: Logowanie bez hasła (jeśli włączone)
   - **Change Email Address**: Potwierdzenie zmiany emaila
   - **Reset Password**: Reset hasła

4. **Zapisz zmiany** i przetestuj wysyłkę

### 7.2 Monitoring wysyłanych emaili

Rozważ dodanie logowania dla śledzenia wysłanych emaili:
- Logi w Supabase Dashboard
- Monitoring w Gmail (Sent folder)
- Dodanie tabeli `email_logs` w bazie danych (dla audytu)

### 7.3 Konfiguracja Redirect URLs w Supabase

**WYMAGANE** dla poprawnego działania linków aktywacyjnych:

1. Przejdź do Supabase Dashboard
2. Authentication > URL Configuration
3. W sekcji "Redirect URLs" dodaj:
   - `https://assetly.pages.dev/**` (produkcja)
   - `http://localhost:4321/**` (local development)
4. Zapisz zmiany

Bez tego linki w emailach mogą nie działać!

### 7.4 Rate limiting

Gmail ma limity wysyłania:
- **500 emaili/dzień** dla darmowych kont
- **2000 emaili/dzień** dla Google Workspace

Dla większej skali rozważ:
- SendGrid (99 darmowych emaili/dzień, potem płatne)
- Mailgun
- AWS SES

---

## Podsumowanie Wymaganych Działań

### Gmail:
- ✅ Włącz 2FA na koncie Gmail
- ✅ Wygeneruj App Password
- ✅ Zapisz bezpiecznie App Password

### Zmienne środowiskowe:
- ✅ Dodaj `SMTP_*` zmienne do `.env`
- ✅ Zaktualizuj `.env.example`
- ✅ Ustaw zmienne w Cloudflare Pages Dashboard (Production + Preview)

### Supabase config:
- ✅ Włącz `enable_confirmations = true`
- ✅ Skonfiguruj `[auth.email.smtp]` dla Gmail
- ✅ Restart Supabase lokalnie

### Testowanie:
- ✅ Test rejestracji lokalnie
- ✅ Sprawdź email i link aktywacyjny
- ✅ Test na produkcji

### Customizacja emaili:
- ✅ Dostosuj szablon "Confirm signup" na polski
- ✅ Dodaj Redirect URLs w Supabase Dashboard
- ⚪ Dostosuj pozostałe szablony (Magic Link, Reset Password)

### Opcjonalnie:
- ⚪ Monitoring wysyłanych emaili
- ⚪ Lepszy komunikat sukcesu

---

## Potencjalne Ryzyka

1. **App Password może przestać działać** - Gmail może dezaktywować nieużywane App Passwords
   - Rozwiązanie: Generuj nowe co jakiś czas

2. **Limity wysyłania Gmail** - 500 emaili/dzień
   - Rozwiązanie: Monitoruj liczbę rejestracji, przejdź na dedykowany serwis SMTP przy wzroście

3. **Emaile trafiają do SPAM**
   - Rozwiązanie: Skonfiguruj SPF/DKIM records (wymaga własnej domeny)
   - Alternatywa: Użyj dedykowanego serwisu SMTP z dobrą reputacją

4. **Security concerns** - App Password w zmiennych środowiskowych
   - Rozwiązanie: Używaj secrets management (Docker secrets, Vault)
   - Minimalne: Nigdy nie commituj `.env` do repo

---

## Odpowiedzi na Kluczowe Decyzje

1. **SMTP Provider**: Gmail (wystarczy dla MVP, limit 500 emaili/dzień)
2. **Szablony emaili**: Dostosowane od razu na polski (krok wymagany)
3. **Domena**: Na start `https://assetly.pages.dev/` (dedykowana domena w przyszłości)
4. **Hosting**: Cloudflare Pages

---

## Next Steps

Po zatwierdzeniu tego planu:
1. Przejdę do implementacji zmian w plikach
2. Pomogę w konfiguracji Gmail App Password (krok po kroku)
3. Przetestuję funkcjonalność lokalnie
4. Przygotujemy checklist do wdrożenia na produkcję
