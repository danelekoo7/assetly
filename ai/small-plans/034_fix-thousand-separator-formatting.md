# Plan poprawki formatowania kwot czterocyfrowych w siatce

## Problem

W tabeli, gdy użytkownik wpisuje kwotę czterocyfrową (np. 1234,56), wyświetla się ona jako `1234,56` zamiast oczekiwanego formatu z separatorem tysięcy: `1 234,56`.

## Analiza

### Kod obecny

1. **Formatowanie wartości** (`src/lib/utils.ts`):
```typescript
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};
```

2. **Użycie w komponentach** (`src/components/dashboard/DataGrid/DataGridCell.tsx`):
```typescript
{value !== null ? (
  <span className={value >= 0 ? "text-foreground" : "text-red-600 dark:text-red-400"}>
    {formatCurrency(value)}
  </span>
) : (
  <span className="text-muted-foreground">—</span>
)}
```

### Przyczyna problemu

API `Intl.NumberFormat` dla lokalizacji `pl-PL` **domyślnie używa separatora tysięcy** (spacja niełamliwa), więc problem NIE leży w samej funkcji `formatCurrency`. 

Możliwe przyczyny:
1. **CSS** - właściwość `white-space` może ignorować/usuwać spacje
2. **Renderowanie** - spacja niełamliwa (`\u00A0`) może być źle renderowana
3. **Font** - niektóre czcionki mogą źle wyświetlać separator tysięcy

Najbardziej prawdopodobne: CSS w komponentach DataGrid może ustawiać `white-space: nowrap` lub podobne, co może wpływać na renderowanie spacji.

## Plan rozwiązania

### Krok 1: Weryfikacja formatowania
- Dodać test jednostkowy dla `formatCurrency` sprawdzający separator tysięcy
- Upewnić się, że funkcja zwraca prawidłowy format z separatorem

### Krok 2: Analiza stylów CSS
- Sprawdzić klasy CSS w `DataGridCell.tsx`
- Sprawdzić globalne style w `src/styles/global.css`
- Zidentyfikować potencjalne właściwości CSS wpływające na wyświetlanie spacji

### Krok 3: Implementacja poprawki
Jeśli problem w CSS:
- Upewnić się, że komponent używa odpowiednich klas Tailwind
- Potencjalnie dodać `whitespace-normal` lub dostosować inne właściwości

Jeśli problem w renderowaniu:
- Rozważyć wymuszenie użycia spacji niełamliwej (`\u00A0`) w formacie
- Opcjonalnie: użyć `useGrouping: true` jawnie w `Intl.NumberFormat`

### Krok 4: Weryfikacja
- Uruchomić testy jednostkowe
- Uruchomić lintery
- Sprawdzić wizualnie w przeglądarce różne kwoty (1234,56, 12345,67, 123456,78)

## Pliki do modyfikacji

1. `src/test/lib/utils.test.ts` - dodanie testów dla `formatCurrency`
2. `src/lib/utils.ts` - potencjalna modyfikacja `formatCurrency` (jeśli potrzebna)
3. `src/components/dashboard/DataGrid/DataGridCell.tsx` - potencjalne dostosowanie CSS
4. `src/styles/global.css` - sprawdzenie globalnych stylów

## Kryteria akceptacji

- [ ] Kwoty czterocyfrowe wyświetlają się z separatorem tysięcy: `1 234,56`
- [ ] Kwoty pięciocyfrowe wyświetlają się poprawnie: `12 345,67`
- [ ] Kwoty sześciocyfrowe wyświetlają się poprawnie: `123 456,78`
- [ ] Wszystkie testy jednostkowe przechodzą
- [ ] Lintery nie zgłaszają błędów
- [ ] Format działa zarówno w trybie jasnym jak i ciemnym
