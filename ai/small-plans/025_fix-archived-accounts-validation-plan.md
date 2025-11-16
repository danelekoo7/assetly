# Plan naprawy: Bug z walidacją parametru `archived`

## Problem

Funkcjonalność pokazywania/ukrywania zarchiwizowanych kont nie działa z powodu błędnej konwersji parametru `archived` w schemacie walidacji Zod.

### Objawy
1. Zaznaczanie checkboxa "Pokaż zarchiwizowane" nie ma widocznego efektu
2. Po zarchiwizowaniu konta pozostaje ono widoczne w tabeli (tylko kolor tła się zmienia)

### Przyczyna
W pliku `src/lib/validation/grid-data.schemas.ts`:
```typescript
archived: z.coerce.boolean().optional().default(false)
```

`z.coerce.boolean()` używa JavaScript boolean coercion:
- `Boolean("false")` → `true` (niepusty string!)
- `Boolean("true")` → `true`
- Tylko `Boolean("")` → `false`

**Przepływ:**
1. Frontend wysyła `archived=false` (string "false")
2. Zod konwertuje "false" → `true`
3. Backend zawsze otrzymuje `showArchived=true` i pokazuje wszystkie konta

## Rozwiązanie

Zmienić schemat walidacji na poprawną konwersję string → boolean:

### Plik: `src/lib/validation/grid-data.schemas.ts`

**Było:**
```typescript
archived: z.coerce.boolean().optional().default(false)
```

**Będzie:**
```typescript
archived: z
  .enum(['true', 'false'])
  .optional()
  .default('false')
  .transform(val => val === 'true')
```

**Alternatywne rozwiązanie (bardziej elastyczne):**
```typescript
archived: z
  .string()
  .optional()
  .default('false')
  .transform(val => val === 'true')
```

### Uzasadnienie wyboru
- Rozwiązanie z `.enum()` jest bardziej restrykcyjne i bezpieczne
- Rozwiązanie z `.string()` jest bardziej elastyczne
- Obie wersje poprawnie konwertują "true" → true i "false" → false

## Weryfikacja zgodności z PRD

Z `ai/prd.md`, US-006:
> "Zarchiwizowane konto jest wyszarzone i ukryte z domyślnego widoku tabeli, ale jego historyczne dane nadal są uwzględniane na wykresie wartości netto."

Po naprawie:
- ✅ Domyślnie (checkbox odznaczony): tylko aktywne konta widoczne
- ✅ Po archiwizacji: konto znika z tabeli (chyba że checkbox zaznaczony)
- ✅ Wykres wartości netto nadal uwzględnia historyczne dane (logika w grid-data.service.ts działa poprawnie)

## Kroki implementacji

1. Zmienić schemat walidacji w `src/lib/validation/grid-data.schemas.ts`
2. Przetestować manualnie:
   - Odznaczony checkbox → tylko aktywne konta
   - Zaznaczony checkbox → wszystkie konta (aktywne + zarchiwizowane)
   - Archiwizacja konta → konto znika (gdy checkbox odznaczony)
3. Sprawdzić czy wykres nadal pokazuje historyczne dane zarchiwizowanych kont

## Potencjalne ryzyka

- Brak - zmiana dotyczy tylko walidacji parametru query
- Nie wpływa na bazę danych ani logikę biznesową
- Backend i frontend pozostają bez zmian (tylko walidacja)

## Dodatkowe uwagi

Problem dotyczy tylko parametru `archived`. Parametry `from` i `to` działają poprawnie, ponieważ używają `.string().date()` i `.string().datetime()` bez problematycznej konwersji boolean.
