# Drape — API Documentation

## Base URL

Production: `https://your-app.onrender.com/api`

All endpoints prefixed with `/api`.

## Response Format

### Success
```json
{
  "success": true,
  "data": { ... }
}
```

### Error
```json
{
  "success": false,
  "error": "Human-readable message"
}
```

## Auth Endpoints

### POST /api/auth/signup
Create a new user account.
- Body: `{ email, password, name, role: "CLIENT" | "PRODUCER" }`
- Returns: `{ user, token }`
- Sets cookie: `drape_token` (httpOnly, secure, sameSite=none)

### POST /api/auth/login
Login with email and password.
- Body: `{ email, password }`
- Returns: `{ user, token }`
- Sets cookie: `drape_token`

### POST /api/auth/google
Login or signup with Google OAuth.
- Body: `{ credential: string, role?: "CLIENT" | "PRODUCER" }`
- Returns: `{ user, token }`

### GET /api/auth/me
Get current user profile.
- Auth: Required
- Returns: `{ id, email, name, role, ... }`

### POST /api/auth/logout
Clear session.
- Returns: `{ success: true }`

## AI Endpoints

### POST /api/ai/enquiry
Send a message to the AI fashion consultant (Aria).
- Auth: Optional
- Body: `{ message, sessionId?, designerSlug?, imageUrls?[] }`
- Returns: `{ reply, sessionId, briefReady, brief, briefId, briefStatus, awaitingConfirmation, generateImages }`
- Rate limit: 20 req/min

### POST /api/ai/generate
Generate lookbook images from a brief.
- Auth: Optional
- Body: `{ sessionId?, briefId? }`
- Returns: `{ success, images: [{ id, objectPath, prompt }] }`

### POST /api/ai/production-guide
Generate a production guide PDF for an order.
- Auth: Required (PRODUCER)
- Body: `{ orderId }`
- Returns: PDF (binary)

### GET /api/ai/sessions
List enquiry sessions.
- Auth: Required
- Query: `?designerSlug=...`
- Returns: `[ { id, designerSlug, messageCount, ... } ]`

### GET /api/ai/session/:id/messages
Get messages for a session.
- Auth: Required
- Returns: `{ session, messages, brief }`

### POST /api/ai/brief/confirm
Confirm or reject a brief.
- Auth: Required
- Body: `{ briefId?, sessionId?, confirm: boolean }`

### POST /api/ai/brief/finalize
Finalize a brief and generate designer package.
- Auth: Required
- Body: `{ briefId?, sessionId? }`

## Client Endpoints

### GET /api/client/orders
List client's orders.
- Auth: Required (CLIENT)
- Returns: `[ { id, status, title, producerName, ... } ]`

### GET /api/client/orders/:id
Get order details.
- Auth: Required (CLIENT)
- Returns: `{ order, messages, timeline }`

### GET /api/client/discover
Get recommended designers.
- Auth: Required (CLIENT)
- Returns: `[ designerProfile, ... ]`

## Producer Endpoints

### GET /api/producer/dashboard
Get producer dashboard stats.
- Auth: Required (PRODUCER)
- Returns: `{ activeOrders, revenueThisMonth, totalClients, recentOrders }`

### GET /api/producer/orders
List producer's orders.
- Auth: Required (PRODUCER)

### PATCH /api/producer/orders/:id/status
Update order status.
- Auth: Required (PRODUCER)

### GET /api/producer/storefront
Get producer's public storefront profile.
- Auth: Required (PRODUCER)

### GET /api/producer/clients
List producer's clients.
- Auth: Required (PRODUCER)

### GET /api/producer/analytics
Get producer's revenue analytics.
- Auth: Required (PRODUCER)

## Storage Endpoints

### POST /api/storage/upload-url
Get a presigned upload URL.
- Auth: Required
- Body: `{ fileName, contentType, acl? }`

### GET /api/storage/objects/:path
Get a stored object.
- Auth: Optional (depends on ACL)

## Health

### GET /api/health
Health check.
- Returns: `{ status: "ok", timestamp }`
