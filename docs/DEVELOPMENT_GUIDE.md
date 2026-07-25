# Drape — Development Guide

## Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL (Neon or local)

## Setup

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your database URL and API keys

# Push database schema
pnpm --filter @workspace/db run push

# Start development servers (two terminals):
pnpm --filter @workspace/api-server run dev    # Backend on :8080
pnpm --filter @workspace/drape run dev         # Frontend on :5000
```

## Project Commands

| Command | Description |
|---------|-------------|
| `pnpm run typecheck` | Full TypeScript type check |
| `pnpm run build` | Typecheck + build all packages |
| `pnpm --filter @workspace/db run push` | Push Drizzle schema to DB |
| `pnpm --filter @workspace/db run generate` | Generate Drizzle migrations |
| `pnpm --filter @workspace/db run studio` | Open Drizzle Studio (GUI) |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate API hooks from OpenAPI spec |

## Frontend Architecture

### Routing
Uses **wouter** (not React Router). Routes defined in `App.tsx`:
- `/` — Landing page
- `/marketplace` — Designer discovery
- `/designers/:slug` — Designer storefront
- `/design/:designerSlug` — AI design session
- `/login`, `/signup` — Auth
- `/client/*` — Client dashboard (protected)
- `/producer/*` — Producer dashboard (protected)

### UI Components
shadcn/ui components in `artifacts/drape/src/components/ui/`.
Custom domain components in their respective directories.

### State Management
- **React Query** (`@tanstack/react-query`) for server state
- **AuthContext** for user session
- Local state with `useState` for UI state

## Backend Architecture

### Routes
Each route file in `artifacts/api-server/src/routes/routes/` is an Express Router.
Mounted via `routes/index.ts` → `app.ts`.

### Auth Middleware
- `requireAuth` — blocks unauthenticated requests
- `optionalAuth` — allows requests, sets `userId` if token valid

### AI Integration
The AI service layer is in `src/lib/ai/`:
- `text-provider.ts` — Main AI text provider
- `image-provider.ts` — Image generation
- `provider-factory.ts` — Export barrel

### Logging
Uses **Pino** for structured JSON logging.
- `LOG_LEVEL=info` (default) for production
- `LOG_LEVEL=debug` for development

## Deployment

### Cloudflare Pages (Frontend)
1. Connect repo to Cloudflare Pages
2. Build command: `pnpm --filter @workspace/drape run build`
3. Build output: `artifacts/drape/dist/public/`
4. Set env vars: `VITE_API_BASE_URL`

### Render (Backend)
1. Connect repo to Render
2. Start command: `node --enable-source-maps artifacts/api-server/dist/index.mjs`
3. Build command: `pnpm --filter @workspace/api-server run build`
4. Set all env vars from `.env.example`

## Adding a New Feature

1. **Database**: Add table/schema in `lib/db/src/schema/`, export from `index.ts`
2. **API**: Add route in `artifacts/api-server/src/routes/routes/`, register in `index.ts`
3. **Frontend**: Add page in `artifacts/drape/src/pages/`, register route in `App.tsx`
4. **API types**: Update `lib/api-spec/openapi.yaml` and run `codegen`

## Code Style

- TypeScript strict mode
- ESLint via TypeScript compiler (no separate ESLint config)
- Prettier for formatting
- Imports sorted by path length (convention)
- Drizzle schema files use singular table names
