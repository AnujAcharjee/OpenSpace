---
name: db-prisma-workflow
description: >-
  Use this skill when modifying the Prisma schema, generating the Prisma client,
  running database migrations or pushes, resetting the database, or querying the
  PostgreSQL database layer via @repo/db in the OpenSpace project.
---

# Database & Prisma Workflow (`@repo/db`)

This guide explains how the centralized database package (`@repo/db`) works in the OpenSpace project, how to update schemas, generate client types, execute migrations, and safely interact with PostgreSQL.

---

## 1. Architecture & Design Principles

* **Package Location**: `project/packages/db`
* **Schema Location**: `project/packages/db/prisma/schema.prisma`
* **Generated Output**: `project/packages/db/generated/prisma`
* **Centralized Singleton**: All microservices (`project/apps/http-service`, `project/apps/chat-service`, `project/apps/ws-service`) import `prisma` directly from `@repo/db`. There is no separate "database microservice" or gRPC barrier.
* **Environment Resolver**: `project/packages/db/src/env.ts` automatically discovers and validates environment variables (`DATABASE_URL`, `POSTGRES_PRISMA_URL`) by traversing up from the current service directory to the project root `project/.env`.

---

## 2. Key Commands & Execution Context

Always run database commands through `pnpm` from the project root (`project/`) or targeted with `--filter @repo/db`.

### Core Commands

| Task | Command | Description |
| :--- | :--- | :--- |
| **Start Dev Database** | `pnpm docker:dev` | Starts local PostgreSQL 16 & Redis 7 containers |
| **Stop Dev Database** | `pnpm docker:dev:down` | Stops local dev containers |
| **Generate Prisma Client** | `pnpm --filter @repo/db db:generate` | Regenerates `@prisma/client` types after schema edits |
| **Create & Apply Migration** | `pnpm --filter @repo/db db:migrate` | Runs `prisma migrate dev` (prompts for migration name) |
| **Push Schema (Prototyping)** | `pnpm --filter @repo/db db:push` | Syncs schema directly without creating migration files |
| **Deploy Migrations (Prod)** | `pnpm --filter @repo/db db:prod:migrate` | Runs `prisma migrate deploy` in production / CI |
| **Reset Database** | `pnpm --filter @repo/db db:migrate-reset` | Drops database, reapplies all migrations, and clears data |
| **Typecheck DB Package** | `pnpm --filter @repo/db check-types` | Verifies TypeScript compilation of `@repo/db` |

---

## 3. Schema Modification Procedure

Follow this strict sequence whenever adding or altering database tables, fields, or relations:

### Step 1: Ensure Dev Database is Running
```bash
# In project root (cd project)
pnpm docker:dev
```
Verify PostgreSQL is healthy on `localhost:5432` and `DATABASE_URL` is set in `project/.env`:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/openspace
```

### Step 2: Edit `project/packages/db/prisma/schema.prisma`
Adhere to established model conventions:
- **Primary Keys**: Use CUID or UUID strings (`id String @id`).
- **Enums**: Define typed enums (e.g., `MessageType`, `RoomMemberRole`, `JoinRequestStatus`).
- **Timestamps**: Always include `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`.
- **Soft Deletes**: Chat messages use `isDeleted Boolean @default(false)` rather than hard deletion to preserve message parent-reply tree integrity.
- **Relational Integrity**: Apply `onDelete: Cascade` where dependent child records should be cleaned up automatically with their parent (e.g., `ChatMessage` on `ChatRoom`, `ChatRoomMember` on `ChatRoom`).
- **Indexes**: Add composite indexes on queried combinations, e.g.:
  ```prisma
  @@index([roomId, createdAt])
  @@index([userId])
  @@unique([roomId, userId])
  ```

### Step 3: Generate Migration and Client
```bash
# In project root (cd project)
pnpm --filter @repo/db db:migrate
pnpm --filter @repo/db db:generate
```
This generates:
1. SQL migration file in `project/packages/db/prisma/migrations/`
2. Updated Prisma Client in `project/packages/db/generated/prisma`
3. TypeScript typings available across all apps via `@repo/db`

### Step 4: Verify Project Type Safety
```bash
pnpm check-types
```
Ensures none of the consuming services (`project/apps/http-service`, `project/apps/chat-service`, `project/apps/ws-service`, `project/apps/web`) have broken type references.

---

## 4. Usage Patterns in Services

### Importing the Singleton Client
Always import `prisma` from `@repo/db`:
```typescript
import { prisma, MessageType, RoomMemberRole } from '@repo/db';

// Example: Fetching messages with author and reaction data
const messages = await prisma.chatMessage.findMany({
  where: {
    roomId,
    isDeleted: false,
  },
  include: {
    user: {
      select: {
        id: true,
        name: true,
        username: true,
        avatarUrl: true,
      },
    },
    reactions: true,
  },
  orderBy: { createdAt: 'desc' },
  take: 50,
});
```

### High-Throughput Batch Operations (`StreamWorker`)
For stream persistence and batch operations, use `createMany` with `skipDuplicates: true` to avoid individual transaction overhead:
```typescript
await prisma.chatMessage.createMany({
  data: batch.map(msg => ({
    id: msg.id,
    roomId: msg.roomId,
    userId: msg.sender,
    text: msg.text ?? '',
    type: msg.type ?? MessageType.TEXT,
    parentId: msg.parentId ?? null,
    attachments: msg.attachments ?? null,
    createdAt: new Date(msg.createdAt),
    updatedAt: new Date(),
  })),
  skipDuplicates: true,
});
```

---

## 5. Troubleshooting & Gotchas

* **Issue: `Cannot find module '@repo/db'` or outdated Prisma Client types**
  * *Solution*: Run `pnpm --filter @repo/db db:generate` followed by `pnpm --filter @repo/db build`.
* **Issue: `PrismaClientInitializationError: Can't reach database server`**
  * *Solution*: Check if `docker compose -f project/docker-compose.dev.yml ps` shows `postgres` is healthy. Verify `DATABASE_URL` in `project/.env`.
* **Issue: Migration drift / migration conflict during branch merges**
  * *Solution*: Run `pnpm --filter @repo/db db:migrate-reset` in local development to reset the local schema to a clean state matching migrations.
