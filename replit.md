# Drape

Drape is a bespoke fashion marketplace that connects clients with talented producers (tailors, designers) for custom-made clothing and accessories.

## Run & Operate

- `pnpm --filter @workspace/drape run dev` — run the frontend (Vite, port auto-assigned)
- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (artifact at `artifacts/drape/`)
- API: Express 5 (artifact at `artifacts/api-server/`)
- DB: PostgreSQL + Drizzle ORM (lib at `lib/db/`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle)
- Routing: wouter

## Where things live

- `artifacts/drape/` — React + Vite frontend
  - `src/App.tsx` — router (wouter) wiring all pages
  - `src/pages/` — page components (home, marketplace, dashboard/client, dashboard/producer)
  - `src/components/` — UI components (shadcn/ui in `ui/`, domain components organized by role)
  - `src/lib/utils.ts` — cn, formatPrice, formatDate, truncate, slugify
  - `src/types/index.ts` — client-safe domain types (Role, Storefront, Order, etc.)
  - `src/index.css` — Tailwind v4 theme with CSS variables (orange/warm palette)
- `artifacts/api-server/` — Express backend
- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — Drizzle DB schema

## Architecture decisions

- **Next.js → Vite + React**: Ported from Next.js; uses wouter for client-side routing, all pages are client-rendered.
- **Server-side files stubbed**: Next.js-specific server files (auth.ts, middleware.ts, lib/db/prisma.ts, lib/ai/provider.ts, db queries) are kept as empty stubs in the frontend. Real implementations belong in `artifacts/api-server/`.
- **Prisma → Drizzle**: The original app used Prisma; the Replit stack uses Drizzle ORM. The schema structure is preserved in `lib/db/src/schema/`.
- **Auth strategy**: Original app used next-auth v5 + Google OAuth + PrismaAdapter. On Replit, auth is implemented in Express via JWT + bcrypt with Google OAuth support.

## Product

Drape connects fashion clients with bespoke producers:
- **Marketplace**: Browse active producer storefronts, filter by specialty and budget
- **Client Dashboard**: Track orders, manage body measurements, send enquiries, generate AI outfit ideas
- **Producer Dashboard**: Manage storefront, handle enquiry inbox, track order production, upload assets
- **AI features**: Outfit generation using an OpenAI-compatible AI provider

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Server-side files in `artifacts/drape/src/lib/db/` and `artifacts/drape/src/lib/ai/` are intentionally empty stubs — real implementations go in `artifacts/api-server/`.
- The original app used Prisma; this Replit stack uses Drizzle. Don't install Prisma in the API server.
- Theme colors are warm orange/amber (`--primary: 24.6 95% 53.1%`), dark luxury aesthetic.
- After changes to `lib/api-spec/openapi.yaml`, always run `pnpm --filter @workspace/api-spec run codegen` to regenerate client hooks.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Original Vercel project backed up at `.migration-backup/` (Next.js 14, Prisma schema at `.migration-backup/prisma/schema.prisma`)
