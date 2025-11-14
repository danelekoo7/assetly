# Pomysły na przyszłe rozszerzenia - Assetly

## Optymalizacje Dashboard KPI

### 1. Osobny endpoint `/dashboard/summary`

**Kiedy warto rozważyć:**
- Gdy potrzebujemy **niezależnych KPI** od zakresu dat w siatce (np. zawsze pokazuj aktualny stan)
- Problemy wydajnościowe z `/grid-data` dla dużej liczby kont (>50-100)
- Potrzeba osobnego cache'owania KPI z innym TTL niż dane siatki
- Dashboard ma sekcję tylko z KPI bez siatki (osobna strona/widok)

**Zalety osobnego endpointu:**
- ✅ Wydajność: ~150 bytes vs ~10KB (`/grid-data`)
- ✅ Optymalizacja zapytań: O(N) zamiast O(D × N)
- ✅ Możliwość pokazania aktualnego stanu niezależnie od filtrów historycznych
- ✅ Łatwiejsze cache'owanie (Redis, 60s TTL)
- ✅ Możliwość użycia PostgreSQL function dla skalowalności

**Wady:**
- ❌ Dodatkowe zapytanie HTTP (2 requesty zamiast 1)
- ❌ Duplikacja części logiki obliczeniowej
- ❌ Większa złożoność architektury
- ❌ Możliwe rozbieżności między KPI a siatką

**Przykładowa implementacja:**
- Endpoint: `GET /api/dashboard/summary?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Service: `DashboardSummaryService.getSummary()`
- Szczegóły były w pliku `ai/small-plans/007_dashboard-summary-implementation-plan.md`

---

### 2. PostgreSQL Function dla KPI

**Kiedy warto zaimplementować:**
- Dla użytkowników z dużą liczbą kont (>100)
- Gdy chcemy przenieść obliczenia po stronie bazy danych
- Dla zmniejszenia transferu danych między backendem a bazą

**Przykładowa funkcja:**

```sql
CREATE OR REPLACE FUNCTION get_dashboard_summary(
  p_user_id UUID,
  p_from DATE,
  p_to DATE
)
RETURNS TABLE (
  net_worth NUMERIC,
  total_assets NUMERIC,
  total_liabilities NUMERIC,
  cumulative_cash_flow NUMERIC,
  cumulative_gain_loss NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH active_accounts AS (
    SELECT id, type
    FROM accounts
    WHERE user_id = p_user_id AND archived_at IS NULL
  ),
  latest_entries AS (
    SELECT DISTINCT ON (ve.account_id)
      a.type,
      ve.value
    FROM active_accounts a
    LEFT JOIN value_entries ve ON ve.account_id = a.id AND ve.date <= p_to
    ORDER BY ve.account_id, ve.date DESC
  ),
  period_entries AS (
    SELECT ve.cash_flow, ve.gain_loss
    FROM active_accounts a
    JOIN value_entries ve ON ve.account_id = a.id
    WHERE ve.date >= p_from AND ve.date <= p_to
  )
  SELECT
    COALESCE(SUM(CASE WHEN type != 'liability' THEN value ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN type = 'liability' THEN value ELSE 0 END), 0) as net_worth,
    COALESCE(SUM(CASE WHEN type != 'liability' THEN value ELSE 0 END), 0) as total_assets,
    COALESCE(SUM(CASE WHEN type = 'liability' THEN value ELSE 0 END), 0) as total_liabilities,
    (SELECT COALESCE(SUM(cash_flow), 0) FROM period_entries) as cumulative_cash_flow,
    (SELECT COALESCE(SUM(gain_loss), 0) FROM period_entries) as cumulative_gain_loss
  FROM latest_entries;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_dashboard_summary(UUID, DATE, DATE) TO authenticated;
```

**Wywołanie z kodu:**

```typescript
const { data, error } = await supabase
  .rpc("get_dashboard_summary", { 
    p_user_id: userId,
    p_from: from,
    p_to: to
  })
  .single();

if (error) throw new Error(`Failed to get dashboard summary: ${error.message}`);
return data as DashboardSummaryDto;
```

**Korzyści:**
- Jedno zapytanie zamiast N+1
- Obliczenia po stronie bazy (szybsze)
- Mniejszy transfer danych
- Wykorzystanie indeksów bazy danych

---

### 3. Redis Cache dla KPI

**Strategia cache'owania:**

```typescript
// Cache key pattern
const cacheKey = `kpi:${userId}:${from}:${to}`;

// Get with cache
async function getKpiWithCache(userId: string, from: string, to: string) {
  // 1. Sprawdź cache
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // 2. Pobierz z bazy
  const kpi = await GridDataService.getKpiSummary(supabase, userId, from, to);
  
  // 3. Zapisz do cache (60s TTL)
  await redis.setex(cacheKey, 60, JSON.stringify(kpi));
  
  return kpi;
}

// Invalidate on data change
async function invalidateKpiCache(userId: string) {
  const pattern = `kpi:${userId}:*`;
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

// Hook in API endpoints
// POST /value-entries -> invalidateKpiCache(userId)
// PATCH /accounts/:id -> invalidateKpiCache(userId)
```

**Kiedy warto:**
- Wysokie obciążenie (>1000 użytkowników aktywnych)
- Częste odświeżanie dashboardu
- Dane KPI nie zmieniają się często (TTL 60s akceptowalny)

---

### 4. Materializowany widok

**Dla bardzo częstych zapytań:**

```sql
CREATE MATERIALIZED VIEW user_current_state AS
SELECT 
  a.user_id,
  a.id as account_id,
  a.type,
  FIRST_VALUE(ve.value) OVER (
    PARTITION BY a.id 
    ORDER BY ve.date DESC
  ) as latest_value
FROM accounts a
LEFT JOIN value_entries ve ON ve.account_id = a.id
WHERE a.archived_at IS NULL;

CREATE UNIQUE INDEX ON user_current_state (user_id, account_id);

-- Refresh on schedule or via trigger
REFRESH MATERIALIZED VIEW CONCURRENTLY user_current_state;
```

**Kiedy warto:**
- Ekstremalnie częste zapytania o aktualny stan
- Akceptowalna niewielka dezaktualizacja (refresh co 5-10 min)
- Duża liczba kont z długą historią

---

### 5. Websockets / Realtime Updates

**Supabase Realtime Subscriptions:**

```typescript
// Subscribe to value_entries changes
const subscription = supabase
  .channel('kpi-updates')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'value_entries',
      filter: `account_id=in.(${accountIds.join(',')})`
    },
    (payload) => {
      // Recalculate KPI locally or fetch from API
      fetchKpi();
    }
  )
  .subscribe();

