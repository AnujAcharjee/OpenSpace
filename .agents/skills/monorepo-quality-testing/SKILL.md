---
name: monorepo-quality-testing
description: >-
  Use this skill when running tests, executing type checks, running ESLint or Prettier,
  building packages, or validating code quality across the OpenSpace Turborepo project.
---

# Monorepo Quality, Testing & CI Verification

This guide outlines the quality pipeline, test execution with Vitest, monorepo dependency graph validation, and verification procedures before committing code.

---

## 1. Quick Quality Check Commands

All tasks are orchestrated via **Turborepo** (`project/turbo.json`) and **Vitest** from the project root (`project/`):

| Command | Action | Scope |
| :--- | :--- | :--- |
| **`pnpm test`** | Runs Vitest unit & integration test suites | Project-wide |
| **`pnpm check-types`** | Runs TypeScript compiler (`tsc --noEmit`) | Project-wide |
| **`pnpm lint`** | Runs ESLint | Project-wide |
| **`pnpm format`** | Runs Prettier auto-formatter | Project-wide |
| **`pnpm build`** | Builds packages and production bundles | Project-wide |

---

## 2. Testing Framework (`Vitest`)

The project uses **Vitest** with centralized path aliases defined in `project/vitest.config.ts`:
- `@repo/validation` -> `project/packages/validation/src/index.ts`
- `@repo/db` -> `project/packages/db/src/index.ts`
- `@repo/redis` -> `project/packages/redis/src/index.ts`
- `@repo/logger` -> `project/packages/logger/src/index.ts`
- `@repo/auth` -> `project/packages/auth/src/index.ts`

### Running Focused Tests
```bash
# In project root (cd project)
# Run all tests once
pnpm test

# Run a specific test suite
pnpm vitest run apps/chat-service/src/__tests__/streamWorker.test.ts
pnpm vitest run apps/ws-service/src/__tests__/subscriptionManager.test.ts
pnpm vitest run apps/http-service/src/__tests__/cookie.test.ts
pnpm vitest run packages/validation/src/__tests__/schemas.test.ts

# Run tests in watch mode during TDD
pnpm vitest apps/chat-service/src/__tests__/membership.test.ts
```

---

## 3. Existing Test Coverage Map

| Test Suite | File Location | Key Scenarios Covered |
| :--- | :--- | :--- |
| **Validation Schemas** | `project/packages/validation/src/__tests__/schemas.test.ts` | Zod schema validation for messages, rooms, and user inputs |
| **Auth Cookies** | `project/apps/http-service/src/__tests__/cookie.test.ts` | Access token cookie generation, SameSite flags, domain config |
| **Room Management** | `project/apps/http-service/src/__tests__/room.test.ts` | Room creation, membership checks, search filtering |
| **StreamWorker & DLQ** | `project/apps/chat-service/src/__tests__/streamWorker.test.ts` | Batch DB persistence, DLQ routing on poison pill, crash recovery |
| **Membership Cache** | `project/apps/chat-service/src/__tests__/membership.test.ts` | Redis set `room:{id}:members` lookups, self-healing DB fallback |
| **SubscriptionManager** | `project/apps/ws-service/src/__tests__/subscriptionManager.test.ts` | Socket ref-counting, selective channel subscribe/unsubscribe |

---

## 4. Writing New Unit Tests

When writing new unit tests, mock external backing services (Redis and Prisma) rather than requiring running Docker containers:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Example: Mocking Prisma singleton
vi.mock('@repo/db', () => ({
  prisma: {
    chatMessage: {
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    chatRoomMember: {
      findUnique: vi.fn(),
    },
  },
  MessageType: { TEXT: 'TEXT', IMAGE: 'IMAGE', FILE: 'FILE', SYSTEM: 'SYSTEM' },
}));

describe('MyService Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle expected logic branch', async () => {
    // Test logic here
  });
});
```

---

## 5. Pre-Commit / Pre-PR Verification Procedure

Before submitting changes, run the complete verification gauntlet:

```bash
# In project root (cd project)
# 1. Ensure code is properly formatted
pnpm format

# 2. Verify all TypeScript types compile without errors
pnpm check-types

# 3. Ensure ESLint rules pass
pnpm lint

# 4. Verify all tests pass
pnpm test

# 5. Verify production builds compile cleanly
pnpm build
```

If any step fails, investigate the offending package:
* To debug a single package's typecheck: `pnpm --filter <package-name> check-types`
* To debug a single package's linting: `pnpm --filter <package-name> lint`
