---
name: Express 5 params type assertion
description: How to handle req.params typing in Express 5 / @types/express@5 to avoid Drizzle type errors
---

In `@types/express@5.0.6`, `req.params` values are typed as `string | string[]` rather than plain `string`. This causes TypeScript errors when passing route params directly to Drizzle ORM functions like `eq()` which expect `string`.

**Rule:** Always cast when destructuring route params for use in Drizzle queries:
```typescript
const { id } = req.params as Record<string, string>;
```

**Why:** `@types/express@5` broadened the param dictionary type. At runtime the value is always `string` for named route segments, but TypeScript doesn't narrow it. The cast is safe.

**How to apply:** Any route handler that uses `req.params.id` or similar in a Drizzle `eq()`, `inArray()`, or insert `.values()` call.