// Cleanup
subscription.unsubscribe();
```

**Kiedy warto:**
- Współdzielony dashboard (kilku użytkowników widzi te same dane)
- Real-time aktualizacje (np. podczas edycji przez innego użytkownika)
- Premium feature dla płacących użytkowników

---

### 6. Batch Endpoints

**Połączenie wielu endpointów w jeden:**

```typescript
// GET /api/dashboard/all?from=...&to=...
{
  "grid": {
    "dates": [...],
    "accounts": [...],
    "summary": { "by_date": {...} }
  },
  "kpi": {
    "net_worth": 20600,
    "total_assets": 20600,
    // ...
  },
  "chart": {
    "data": [...]
  }
}
```

**Korzyści:**
- Jeden HTTP request zamiast 3-4
- Niższa latencja całkowita
- Atomic data fetch (wszystko albo nic)

**Wady:**
- Większy rozmiar odpowiedzi
- Trudniejsze cache'owanie (różne części mają różne TTL)
- Gorsza modularność

---

### 7. Agregacja na froncie z Web Workers

**Dla bardzo responsywnego UI:**

```typescript
// worker.ts
self.addEventListener('message', (e) => {
  const { accounts, dates } = e.data;
  
  // Oblicz KPI w osobnym wątku
  const kpi = calculateKpi(accounts, dates);
  
  self.postMessage({ kpi });
});

// Component
const worker = new Worker('/kpi-worker.js');

worker.postMessage({ accounts, dates });

