# Drape — Project Architecture

## Overview

Drape is a bespoke fashion marketplace connecting clients with independent
fashion producers (tailors, designers, ateliers). It features AI-powered
fashion consultation (Aria), real-time order management, and production
guide generation.

## Stack

| Layer | Technology | Deployment |
|-------|-----------|------------|
| **Frontend** | React + Vite + TypeScript + Tailwind v4 | Cloudflare Pages |
| **Backend** | Express 5 + TypeScript (esbuild bundle) | Render |
| **Database** | PostgreSQL + Drizzle ORM + drizzle-zod | Neon |
| **AI** | OpenRouter OpenAI-compatible API | External |
| **Storage** | Google Cloud Storage (GCS-compatible) | Replit sidecar / External |

## Project Structure

```
drape/
├── artifacts/
│   ├── drape/                    # Frontend (Vite + React)
│   │   ├── src/
│   │   │   ├── App.tsx           # Router (wouter) + providers
│   │   │   ├── main.tsx          # Entry point
│   │   │   ├── pages/            # Page components
│   │   │   ├── components/       # UI + domain components
│   │   │   │   ├── ui/           # shadcn/ui primitives
│   │   │   │   ├── ai/           # AI chat, brief, lookbook
│   │   │   │   ├── auth/         # Login, signup, Google auth
│   │   │   │   ├── marketplace/  # Designer cards, search
│   │   │   │   └── shared/       # Navbar, ErrorBoundary
│   │   │   ├── context/auth.tsx  # Auth context (React Query)
│   │   │   ├── lib/              # Utilities, hooks
│   │   │   └── data/             # Mock data (to be replaced)
│   │   └── package.json
│   │
│   └── api-server/               # Backend (Express 5)
│       ├── src/
│       │   ├── index.ts          # Server entry point
│       │   ├── app.ts            # Express app (CORS, routing)
│       │   ├── routes/           # Route handlers
│       │   │   └── routes/       # (nested, intentional)
│       │   ├── middlewares/      # Auth middleware
│       │   ├── lib/
│       │   │   ├── auth.ts       # JWT (jose)
│       │   │   ├── logger.ts     # Pino logger
│       │   │   ├── ai/           # AI integration
│       │   │   │   ├── text-provider.ts
│       │   │   │   ├── image-provider.ts
│       │   │   │   └── provider-factory.ts
│       │   │   ├── objectStorage.ts
│       │   │   ├── whatsapp.ts
│       │   │   └── create-notification.ts
│       │   └── build.mjs        # esbuild config
│       └── package.json
│
├── lib/
│   ├── db/                       # Database schema (Drizzle)
│   │   ├── src/schema/           # Table definitions
│   │   └── drizzle.config.ts
│   ├── api-zod/                  # API validation types (codegen)
│   ├── api-spec/                 # OpenAPI spec
│   └── whatsapp/                 # WhatsApp integration lib
│
├── docs/                         # Documentation
├── scripts/                      # Automation scripts
└── pnpm-workspace.yaml
```

## Data Flow

```
User → Cloudflare Pages (frontend)
        → fetch(API_BASE + /api/...)
          → Render (Express 5)
            → Auth middleware (JWT)
            → Route handler
              → Database (Neon via Drizzle)
              → AI (OpenRouter via text-provider.ts)
              → WhatsApp (Twilio)
            → JSON response
          ← Frontend receives response
        ← UI updates
```

## Key Design Decisions

- **Wouter** over React Router (lighter, simpler API)
- **wouter** uses `Switch` pattern for route matching
- **shadcn/ui** for component primitives (copy-paste, not a dep)
- **Drizzle ORM + drizzle-kit** for schema management and migrations
- **esbuild** for backend bundling (fast, tree-shakeable)
- **OpenRouter** as the primary AI provider (multi-model gateway)
- **Pino** for structured logging (production-grade, JSON output)
