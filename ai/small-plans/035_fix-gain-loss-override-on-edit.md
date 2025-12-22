# Plan Naprawy: Zysk Nadpisywany jako 0 przy Edycji Konta Gotówkowego

**Data utworzenia:** 21.12.2025
**Status:** ✅ Zrealizowano
**Cel:** Naprawa błędu, gdzie po edycji pola "zysk" dla konta typu "aktywo gotówkowe", wartość zysku była zapisywana jako 0.

---

## 1. Analiza Problemu

### 1.1. Opis błędu

Gdy użytkownik edytował wartość konta typu "aktywo gotówkowe" i zmieniał pole "zysk" (`gain_loss`):
- W oknie edycji wartość wyświetlała się poprawnie
- Po zapisie pole "zysk" pokazywało wartość 0 (błędne zachowanie)

Problem występował zarówno dla nowych wpisów, jak i przy edycji istniejących.

### 1.2. Lokalizacja błędu

**Plik:** `src/lib/services/value-entry.service.ts`

Backend obsługiwał tylko 3 scenariusze w funkcji `calculateCashFlowAndGainLoss`:
1. **Scenariusz 1:** Tylko `value` → przelicz oba pola według typu konta
2. **Scenariusz 2a:** `value` + `cash_flow` → przelicz `gain_loss`
3. **Scenariusz 3:** Wszystkie trzy wartości → walidacja spójności

**Brakowało Scenariusza 2b:** `value` + `gain_loss` → przelicz `cash_flow`

### 1.3. Przyczyna błędu

Gdy użytkownik zmieniał tylko pole "zysk" (bez zmiany "wpłaty"), frontend wysyłał do API:
```javascript
{
  account_id: "...",
  date: "...",
  value: 4500,
  cash_flow: null,    // nie zmienione przez użytkownika
  gain_loss: 100      // zmienione przez użytkownika
}
```

Backend sprawdzał:
1. `hasCashFlow && hasGainLoss` → **false** (brak cash_flow)
2. `hasCashFlow` → **false** (brak cash_flow)
3. Przechodził do **Scenariusza 1** który dla `cash_asset` ustawiał `gain_loss = 0`

Wartość `gain_loss` podana przez użytkownika była całkowicie ignorowana.

### 1.4. Dodatkowy problem UI (odkryty podczas testów)

**Plik:** `src/components/dashboard/EditValueModal.tsx`

Podczas zapisu formularza występował "flash" - pola przez chwilę pokazywały wartość 0. Przyczyną był `useEffect` reagujący na zmiany `gridData`, który resetował formularz podczas optymistycznego update'u store'a.

---

## 2. Wprowadzone Zmiany

### Zmiana 1 (Backend): Dodanie Scenariusza 2b

**Plik:** `src/lib/services/value-entry.service.ts`

Dodano nowy scenariusz w funkcji `calculateCashFlowAndGainLoss` (po Scenariuszu 2a):

```typescript
// Scenario 2b: Value + gain_loss provided → calculate cash_flow
if (hasGainLoss) {
  return {
    cash_flow: (value - previousValue - gainLossInput) * cfMultiplier,
    gain_loss: gainLossInput,
  };
}
```

Zaktualizowano również komentarz dokumentacyjny:
```typescript
/**
 * Calculates cash_flow and gain_loss based on four scenarios:
 * - Scenario 1: Only value provided → calculate based on account type
 * - Scenario 2a: Value + cash_flow provided → calculate gain_loss
 * - Scenario 2b: Value + gain_loss provided → calculate cash_flow
 * - Scenario 3: All three provided → validate consistency
 */
```

### Zmiana 2 (Frontend): Zapobieganie resetowi formularza podczas zapisu

**Plik:** `src/components/dashboard/EditValueModal.tsx`

Dodano `useRef` do śledzenia czy formularz był już zainicjalizowany w bieżącej sesji modala.

**Dlaczego `useRef` zamiast alternatyw:**
| Podejście | Re-rendery | Lint warnings | Ocena |
|-----------|------------|---------------|-------|
| `useRef` (wybrane) | ❌ Brak | ✅ Brak | ✅ Najlepsze |
| `useState` | ⚠️ Niepotrzebne | ✅ Brak | ❌ |
| Usunięcie `gridData` z deps | ❌ Brak | ❌ Wymaga suppress | ❌ |
| Śledzenie prev `isOpen` | ❌ Brak | ✅ Brak | ⚠️ Bardziej złożone |

Kod:

```typescript
// Track if form was initialized for current modal session
const isInitializedRef = useRef(false);

// Reset form when modal opens
useEffect(() => {
  // Reset initialization flag when modal closes
  if (!isOpen) {
    isInitializedRef.current = false;
    return;
  }

  // Skip if already initialized for this session (prevents reset on gridData changes)
  if (isInitializedRef.current) return;

  if (context) {
    // ... initialize form ...
    isInitializedRef.current = true;
  }
}, [isOpen, context, form, gridData]);
```

Dzięki temu formularz resetuje się tylko raz przy otwarciu modala, a nie przy każdej zmianie `gridData` (np. podczas optymistycznego update'u).

---

## 3. Zmiany które zostały cofnięte

Początkowo dodano warunki `!calcState.userModifiedGainLoss` i `!calcState.userModifiedCashFlow` w logice auto-kalkulacji frontendu. Te zmiany zostały **cofnięte**, ponieważ powodowały możliwość wprowadzenia niespójnych danych (wpłata + zysk nie sumowały się do różnicy wartości).

---

## 4. Weryfikacja

- **Lint:** ✅ Brak błędów
- **Testy jednostkowe:** ✅ 103/103 przeszło
- **Testy manualne:** ✅ Zweryfikowano poprawność działania

---

## 5. Checklist Implementacji

- [x] **Backend:** Dodać scenariusz 2b w `value-entry.service.ts`
- [x] **Frontend:** Dodać `isInitializedRef` w `EditValueModal.tsx`
- [x] **Cofnięto:** Warunki `!userModified*` (powodowały niespójność danych)
- [x] **Lint:** Brak błędów
- [x] **Testy jednostkowe:** 103/103 przeszło
- [x] **Testy manualne:** Zweryfikowano

---

## 6. Pliki Zmodyfikowane

| Plik | Zmiana |
|------|--------|
| `src/lib/services/value-entry.service.ts` | Dodano Scenariusz 2b |
| `src/components/dashboard/EditValueModal.tsx` | Dodano `isInitializedRef` |
