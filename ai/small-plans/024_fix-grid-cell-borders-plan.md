# Plan poprawy: Dodanie wizualnego odgraniczenia komórek siatki

## Problem

W przypadku małej ilości danych w siatce brakuje wyraźnego odgraniczenia gdzie kończy się komórka. Użytkownik widzi dane bez jasnych granic między komórkami, co pogarsza czytelność.

## Analiza obecnego stanu

### Obecnie w kodzie:

**DataGridCell.tsx:**
```tsx
className={`... border-r border-border ... last:border-r-0 ...`}
```

**DataGridHeader.tsx:**
```tsx
className="... border-r border-border ... last:border-r-0"
```

**DataGridSummaryRow.tsx:**
```tsx
className="... border-r border-border ... last:border-r-0"
```

### Zidentyfikowany problem:

Klasa `last:border-r-0` usuwa prawy border z ostatniej komórki w wierszu. To powoduje, że:
- Przy małej ilości kolumn brakuje wizualnego zamknięcia siatki po prawej stronie
- Użytkownik nie widzi gdzie kończy się ostatnia komórka
- Może to powodować wrażenie "niedokończonego" interfejsu

## Proponowane rozwiązanie

### Zmiany do wprowadzenia:

1. **DataGridCell.tsx** - usunąć `last:border-r-0` z className
2. **DataGridHeader.tsx** - usunąć `last:border-r-0` z komórek dat
3. **DataGridSummaryRow.tsx** - usunąć `last:border-r-0` z komórek wartości netto

### Efekt zmian:

- Wszystkie komórki będą miały prawy border
- Siatka będzie miała wyraźne odgraniczenie po prawej stronie
- Lepsza czytelność, szczególnie przy małej ilości danych
- Spójny wygląd niezależnie od liczby kolumn

## Pliki do modyfikacji

1. `src/components/dashboard/DataGrid/DataGridCell.tsx`
2. `src/components/dashboard/DataGrid/DataGridHeader.tsx`
3. `src/components/dashboard/DataGrid/DataGridSummaryRow.tsx`

## Weryfikacja

Po wprowadzeniu zmian:
1. Uruchomić lintery (`npm run lint`)
2. Przetestować wizualnie dashboard z różną ilością kolumn:
   - 1 kolumna
   - 3 kolumny
   - 10+ kolumn
3. Sprawdzić responsywność na różnych rozdzielczościach
4. Upewnić się, że border jest widoczny i nie powoduje problemów z przewijaniem poziomym

## Ryzyko

Minimalne - zmiana dotyczy tylko usunięcia jednej klasy CSS, która była odpowiedzialna za usuwanie bordera.
