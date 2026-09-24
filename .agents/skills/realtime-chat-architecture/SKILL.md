---
name: realtime-chat-architecture
description: >-
  Use this skill when developing, debugging, extending, or maintaining real-time messaging,
  WebSocket communication, Redis Pub/Sub channels, Redis Streams, Dead Letter Queues (DLQ),
  StreamWorker persistence, or multi-tab presence tracking across chat-service and ws-service.
---

# Real-Time Chat & Stream Architecture

This guide covers the dual-path messaging pipeline, Redis Pub/Sub fanout, Redis Streams batch persistence, Dead Letter Queue (DLQ) poison-pill isolation, WebSocket SubscriptionManager reference counting, and multi-tab presence tracking.

---

## 1. Dual-Path Architecture Overview

```
                      +-----------------------------+
                      | Client POST /api/v1/chat/... |
                      +--------------+--------------+
                                     |
                                     v
                            [ API Gateway :3005 ]
                                     |
                                     v
                         [ Chat Service (:3000) ]
                                     |
          +--------------------------+--------------------------+
          |                                                     |
          v (Fast Path < 50ms)                                  v (Persistence Path)
[ SISMEMBER room:{id}:members ]                         [ XADD stream:chat-messages ]
          |                                                     |
          v (Instant Pub/Sub)                                   v
[ PUBLISH room:{roomId} ]                             [ Background StreamWorker ]
          |                                                     |
          v                                                     v (createMany batch)
[ WS Service SubscriptionManager ]                    [ PostgreSQL Database ]
          |                                                     | (On Poison Pill Error)
          v (Local Ref Count Broadcast)                         v
[ Connected Client Sockets ]                          [ DLQ stream:chat-messages:dlq ]
```

---

## 2. Core Components & File Reference

| Component | Key Source File | Responsibility |
| :--- | :--- | :--- |
| **Message Ingestion & Pub/Sub** | `project/apps/chat-service/src/controllers/createMessage.ts` | Validates membership, publishes to `room:{id}`, appends to stream |
| **Stream Persistence Worker** | `project/apps/chat-service/src/lib/streamWorker.ts` | Consumes `stream:chat-messages`, batches DB inserts, manages DLQ & `XAUTOCLAIM` |
| **Membership Validation** | `project/apps/chat-service/src/lib/membership.ts` | In-memory `SISMEMBER` check on `room:{id}:members` with self-healing DB fallback |
| **WS Subscription Manager** | `project/apps/ws-service/src/subscriptionManager.ts` | Reference counts local room connections; subscribes to Redis only when local clients exist |
| **WebSocket Server** | `project/apps/ws-service/src/wss.ts` | Connection handshake, JWT auth, ping/pong heartbeat, socket registration |
| **Multi-Tab Presence** | `project/apps/ws-service/src/wss.ts` | Tracks tabs via Redis Hash `ws:user:{id}:sessions` with atomic `HDEL` on disconnect |
| **Shared Message Schemas** | `project/packages/validation/src/chat.ts` | Zod schemas and TypeScript types for all WebSocket and HTTP payloads |

---

## 3. Redis Channels & Key Conventions

* **`room:{roomId}`** (Pub/Sub): Broadcasts messages, edits, deletions, and typing states strictly to active members of that room.
* **`user:{userId}`** (Pub/Sub): Broadcasts user-scoped notifications, room invitations, join request updates, or direct alerts.
* **`room:{roomId}:members`** (Set): Cached member IDs for `< 0.2ms` validation. Invalidation / auto-hydration is handled on join, leave, or cache miss.
* **`ws:user:{userId}:sessions`** (Hash): Fields are unique connection IDs (`connId`), values are timestamps. Prevents multi-tab disconnect collisions.
* **`stream:chat-messages`** (Redis Stream): Append-only ordered log for background database persistence.
* **`stream:chat-messages:dlq`** (Redis Stream): Dead Letter Queue for malformed, unparseable, or invalid message records.

---

## 4. Key Workflows & Runbooks

### 4.1 Adding a New Real-Time Event Type
Follow this pattern to add a new event (e.g., `reaction_added`, `pinned_message`):

1. **Define Payload Schema in `@repo/validation`**:
   Add schema in `project/packages/validation/src/chat.ts`:
   ```typescript
   export const reactionAddedPayloadSchema = z.object({
     type: z.literal('reaction_added'),
     data: z.object({
       messageId: z.string(),
       roomId: z.string(),
       userId: z.string(),
       emoji: z.string(),
     }),
   });
   ```
   Add to `wsMessageSchema` union and export the infer type.

2. **Publish from Controller / Service**:
   ```typescript
   import { redis } from '../lib/redis.js';

   await redis.publish(
     `room:${roomId}`,
     JSON.stringify({
       type: 'reaction_added',
       data: { messageId, roomId, userId, emoji },
     }),
   );
   ```

3. **Handle in `SubscriptionManager` (`project/apps/ws-service`)**:
   Verify `project/apps/ws-service/src/subscriptionManager.ts` parses the schema and broadcasts payload to room sockets.

4. **Consume in Frontend (`project/apps/web`)**:
   In `project/apps/web/hooks/useChatSocket.ts` or room state listener, handle `case 'reaction_added'`.

---

## 4.2 Inspecting and Troubleshooting StreamWorker & DLQ

#### Check Consumer Group Lag and Pending Messages:
```bash
# Connect to dev Redis container
docker exec -it openspace_redis_dev redis-cli

# Check stream length
XLEN stream:chat-messages

# Check pending messages in consumer group
XPENDING stream:chat-messages chat-service-group

# Check DLQ for poison pills
XLEN stream:chat-messages:dlq
XRANGE stream:chat-messages:dlq - + COUNT 10
```

#### Understanding the Resilient Ingestion Flow:
1. `StreamWorker` attempts fast-path batch persistence (`prisma.chatMessage.createMany`).
2. If batch fails (e.g. database foreign key error, unparseable JSON), `StreamWorker` switches to individual fallback:
   - Persists healthy messages one-by-one.
   - Routes poison pills to `stream:chat-messages:dlq` with error diagnostics.
   - Calls `XACK` on the original stream so healthy ingestion is never blocked.
3. Every 30 seconds, `XAUTOCLAIM` reclaims messages stuck in `chat-service-group` pending state for `> 60,000ms` (e.g., if a worker node died mid-batch).

---

## 4.3 Verifying Multi-Tab Presence Behavior
- When a user opens tab 1, `ws-service` runs `HSET ws:user:{userId}:sessions {connId} {timestamp}`.
- If tab 2 opens, a new `connId` is added to the same hash. User status is marked online.
- When tab 1 closes, `HDEL ws:user:{userId}:sessions {connId}` removes only tab 1.
- `HLEN ws:user:{userId}:sessions` still returns `> 0`, keeping user online until ALL tabs close.

---

## 5. Testing the Real-Time Stack

Run existing unit and integration tests:
```bash
# In project root (cd project)
# Test SubscriptionManager reference counting
pnpm --filter ws-service test src/__tests__/subscriptionManager.test.ts

# Test StreamWorker batching, DLQ routing, and auto-claim
pnpm --filter chat-service test src/__tests__/streamWorker.test.ts

# Test membership caching and DB fallback
pnpm --filter chat-service test src/__tests__/membership.test.ts
```
