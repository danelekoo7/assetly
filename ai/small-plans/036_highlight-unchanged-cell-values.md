# Plan: Wizualne wyróżnienie komórek z niezmienioną wartością

## Cel
Dodać wizualne wyróżnienie komórek, których wartość jest identyczna jak w poprzedniej kolumnie (po lewej stronie), aby użytkownik mógł na pierwszy rzut oka zobaczyć które wartości się nie zmieniły.

## Pliki zmodyfikowane

1. **`src/components/dashboard/DataGrid/DataGridCell.tsx`**
2. **`src/components/dashboard/DataGrid/DataGridRow.tsx`**

## Szczegóły implementacji

### 1. DataGridCell.tsx

Dodano nowy prop `isSameAsPrevious`:

```tsx
interface DataGridCellProps {
  accountId: string;
  date: string;
  accountType: AccountType;
  value: number | null;
  isSameAsPrevious?: boolean;  // NOWY PROP
  onCellClick: (accountId: string, date: string, accountType: AccountType) => void;
}
```

Dodano warunkową klasę CSS dla paska po lewej stronie:

```tsx
const sameValueClasses = isSameAsPrevious ? "border-l-4 border-l-amber-400" : "";
```

### 2. DataGridRow.tsx

W pętli `dates.map()` dodano logikę porównującą wartość z poprzednią kolumną:

```tsx
{dates.map((date, index) => {
  const entry = account.entries[date];
  const value = entry?.value ?? null;

  // Sprawdź czy wartość jest taka sama jak w poprzedniej kolumnie
  let isSameAsPrevious = false;
  if (index > 0 && value !== null) {
    const previousDate = dates[index - 1];
    const previousValue = account.entries[previousDate]?.value ?? null;
    isSameAsPrevious = previousValue !== null && value === previousValue;
  }

  return (
    <DataGridCell
      key={date}
      accountId={account.id}
      date={date}
      accountType={account.type}
      value={value}
      isSameAsPrevious={isSameAsPrevious}
      onCellClick={onCellClick}
    />
  );
})}
```

## Styl wizualny

- Klasa: `border-l-4 border-l-amber-400` - żółto-pomarańczowy pasek 4px po lewej stronie komórki
- Działa zarówno w trybie jasnym jak i ciemnym
- Nie koliduje z istniejącymi stylami (kolor tekstu dla ujemnych wartości, hover, itp.)

## Weryfikacja

Po implementacji:
1. `npm run lint` - sprawdzenie lintingu
2. `npm run test:unit` - uruchomienie testów jednostkowych