worker.onmessage = (e) => {
  const { kpi } = e.data;
  setKpiData(kpi);
};
```

**Kiedy warto:**
- Bardzo duże zbiory danych (>1000 entries)
- UI musi pozostać responsywne podczas obliczeń
- Dane już są na froncie (z `/grid-data`)

---

## Dodatkowe KPI do rozważenia

### 1. Zmiana wartości netto (delta)

```typescript
interface DashboardSummaryDto {
  // ... existing fields
  net_worth_change: number;        // Zmiana w wybranym okresie
  net_worth_change_percent: number; // Zmiana procentowa
}
```

### 2. Średni miesięczny przepływ

```typescript
interface DashboardSummaryDto {
  // ... existing fields
  avg_monthly_cash_flow: number;
}
```

### 3. Breakdown według typu aktywów

```typescript
interface DashboardSummaryDto {
  // ... existing fields
  assets_by_type: {
    cash_assets: number;
    investment_assets: number;
  };
}
```

### 4. Top performery

```typescript
interface DashboardSummaryDto {
  // ... existing fields
  top_gainers: Array<{
    account_id: string;
    name: string;
    gain_loss: number;
    gain_loss_percent: number;
  }>;
}
```

---

## Metryki wydajności do monitorowania

### Backend Metrics

```typescript
// Monitoring w API endpoint
import { performance } from 'perf_hooks';

const startTime = performance.now();
const kpi = await GridDataService.getKpiSummary(...);
const duration = performance.now() - startTime;

// Log do systemu monitoringu (np. Sentry, DataDog)
logger.info('KPI fetch', { 
  userId, 
  duration, 
  accountCount: accounts.length,
  dateRange: { from, to }
});

// Alert jeśli duration > 500ms
if (duration > 500) {
  logger.warn('Slow KPI query', { duration, userId });
}
```

### Frontend Metrics

```typescript
// Web Vitals + Custom metrics
import { getCLS, getFID, getLCP } from 'web-vitals';

// Track KPI load time
const kpiLoadStart = performance.now();
await fetchKpi();
const kpiLoadTime = performance.now() - kpiLoadStart;

// Send to analytics
analytics.track('kpi_load', {
  duration: kpiLoadTime,
  accountCount: data.accounts.length,
  dateRange: data.dates.length
});
```

---

## Priorytet implementacji

### 🟢 Natychmiastowe (MVP)
- Rozszerzenie `/grid-data` o KPI (✅ już zrobione w dokumentacji)

### 🟡 Krótkoterminowe (po MVP, 1-3 miesiące)
1. Monitoring wydajności (metryki backend + frontend)
2. Indeksy bazodanowe (jeśli nie ma)
3. Cache HTTP headers (Cache-Control)

### 🟠 Średnioterminowe (3-6 miesięcy)
1. PostgreSQL function dla KPI (jeśli >100 kont)
2. Redis cache (jeśli >1000 użytkowników)
3. Dodatkowe KPI (delta, breakdown)

### 🔴 Długoterminowe (6+ miesięcy)
1. Osobny endpoint `/dashboard/summary` (jeśli UX wymaga)
2. Materializowany widok (dla ekstremalnych przypadków)
3. Websockets / Realtime (premium feature)
4. Batch endpoints (jeśli dużo requestów)

---

## Notatki z dyskusji

**Data:** 14.11.2024

**Podjęta decyzja:** KPI obliczane z danych w `/grid-data`, zsynchronizowane z wybranym okresem

**Uzasadnienie:**
- ✅ Jeden HTTP request (lepszy UX)
- ✅ Spójność danych siatki i KPI
- ✅ Szybsza implementacja MVP
- ✅ Użytkownik może porównywać okresy (rok do roku)

**Odrzucone alternatywy:**
- ❌ Osobny endpoint `/dashboard/summary` - dodatkowa złożoność bez wyraźnej korzyści dla MVP
- ❌ Niezależne KPI od zakresu dat - użytkownik chce porównywać okresy

**Kiedy ponownie rozważyć:**
- Problemy wydajnościowe (>50-100 kont)
- UX wymaga pokazania "aktualnego stanu" niezależnie od filtrów historycznych
- Potrzeba zaawansowanego cache'owania
