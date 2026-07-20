---
name: DB schema: user profile fields
description: Which fields live on usersTable vs profilesTable — critical for correct Drizzle joins
---

The user data is split across multiple tables in `lib/db/src/schema/`:

| Table | Fields |
|-------|--------|
| `usersTable` | id, email, passwordHash, name, role, googleId, onboardingComplete, createdAt, updatedAt |
| `profilesTable` | userId (FK), phone, whatsapp, city, country, bio |
| `clientPreferencesTable` | userId (FK), stylePreferences, budgetMin, budgetMax, styleNote |
| `producerProfilesTable` | userId (FK), studioName, studioType, specialties, bio, priceMin, priceMax, instagram, portfolioUrls |

**Rule:** Never access `usersTable.phone`, `usersTable.city`, `usersTable.country`, or `usersTable.whatsapp` — these live in `profilesTable`. Always left-join:
```typescript
.leftJoin(profilesTable, eq(profilesTable.userId, usersTable.id))
```

**Why:** The schema was split to keep the core users table lean. Previous code incorrectly referenced profile fields on usersTable, causing TypeScript errors and runtime failures.

**How to apply:** Any query that needs to return phone/city/country/whatsapp for a user — must include the profilesTable left join.
