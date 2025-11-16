# Szablony Email dla Supabase

## Cel
Przygotowanie profesjonalnych szablonów email dla:
1. Potwierdzenie nowego konta
2. Reset hasła

## Konfiguracja w Supabase Dashboard

### Gdzie znaleźć ustawienia email templates:

1. Zaloguj się do Supabase Dashboard
2. Wybierz swój projekt
3. Przejdź do **Authentication** → **Email Templates**
4. Znajdziesz tam 4 szablony:
   - **Confirm signup** - potwierdzenie rejestracji
   - **Magic Link** - logowanie przez link
   - **Change Email Address** - zmiana adresu email
   - **Reset Password** - reset hasła

## Szablon 1: Potwierdzenie Rejestracji (Confirm Signup)

### Subject Line:
```
Potwierdź swoje konto w Assetly
```

### HTML Template:
```html
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Potwierdź konto - Assetly</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Assetly</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600;">Witaj w Assetly!</h2>
              
              <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                Dziękujemy za rejestrację. Aby aktywować swoje konto, kliknij w poniższy przycisk:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Potwierdź konto
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 20px; color: #4a5568; font-size: 14px; line-height: 1.6;">
                Jeśli przycisk nie działa, skopiuj i wklej poniższy link do przeglądarki:
              </p>
              
              <p style="margin: 0 0 30px; padding: 12px; background-color: #f7fafc; border-radius: 4px; word-break: break-all; font-size: 13px; color: #667eea;">
                {{ .ConfirmationURL }}
              </p>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
              
              <p style="margin: 0; color: #718096; font-size: 13px; line-height: 1.6;">
                Jeśli nie zakładałeś konta w Assetly, zignoruj tę wiadomość.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f7fafc; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #718096; font-size: 12px;">
                © 2025 Assetly. Wszystkie prawa zastrzeżone.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

## Szablon 2: Reset Hasła (Reset Password)

### Subject Line:
```
Resetowanie hasła - Assetly
```

### HTML Template:
```html
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset hasła - Assetly</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Assetly</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600;">Resetowanie hasła</h2>
              
              <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta w Assetly.
              </p>
              
              <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                Aby ustawić nowe hasło, kliknij w poniższy przycisk:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Zresetuj hasło
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 20px; color: #4a5568; font-size: 14px; line-height: 1.6;">
                Jeśli przycisk nie działa, skopiuj i wklej poniższy link do przeglądarki:
              </p>
              
              <p style="margin: 0 0 30px; padding: 12px; background-color: #f7fafc; border-radius: 4px; word-break: break-all; font-size: 13px; color: #667eea;">
                {{ .ConfirmationURL }}
              </p>
              
              <div style="margin: 30px 0; padding: 16px; background-color: #fef5e7; border-left: 4px solid #f39c12; border-radius: 4px;">
                <p style="margin: 0; color: #7d6608; font-size: 14px; line-height: 1.6;">
                  ⏱️ <strong>Ten link wygasa po 1 godzinie</strong> ze względów bezpieczeństwa.
                </p>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
              
              <p style="margin: 0; color: #718096; font-size: 13px; line-height: 1.6;">
                Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość. Twoje hasło pozostanie bez zmian.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f7fafc; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #718096; font-size: 12px;">
                © 2025 Assetly. Wszystkie prawa zastrzeżone.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

## Instrukcja wdrożenia

### Krok 1: Confirm Signup Template
1. W Supabase Dashboard przejdź do **Authentication** → **Email Templates**
2. Kliknij na **Confirm signup**
3. W polu **Subject** wklej: `Potwierdź swoje konto w Assetly`
4. W polu **Message (Body)** wklej cały kod HTML z Szablonu 1
5. Kliknij **Save**

### Krok 2: Reset Password Template
1. W tej samej sekcji kliknij na **Reset Password**
2. W polu **Subject** wklej: `Resetowanie hasła - Assetly`
3. W polu **Message (Body)** wklej cały kod HTML z Szablonu 2
4. Kliknij **Save**

## Testowanie

### Test potwierdzenia konta:
1. Zarejestruj nowe konto testowe
2. Sprawdź skrzynkę email
3. Zweryfikuj wygląd i działanie przycisku

### Test resetu hasła:
1. Użyj funkcji "Forgot password"
2. Sprawdź skrzynkę email
3. Zweryfikuj wygląd i działanie przycisku

## Zmienne dostępne w szablonach Supabase

- `{{ .ConfirmationURL }}` - URL do potwierdzenia akcji
- `{{ .Token }}` - Token potwierdzenia (jeśli potrzebny)
- `{{ .TokenHash }}` - Hash tokenu
- `{{ .SiteURL }}` - URL Twojej aplikacji (skonfigurowany w Supabase)

## Uwagi

- Szablony używają inline CSS, co jest wymagane dla kompatybilności z klientami email
- Gradient używa bezpiecznych kolorów (#667eea, #764ba2) z brandingu
- Projekt responsywny - działa na urządzeniach mobilnych
- Używa zmiennej `{{ .ConfirmationURL }}` która jest automatycznie wstawiana przez Supabase
- Link wygasa po 1h (domyślne ustawienie Supabase dla reset password)
