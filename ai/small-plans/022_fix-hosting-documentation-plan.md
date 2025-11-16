# Plan poprawy dokumentacji - zmiana hostingu z DigitalOcean na Cloudflare

## Problem

W dokumentacji projektu występują wzmianki o DigitalOcean jako platformie hostingowej, podczas gdy aplikacja będzie faktycznie hostowana na Cloudflare.

## Znalezione lokalizacje wymagające poprawy

### 1. CLAUDE.md
**Lokalizacja:** Sekcja "Deployment"
```markdown
- **Platform:** DigitalOcean (Docker containers)
```
**Poprawka:** 
```markdown
- **Platform:** Cloudflare
```

### 2. README.md
**Lokalizacja:** Lista technologii
```markdown
- **DigitalOcean**: Application hosting via Docker containers
```
**Poprawka:** 
```markdown
- **Cloudflare**: Application hosting via Cloudflare Pages
```

### 3. ai/tech-stack.md
**Lokalizacja:** Sekcja hostingu
```markdown
- DigitalOcean do hostowania aplikacji za pośrednictwem obrazu docker
```
**Poprawka:**
```markdown
- Cloudflare Pages do hostowania aplikacji
```

### 4. ai/automated-tests-plan.md
**Lokalizacje:** 
- W sekcji "Zakres testów" (gdzie mówi się o niezawodności infrastruktury)
- W sekcji "Środowisko Staging"

**Poprawki:**
- Zamienić "Supabase i DigitalOcean" na "Supabase i Cloudflare"
- Zamienić "hostowana na DigitalOcean" na "hostowana na Cloudflare"

## Szczegóły implementacji

1. Zaktualizować CLAUDE.md - usunąć wzmiankę o Docker containers, zostawić informację o Cloudflare
2. Zaktualizować README.md - zmienić DigitalOcean na Cloudflare Pages
3. Zaktualizować ai/tech-stack.md - zmienić informację o hostingu
4. Zaktualizować ai/automated-tests-plan.md - zaktualizować dwie wzmianki o DigitalOcean

## Weryfikacja

Po wprowadzeniu zmian:
- Przeszukać ponownie wszystkie pliki .md w poszukiwaniu pozostałych wzmianek o DigitalOcean
- Upewnić się, że wszystkie referencje do hostingu wskazują na Cloudflare

## Uwagi

- Adapter Cloudflare (`@astrojs/cloudflare`) jest już poprawnie wskazany w dokumentacji
- Nie ma potrzeby zmiany konfiguracji technicznej (astro.config.mjs), tylko dokumentacji
