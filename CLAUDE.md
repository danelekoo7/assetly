# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Assetly is a web application for tracking net worth by manually managing assets and liabilities. Built with Astro 5 + React 19, it provides a spreadsheet-like interface for financial data entry with historical visualization.

**Tech Stack:**

- Astro 5 (server-side rendering, hybrid mode)
- React 19 (interactive components only)
- TypeScript 5
- Tailwind CSS 4
- Supabase (PostgreSQL, auth)
- Shadcn/ui (Radix UI components)

**Node Version:** 22.14.0 (see `.nvmrc`)

## Common Commands

### Development

```bash
npm run dev              # Start dev server at localhost:3000
npm run dev:debug        # Start with Node.js inspector
npm run dev:e2e          # Start in test mode
npm run build            # Production build
npm run preview          # Preview production build
```

### Code Quality

```bash
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix ESLint issues
npm run format           # Format with Prettier
```

### Testing

```bash
npm test                 # Run all tests (unit + e2e)
npm run test:unit        # Run Vitest unit tests
npm run test:unit:watch  # Watch mode
npm run test:unit:ui     # Vitest UI
npm run test:e2e         # Run Playwright e2e tests
npm run test:e2e:ui      # Playwright UI mode
npm run test:e2e:headed  # Run e2e with browser visible
```

**Test File Locations:**

- Unit tests: `src/**/*.test.ts`
- E2E tests: `e2e/**/*.spec.ts`
- Test setup: `src/test/setup.ts`

### Shadcn/ui Components

```bash
npx shadcn@latest add [component-name]  # Add new UI component
```

Components are installed to `src/components/ui/`. Use `npx shadcn@latest` (not the deprecated `npx shadcn-ui@latest`).

## Architecture

### Directory Structure

```
src/
├── pages/              # Astro routes (file-based routing)
│   ├── api/           # API endpoints (POST, GET handlers)
│   │   └── auth/      # Auth endpoints
│   └── auth/          # Auth-related pages
├── layouts/            # Astro layouts (Layout.astro, AuthLayout.astro)
├── components/         # Mixed Astro (static) and React (interactive)
│   ├── ui/            # Shadcn/ui components
│   ├── auth/          # Auth forms (React)
│   └── dashboard/     # Dashboard components (React)
├── lib/
│   ├── services/      # Business logic (e.g., account.service.ts)
│   ├── validation/    # Zod schemas
│   ├── stores/        # Zustand stores
│   └── utils.ts       # Utility functions
├── hooks/             # React hooks (e.g., useAccountActions.ts)
├── db/
│   ├── supabase.client.ts  # Deprecated client-side client
│   ├── supabase.server.ts  # Server-side client factory
│   └── database.types.ts   # Generated Supabase types
├── middleware/        # Astro middleware (auth checks)
├── types.ts           # Shared DTOs and command models
├── assets/            # Internal static assets
└── env.d.ts          # TypeScript environment definitions

public/                # Public static assets
supabase/
├── migrations/        # SQL migration files
└── config.toml        # Supabase configuration
```

### Key Architectural Patterns

**1. Server-First Architecture**

- Astro runs in `output: "server"` mode (SSR)
- Use `.astro` components for static content
- Use React (`.tsx`) only when interactivity is needed
- NEVER use Next.js directives like `"use client"`

**2. Authentication & Middleware**

- Middleware (`src/middleware/index.ts`) checks authentication on all routes except PUBLIC_PATHS
- Uses Supabase SSR with cookie-based sessions
- User session available via `Astro.locals.user` (typed in `src/env.d.ts`)
- Always use `createSupabaseServerInstance()` from `src/db/supabase.server.ts` in routes/API endpoints
- The old `supabaseClient` from `src/db/supabase.client.ts` is deprecated for server-side use

**3. Type System**

- Database types auto-generated in `src/db/database.types.ts`
- Shared DTOs and Command Models in `src/types.ts`:
  - **DTOs**: Data sent from API to client (e.g., `AccountDto`, `GridDataDto`)
  - **Command Models**: Data sent from client to API (e.g., `CreateAccountCommand`)
- Use DTOs to expose only necessary fields (e.g., omit `user_id`, `updated_at`)

**4. API Endpoints**

