# Drape — Deployment Guide

## Prerequisites

- Node.js 24+
- pnpm 10+
- PostgreSQL 16+
- A GCS-compatible object storage bucket (Replit Object Storage or Google Cloud Storage)
- (Optional) Twilio account for WhatsApp notifications
- (Optional) Stripe/Paystack/Flutterwave account for payments

## Environment Variables

See `.env.example` for the full list. Required variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | 256-bit random secret for JWT signing |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `VITE_API_BASE_URL` | Frontend build-time API URL |
| `OPENROUTER_API_KEY` | AI provider API key |
| `GCS_BUCKET_NAME` | Object storage bucket (if using GCS) |

## Quick Start (Development)

```bash
# 1. Install dependencies
pnpm install

# 2. Set environment variables
cp .env.example .env
# Edit .env with your values

# 3. Push database schema
pnpm --filter @workspace/db run push

# 4. Start the API server
pnpm --filter @workspace/api-server run dev

# 5. In a separate terminal, start the frontend
pnpm --filter @workspace/drape run dev
```

## Production Build

### API Server (Express)
```bash
cd artifacts/api-server
pnpm run build    # esbuild bundles src/ → dist/index.mjs
pnpm run start    # node --enable-source-maps ./dist/index.mjs
```

### Frontend (Vite)
```bash
cd artifacts/drape
pnpm run build    # Vite builds → dist/public/
```

## Deployment Options

### Render (Recommended for MVP)
1. Create a Web Service pointing to `artifacts/api-server/`
2. Build command: `pnpm install && pnpm run build`
3. Start command: `pnpm run start`
4. Set all environment variables in Render dashboard
5. Create a PostgreSQL database in Render
6. Deploy!

### Cloudflare Pages + Render
1. Frontend deployed to Cloudflare Pages
2. API server on Render
3. Set `VITE_API_BASE_URL` to Render service URL in Cloudflare Pages build settings
4. CORS configured via `ALLOWED_ORIGINS` env var

## Database Migrations

Drizzle Kit is used for schema management:
```bash
pnpm --filter @workspace/db run push    # Push schema to DB (dev)
pnpm --filter @workspace/db run generate # Generate SQL migration files
pnpm --filter @workspace/db run migrate  # Apply migrations (prod)
```

The API server auto-runs `drizzle-kit push` on startup for additive changes.
For destructive changes (column drops, table drops), run migrations manually.

## Health Checks

| Endpoint | Purpose |
|---|---|
| `GET /healthz` | Liveness probe (no DB dependency) |
| `GET /api/ready` | Readiness probe (checks DB) |
| `GET /api/health` | Full health status (DB, uptime, memory) |
| `GET /api/metrics` | Application metrics |

## Monitoring

- Structured JSON logging via Pino
- Request IDs on every request (`X-Request-Id` header)
- Security headers per OWASP recommendations
- Rate limiting on API, auth, and AI endpoints
- Audit logging on admin and financial operations

## Troubleshooting

### CORS Errors
Check `ALLOWED_ORIGINS` env var. The server logs the allowed origins on startup.

### Database Connection
Verify `DATABASE_URL` is correct. The health endpoint shows DB status.

### AI Provider Not Working
Set `OPENROUTER_API_KEY`. Falls back to Groq → BlueMinds → OpenAI.

### Build Failures
Ensure Node.js 24+ and pnpm 10+. Run `pnpm install` before build.
