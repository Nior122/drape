---
name: Auth architecture
description: JWT + httpOnly cookie auth for Drape Express API — key decisions and patterns
---

# Auth Architecture

JWT stored in httpOnly cookie named `drape_token`. Signed with `jose` (HS256). Expires in 7 days.

**Why jose over jsonwebtoken:** jose is ESM-native and works cleanly with the esbuild bundle; jsonwebtoken has CJS interop issues in this stack.

**Password hashing:** bcryptjs with cost factor 12.

**Google OAuth:** `google-auth-library` `OAuth2Client.verifyIdToken()` validates Google credential from frontend GSI button. Requires `GOOGLE_CLIENT_ID` env var (not yet set — Google Sign-In button hides gracefully when missing).

**Key files:**
- `artifacts/api-server/src/lib/auth.ts` — signToken, verifyToken, buildUserPayload, cookie helpers
- `artifacts/api-server/src/middlewares/requireAuth.ts` — Express middleware, attaches req.userId
- `artifacts/api-server/src/routes/auth.ts` — all auth + onboarding routes

**JWT_SECRET** is stored as a shared env var (generated, not user-provided).

**How to apply:** All protected routes use `requireAuth` middleware. Cookie is set server-side (httpOnly), cleared on logout.
