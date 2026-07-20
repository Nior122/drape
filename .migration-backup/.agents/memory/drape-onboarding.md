---
name: Drape onboarding flow
description: Multi-step onboarding flow — DB tables, API routes, and frontend steps
---

# Drape Onboarding Flow

**Step sequence:** role selection → shared account details (signup) → role-specific preferences

**DB tables involved:**
- `users` — role, onboardingComplete
- `profiles` — phone, whatsapp, city, country, bio (created after signup)
- `client_preferences` — stylePreferences[], budgetMin/Max, styleNote
- `producer_profiles` — studioName, studioType (SOLO|STUDIO), specialties[], bio, priceMin/Max, instagram, portfolioUrls[]

**API endpoints:**
- POST /api/auth/signup → creates user + profile row
- PATCH /api/auth/onboarding/shared → updates user name + profile fields
- PATCH /api/auth/onboarding/client → upserts client_preferences, sets onboardingComplete=true
- PATCH /api/auth/onboarding/producer → upserts producer_profiles, sets onboardingComplete=true

**Post-auth redirects:**
- CLIENT + onboardingComplete → /browse
- CLIENT + !onboardingComplete → /onboarding
- PRODUCER + onboardingComplete → /dashboard/producer
- PRODUCER + !onboardingComplete → /onboarding

**Frontend files:**
- `artifacts/drape/src/context/auth.tsx` — AuthProvider, useAuth()
- `artifacts/drape/src/pages/signup.tsx` — multi-step form with framer-motion transitions
- `artifacts/drape/src/pages/onboarding.tsx` — standalone onboarding for already-authed users
- `artifacts/drape/src/components/auth/` — ProtectedRoute, PublicOnlyRoute, GoogleSignInButton, LoginForm

**How to apply:** All new authenticated pages go in ProtectedRoute. Non-authed pages go in PublicOnlyRoute.
