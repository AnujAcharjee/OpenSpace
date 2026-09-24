---
name: service-api-routing
description: >-
  Use this skill when creating or modifying REST endpoints, adding new microservice routes,
  configuring API Gateway reverse proxying, handling JWT or cookie authentication,
  injecting gateway headers (x-gateway-secret, x-user-id), or validating requests with @repo/validation.
---

# Microservice API & Gateway Routing

This guide explains how requests traverse the edge, the API Gateway, and downstream microservices, how authentication headers are propagated, and how to safely add new endpoints.

---

## 1. Request Flow Architecture

```
[ Client / Web Browser ]
         |
         v
[ Caddy TLS Proxy ] (Ports 80 / 443)
         |
         v
[ API Gateway :3005 ] (project/apps/api-gateway)
  • Rate limiting (Redis-backed)
  • JWT verification from cookies or Authorization header
  • Injects headers: 'x-user-id', 'x-gateway-secret'
  • Streaming Proxy (ZERO body buffering overhead)
         |
         +--------------------+--------------------+
         |                    |                    |
         v                    v                    v
  [ HTTP Service ]     [ Chat Service ]     [ WS Service ]
  (:3001)              (:3000)              (:3002)
  • /api/v1/auth       • /api/v1/chat       • WebSocket upgrade
  • /api/v1/users                             (/ws)
  • /api/v1/rooms
```

---

## 2. Key Files & Responsibilities

| File | Purpose |
| :--- | :--- |
| `project/apps/api-gateway/src/index.ts` | Route dispatcher, rate limiter, and server initialization |
| `project/apps/api-gateway/src/proxy/createServiceProxy.ts` | Non-blocking streaming proxy using `http-proxy-middleware` |
| `project/apps/api-gateway/src/middleware/authenticateRequest.ts` | Extracts & verifies JWT token, injects `x-user-id` |
| `project/apps/chat-service/src/middleware/requireGatewaySecret.ts` | Rejects direct requests lacking `x-gateway-secret` |
| `project/apps/chat-service/src/middleware/attachUserContext.ts` | Populates `req.user.id` from `x-user-id` |
| `project/apps/http-service/src/middleware/requireGatewaySecret.ts` | Protects HTTP service endpoints from external bypass |
| `project/packages/validation/src/index.ts` | Centralized Zod request/response validation schemas |

---

## 3. Critical Gateway Rules

### Rule 1: NEVER parse bodies before streaming proxies
* **Problem**: Calling `express.json()` or `express.urlencoded()` at the API Gateway level consumes the HTTP request body stream in Node.js. If you then forward the request using a proxy, the downstream service hangs waiting for stream bytes that never arrive.
* **Pattern**: Keep `api-gateway` body-parser free. The gateway only parses headers and cookies. Let downstream services (`project/apps/http-service`, `project/apps/chat-service`) parse JSON bodies with `express.json()`.

### Rule 2: Inter-Service Security Handshake
Microservices sit behind the gateway. Direct traffic to downstream ports must be blocked or rejected:
* The gateway injects: `x-gateway-secret: process.env.GATEWAY_INTERNAL_SECRET`
* Downstream services apply `requireGatewaySecret` middleware:
  ```typescript
  export function requireGatewaySecret(req: Request, res: Response, next: NextFunction) {
    const secret = req.headers['x-gateway-secret'];
    if (!secret || secret !== process.env.GATEWAY_INTERNAL_SECRET) {
      return res.status(403).json({ error: 'Direct access forbidden' });
    }
    next();
  }
  ```

### Rule 3: Authenticated Context Injection
When a user is authenticated, the gateway injects `x-user-id: <user.id>`. Downstream controllers access the verified user ID directly via `req.user.id` without re-verifying the JWT or querying the database.

---

## 4. Step-by-Step: Adding a New Endpoint

Follow this checklist to implement a new endpoint (e.g. `POST /api/v1/rooms/:id/pin`):

### Step 1: Define Validation Schema in `@repo/validation`
In `project/packages/validation/src/room.ts`:
```typescript
import { z } from 'zod';

export const pinRoomSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    isPinned: z.boolean(),
  }),
});

export type PinRoomInput = z.infer<typeof pinRoomSchema>;
```
Export it from `project/packages/validation/src/index.ts`.

### Step 2: Implement Controller in Target Service
In `project/apps/http-service/src/controllers/pinRoom.ts`:
```typescript
import { Request, Response } from 'express';
import { prisma } from '@repo/db';

export async function pinRoom(req: Request, res: Response) {
  const { id } = req.params;
  const userId = req.user?.id;
  const { isPinned } = req.body;

  // Implementation with prisma...
  return res.status(200).json({ success: true });
}
```

### Step 3: Register in Target Service Router
In `project/apps/http-service/src/routes/room.ts`:
```typescript
import { pinRoomSchema } from '@repo/validation';
import { validateRequest } from '../middleware/validation.js';
import { pinRoom } from '../controllers/pinRoom.js';

roomRouter.post('/:id/pin', validateRequest(pinRoomSchema), pinRoom);
```

### Step 4: Ensure Gateway Route Dispatch
Since `api-gateway` already routes `/api/v1/rooms` to `http-service`, the new route is automatically proxied. If introducing a brand new top-level path (e.g., `/api/v1/analytics`), register it in `project/apps/api-gateway/src/index.ts`:
```typescript
app.use(
  '/api/v1/analytics',
  rateLimit({ windowMs: 60_000, max: 300 }),
  authenticateRequest,
  createServiceProxy({ urls: httpServiceUrls, internalSecret }),
);
```

### Step 5: Update Frontend API Constants
Add the URL in `project/apps/web/constants/apiUrls.ts`:
```typescript
export const API_URLS = {
  // ... existing URLs
  ROOMS: {
    // ...
    PIN: (id: string) => `/api/v1/rooms/${id}/pin`,
  },
};
```

---

## 5. Verification & Testing

Verify your changes:
```bash
# In project root (cd project)
# Typecheck validation and consuming apps
pnpm check-types

# Run service tests
pnpm test

# Test cookie parsing and auth logic
pnpm --filter http-service test src/__tests__/cookie.test.ts
```
