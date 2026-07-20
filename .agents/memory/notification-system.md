---
name: In-app notification system
description: Architecture of the real-time in-app notification system added to Drape
---

## Architecture

**DB**: `notificationsTable` in `lib/db/src/schema/notifications.ts`. Enum has 12 types: ORDER_UPDATE, MESSAGE, LOOKBOOK_READY, REVIEW_REQUEST, GENERAL, BRIEF_READY, NEW_ORDER, ORDER_ACCEPTED, STATUS_UPDATED, MEASUREMENTS_SUBMITTED, PRODUCTION_GUIDE_READY, REVIEW_RECEIVED.

**SSE bus**: `artifacts/api-server/src/lib/notification-bus.ts` — in-memory Map<userId, Set<Response>>. Single-process only; would need Redis pub/sub for multi-instance.

**createNotification**: `artifacts/api-server/src/lib/create-notification.ts` — inserts into DB + broadcasts to connected SSE clients. Silent failure (logs but never throws).

**SSE route**: `artifacts/api-server/src/routes/routes/notifications-stream.ts` — `GET /api/notifications/stream`. Uses `router.use("/notifications", requireAuth)` scoped middleware. Sends 20s keepalive pings.

**Frontend hook**: `artifacts/drape/src/hooks/use-notification-stream.ts` — uses native `EventSource` with `withCredentials: true` on `/api/notifications/stream`. Auto-reconnects after 5s on error. Invalidates `getGetClientNotificationsQueryKey()` on every `notification` SSE event.

**Panel**: `artifacts/drape/src/components/client/NotificationsPanel.tsx` — dark premium dark-overlay panel, groups by Today/Yesterday/This week/Older, type icons with colors, gold unread dots, mark all read, navigate on click.

## Wired notification triggers
- Review submitted → producer (REVIEW_RECEIVED)
- Measurements updated → all producers with orders for that client (MEASUREMENTS_SUBMITTED)
- Producer sends message → client (MESSAGE)
- Order status changed → client (STATUS_UPDATED)
- Order accepted → client (ORDER_ACCEPTED) — in addition to STATUS_UPDATED
- Brief extracted → client (BRIEF_READY)
- Production guide generated → client (PRODUCTION_GUIDE_READY)

## Why
**Why SSE not WebSocket**: SSE is simpler (uses existing HTTP server, no upgrade), one-directional server→client is all we need for notifications.
**Why not polling-only**: Polling at 30s interval means up to 30s delay for real-time events. SSE delivers immediately.
**Why in-memory bus**: Single server process, no Redis available. For horizontal scaling, replace broadcastToUser with Redis pub/sub.
