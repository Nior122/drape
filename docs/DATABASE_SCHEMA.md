# Drape — Database Schema

## Overview

PostgreSQL database managed with Drizzle ORM (`lib/db/`).
Schema is defined in `lib/db/src/schema/` using Drizzle's `pgTable`.

## Tables

### users
Core user accounts (CLIENT, PRODUCER, or ADMIN).

| Column | Type | Notes |
|--------|------|-------|
| id | text UUID | PK |
| email | text | UNIQUE, NOT NULL |
| password_hash | text | Nullable for OAuth users |
| name | text | |
| role | enum | CLIENT \| PRODUCER \| ADMIN |
| google_id | text | UNIQUE |
| onboarding_complete | boolean | Default false |
| created_at | timestamptz | |
| updated_at | timestamptz | Auto-updated |

### profiles
Extended profile info (1:1 with users).

| Column | Type | Notes |
|--------|------|-------|
| id | text UUID | PK |
| user_id | text | FK → users.id, UNIQUE, CASCADE |
| phone | text | |
| whatsapp | text | |
| city | text | |
| country | text | |
| bio | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### client_preferences
Client style preferences (1:1 with users).

| Column | Type | Notes |
|--------|------|-------|
| id | text UUID | PK |
| user_id | text | FK → users.id, UNIQUE, CASCADE |
| style_preferences | text[] | |
| budget_min | integer | |
| budget_max | integer | |
| style_note | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### producer_profiles
Producer atelier profiles (1:1 with users).

| Column | Type | Notes |
|--------|------|-------|
| id | text UUID | PK |
| user_id | text | FK → users.id, UNIQUE, CASCADE |
| studio_name | text | |
| studio_type | enum | SOLO \| STUDIO \| ATELIER |
| specialties | text[] | |
| bio | text | |
| price_min | integer | |
| price_max | integer | |
| instagram | text | |
| portfolio_urls | text[] | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### enquiry_sessions
AI fashion consultation sessions.

| Column | Type | Notes |
|--------|------|-------|
| id | text UUID | PK |
| user_id | text | (no FK — anonymous sessions) |
| designer_slug | text | |
| brief_ready | boolean | |
| created_at | timestamp | |
| updated_at | timestamp | |

### enquiry_messages
Messages within an AI consultation session.

| Column | Type | Notes |
|--------|------|-------|
| id | text UUID | PK |
| session_id | text | FK → enquiry_sessions.id |
| role | enum | user \| assistant |
| content | text | |
| image_urls | text[] | |
| created_at | timestamp | |

### briefs
Fashion briefs generated through AI consultation.

| Column | Type | Notes |
|--------|------|-------|
| id | text UUID | PK |
| session_id | text | FK → enquiry_sessions.id, UNIQUE |
| user_id | text | |
| designer_slug | text | |
| status | text | collecting → awaiting_confirmation → confirmed → finalized → forwarded |
| style_summary | text | |
| occasion | text | |
| color_palette | text[] | |
| fabric_preferences | text | |
| budget_min | integer | |
| budget_max | integer | |
| timeline_days | integer | |
| image_prompts | text[] | |
| designer_package | jsonb | Structured payload for designers |
| confirmed_at | timestamp | |
| finalized_at | timestamp | |
| forwarded_at | timestamp | |

### lookbook_images
AI-generated lookbook images for a brief.

| Column | Type | Notes |
|--------|------|-------|
| id | text UUID | PK |
| brief_id | text | FK → briefs.id |
| session_id | text | |
| object_path | text | Storage path |
| prompt | text | |
| prompt_index | integer | |
| metadata | jsonb | |
| created_at | timestamp | |

### brief_revisions
Revision requests on confirmed briefs.

| Column | Type | Notes |
|--------|------|-------|
| id | text UUID | PK |
| brief_id | text | FK → briefs.id |
| change_text | text | |
| source | text | |
| created_at | timestamp | |

### orders
Client ↔ Producer orders.

| Column | Type | Notes |
|--------|------|-------|
| id | text UUID | PK |
| client_id | text | FK → users.id |
| producer_id | text | FK → users.id |
| brief_id | text | |
| session_id | text | |
| status | enum | ENQUIRY → ACCEPTED → ... → COMPLETED \| CANCELLED |
| title | text | |
| agreed_price | integer | In smallest currency unit |
| currency | text | Default "GBP" |
| due_date | timestamptz | |
| timeline_events | jsonb | Array of { date, label, completed } |
| production_guide_content | jsonb | AI-generated guide |

### order_messages
Messages within an order thread.

| Column | Type | Notes |
|--------|------|-------|
| id | text UUID | PK |
| order_id | text | FK → orders.id |
| sender_id | text | FK → users.id |
| content | text | |
| read_by_client | boolean | |
| read_by_producer | boolean | |
| created_at | timestamptz | |

### order_reviews
Client reviews for completed orders.

| Column | Type | Notes |
|--------|------|-------|
| id | text UUID | PK |
| order_id | text | FK → orders.id |
| client_id | text | FK → users.id |
| rating | integer | (no CHECK constraint — should be 1-5) |
| comment | text | |
| created_at | timestamptz | |

### measurements
Client body measurements.

| Column | Type | Notes |
|--------|------|-------|
| id | text UUID | PK |
| user_id | text | FK → users.id, UNIQUE |
| unit | enum | cm \| inches |
| data | jsonb | { neck, chest, waist, hips, ... } |
| notes | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### notifications
In-app notifications.

| Column | Type | Notes |
|--------|------|-------|
| id | text UUID | PK |
| user_id | text | FK → users.id |
| type | enum | ORDER_UPDATE, MESSAGE, BRIEF_READY, ... |
| title | text | |
| body | text | |
| link | text | |
| read | boolean | |
| created_at | timestamptz | |

## Relationships

```
users 1→1 profiles
users 1→1 client_preferences (CLIENTs only)
users 1→1 producer_profiles (PRODUCERs only)
users 1→1 measurements
users 1→N enquiries (anon queries also allowed)
users 1→N orders (as client)
users 1→N orders (as producer)
users 1→N notifications

enquiry_sessions 1→N enquiry_messages
enquiry_sessions 1→1 briefs
briefs 1→N lookbook_images
briefs 1→N brief_revisions

orders 1→N order_messages
orders 1→N order_reviews
```