- Located in `src/pages/api/`
- Export uppercase HTTP handlers: `GET`, `POST`, `PATCH`, `DELETE`
- Always add `export const prerender = false`
- Validate input with Zod schemas from `src/lib/validation/`
- Extract business logic into services in `src/lib/services/`
- Access Supabase via `createSupabaseServerInstance({ headers, cookies })`

**5. Database (Supabase)**

- PostgreSQL with Row Level Security (RLS) enabled
- Migrations in `supabase/migrations/` with naming: `YYYYMMDDHHmmss_description.sql`
- RLS policies filter by `user_id` automatically
- Currency hardcoded to `PLN` (multi-currency out of scope)

**6. State Management**

- Zustand for client-side state (e.g., `useDashboardStore.ts`)
- Custom hooks in `src/hooks/` for component logic

**7. Forms & Validation**

- React Hook Form with Zod resolvers
- Shadcn/ui form components with accessibility built-in
- Validation schemas in `src/lib/validation/`

## Critical Development Guidelines

### Git Workflow

- **NEVER** run `git push` to remote repository - the user always does this manually
- Create commits when requested, but NEVER ask if the user wants to push changes
- After creating a commit, simply inform the user that changes are ready to push

### Supabase Usage

- **ALWAYS** use `createSupabaseServerInstance()` from `src/db/supabase.server.ts` in API routes and server-side code
- **NEVER** import `supabaseClient` from `src/db/supabase.client.ts` in server contexts
- Use the `SupabaseClient` type from `src/db/supabase.client.ts`, NOT from `@supabase/supabase-js`
- RLS policies automatically filter by `user_id` - don't add manual filters in queries

### Error Handling

- Handle errors at the beginning of functions with early returns
- Use guard clauses for preconditions
- Place happy path last for readability
- Custom error types in `src/lib/errors.ts` (e.g., `ConflictError`)
- Always provide user-friendly error messages

### Astro-Specific

- Use View Transitions API (`transition:animate`) for smooth page transitions
- API routes: uppercase handlers (`POST`, `GET`), add `export const prerender = false`
- Extract API logic into services in `src/lib/services/`
- Use `Astro.cookies` for cookie management
- Environment variables via `import.meta.env` or `astro:env/server`

### React-Specific

- Functional components with hooks only
- Custom hooks in `src/hooks/` or `src/components/hooks/`
- Use `React.memo()` for expensive components
- `useCallback` for event handlers passed to children
- `useMemo` for expensive calculations
- `useId()` for accessibility IDs

### Styling (Tailwind CSS 4)

- Use `@layer` directive for organizing styles
- Arbitrary values with square brackets: `w-[123px]`
- Responsive variants: `sm:`, `md:`, `lg:`
- State variants: `hover:`, `focus-visible:`, `active:`
- Dark mode: `dark:` variant
- Path alias: `@/` points to `src/`

### Accessibility

- Use ARIA landmarks (main, navigation)
- Set `aria-expanded`, `aria-controls` for expandable content
- Use `aria-live` for dynamic updates
- `aria-label` or `aria-labelledby` for elements without visible labels
- Avoid redundant ARIA (let semantic HTML do the work)

### Database Migrations

- File naming: `YYYYMMDDHHmmss_description.sql` (UTC time)
- All SQL in lowercase
- Include header comment with purpose and affected tables
- Always enable RLS on new tables
- RLS policies should be granular (separate for select/insert/update/delete and anon/authenticated)
- Add copious comments for destructive operations

## Project Scope

**Included in MVP:**

- Email/password auth with verification
- Dashboard with KPIs (net worth, assets, liabilities)
- Historical net worth chart
- Spreadsheet-like data grid (CRUD for accounts)
- Account archiving (preserves history)
- Auto-save functionality
- Mobile responsive
- PLN currency only

**Explicitly Out of Scope:**

- Multi-currency support
- Automatic bank integrations
- Native mobile apps
- Restoring archived accounts
- Advanced analytics beyond net worth
- Password reset (minimal scope)

## Environment Variables

Required in `.env`:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
```

For E2E tests, use `.env.test` (loaded by Playwright).

## Deployment

- **Platform:** DigitalOcean (Docker containers)
- **Adapter:** Cloudflare (`@astrojs/cloudflare` in directory mode)
- **CI/CD:** GitHub Actions
- **Linting/Formatting:** Enforced via Husky and lint-staged on pre-commit
