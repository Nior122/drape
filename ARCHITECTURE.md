# Drape — Architecture Overview

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser (React SPA)                    │
│  wouter Router │ Tailwind v4 │ React Query │ @workspace/api │
└─────────────────────┬────────────────────────────────────────┘
                      │ HTTP / HTTPS
                      ▼
┌──────────────────────────────────────────────────────────────┐
│                  Express 5 API Server                         │
│  CORS │ JWT Auth │ Rate Limit │ Security Headers │ Pino Log   │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ /api/v1  ← Versioned endpoints                      │    │
│  │ /api     ← Backward-compatible endpoints             │    │
│  │ Routes: auth │ ai │ marketplace │ business │ admin   │    │
│  └──────────────────────────────────────────────────────┘    │
└─────────────────────┬────────────────────────────────────────┘
                      │ Drizzle ORM
                      ▼
┌──────────────────────────────────────────────────────────────┐
│               PostgreSQL (via node-postgres)                  │
│  30+ tables across 14 schema files in lib/db/src/schema/     │
└──────────────────────────────────────────────────────────────┘
```

## Client-Server Interaction

### Authentication Flow
1. User submits email/password or Google OAuth
2. Server validates, creates JWT (HS256, 7-day expiry)
3. Token set as httpOnly cookie + returned in response body
4. Frontend stores token in localStorage via token-storage.ts
5. Every API request includes token via cookie OR Authorization header
6. requireAuth middleware verifies JWT on every protected route
7. useGetMe React Query hook auto-fetches user on page load

### API Conventions
- All endpoints prefixed with `/api/` (or `/api/v1/`)
- Consistent JSON response format
- Error responses: `{ error: string }` with appropriate HTTP status
- Pagination: `{ data: [], total, page, limit }`
- Auth: `requireAuth` middleware on all protected routes
- Roles: `requireRole("ADMIN", "DESIGNER")` for role-gated routes

## Database Schema

### Core Tables (lib/db/src/schema/)
- `users` — Base user accounts (role: CLIENT|DESIGNER|PRODUCER|ADMIN)
- `profiles` — Shared profile data
- `producer_profiles` — Designer/studio profiles
- `client_preferences` — Client style preferences
- `admin_profiles` — Admin permissions

### Marketplace (Phase 8)
- `portfolio_items` — Designer portfolio
- `reviews` — Verified reviews with moderation
- `bookings` + `designer_availability` — Booking system
- `saved_designers`, `collections`, `collection_items` — Favorites

### Business & Finance (Phase 7)
- `inventory_items` + `inventory_movements` — Inventory
- `suppliers` — Supplier management
- `purchase_orders` — Purchase ordering
- `invoices` — Professional invoicing
- `payment_transactions` — Payment tracking
- `expenses` — Expense tracking
- `subscription_plans` + `user_subscriptions` — SaaS plans
- `business_settings` — Brand/config
- `audit_logs` — Activity audit trail

### AI & Production
- `enquiry_sessions`, `enquiry_messages`, `briefs` — AI chat
- `ai_conversations`, `ai_studio_conversations` — AI studio
- `orders`, `order_reviews`, `order_messages` — Order lifecycle
- `projects`, `project_tasks`, `automation_rules` — Production system
- `notifications`, `notification_bus` — Real-time notifications

## File Structure

```
artifacts/
├── api-server/          ← Express 5 backend
│   ├── src/
│   │   ├── app.ts              ← Express setup, middleware, error handling
│   │   ├── index.ts            ← Server entry, DB schema push on startup
│   │   ├── routes/
│   │   │   ├── index.ts         ← Route aggregator
│   │   │   ├── v1.ts           ← API versioning wrapper
│   │   │   └── routes/         ← Individual route files
│   │   ├── middlewares/         ← requireAuth, requireRole, optionalAuth
│   │   ├── lib/                 ← Auth, logger, AI providers, storage
│   │   └── build.mjs           ← esbuild bundler
│   └── knowledge/              ← AI knowledge base (markdown)
│
├── drape/               ← React + Vite frontend
│   └── src/
│       ├── App.tsx             ← Router with all routes
│       ├── pages/              ← Page components
│       ├── components/         ← UI & shared components
│       ├── hooks/              ← Custom React hooks
│       ├── context/            ← Auth context
│       ├── lib/                ← Utilities, roles, token storage
│       └── types/              ← TypeScript type definitions
│
lib/
├── db/                  ← Drizzle ORM schema + DB client
│   └── src/schema/      ← All table definitions
├── api-client-react/    ← Generated React Query hooks (orval)
└── api-zod/            ← Generated Zod schemas (orval)
```

## Key Design Decisions

1. **pnpm workspaces** with isolated packages for frontend, backend, DB, API client
2. **Drizzle ORM** with PostgreSQL — type-safe queries, auto-generated schemas
3. **JWT auth** with httpOnly cookies + Bearer header fallback
4. **AI provider chain**: OpenRouter → Groq → BlueMinds → OpenAI
5. **SSE notifications** via notification-bus.ts for real-time updates
6. **Object Storage** (GCS-compatible) with ACL system
7. **Feature flags** with runtime toggle in admin panel
8. **Audit logging** on all financial and admin operations
