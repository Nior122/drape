---
name: requireAuth middleware scoping
description: Express router middleware must be path-scoped to avoid blocking requests destined for later routers
---

## The rule
Always use `router.use('/path-prefix', requireAuth)` — never `router.use(requireAuth)` (no path).

**Why:** In Express, `router.use(fn)` (no path) runs `fn` for EVERY request that passes through that router — even if no route in that router ultimately matches. Since multiple routers are chained via `parentRouter.use(childRouter)`, an unscoped middleware in an early child router will execute for requests destined for later child routers, potentially terminating them with a 401 before they ever reach their target.

## Current scoping in Drape
- `client.ts`: `router.use("/client", requireAuth)`
- `producer.ts`: `router.use("/producer", requireAuth)`
- `production-guide.ts`: `router.use("/ai/production-guide", requireAuth)`
- `notifications-stream.ts`: `router.use("/notifications", requireAuth)`

**How to apply:** Every time a new router is created with protected routes, scope requireAuth to the path prefix shared by all routes in that router.
