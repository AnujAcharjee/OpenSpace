# Workspace Skills Catalog

This directory contains specialized Antigravity skills for the **OpenSpace** project. Each skill acts as an on-demand procedural runbook and architectural cheatsheet for the agent.

---

## Available Skills

| Skill | Directory | Primary Triggers & Scenarios |
| :--- | :--- | :--- |
| **`db-prisma-workflow`** | [`db-prisma-workflow/SKILL.md`](./db-prisma-workflow/SKILL.md) | Prisma schema updates, client generation (`db:generate`), migrations (`db:migrate`), push (`db:push`), database reset, and `@repo/db` queries. |
| **`realtime-chat-architecture`** | [`realtime-chat-architecture/SKILL.md`](./realtime-chat-architecture/SKILL.md) | Fast-path fanout (`room:{id}`), Redis Streams (`stream:chat-messages`), StreamWorker batch persistence, Dead Letter Queue (DLQ), WebSocket SubscriptionManager, and multi-tab presence. |
| **`service-api-routing`** | [`service-api-routing/SKILL.md`](./service-api-routing/SKILL.md) | API Gateway (`:3005`) raw streaming proxy, downstream routing, inter-service security (`x-gateway-secret`), user injection (`x-user-id`), Zod validation, and Pramaan auth. |
| **`dev-environment-docker`** | [`dev-environment-docker/SKILL.md`](./dev-environment-docker/SKILL.md) | Starting dev backing services (`pnpm docker:dev` for Postgres + Redis), port allocations, environment variables, multi-stage Docker builds, and production Docker Compose with Caddy TLS. |
| **`monorepo-quality-testing`** | [`monorepo-quality-testing/SKILL.md`](./monorepo-quality-testing/SKILL.md) | Running Vitest test suites, Turbo pipelines (`build`, `lint`, `check-types`, `format`), unit testing patterns, mocking Prisma/Redis, and pre-PR verification. |
| **`frontend-web-workflow`** | [`frontend-web-workflow/SKILL.md`](./frontend-web-workflow/SKILL.md) | Next.js 16 (App Router + Turbopack), Tailwind CSS v4, Zustand store (`app-store.ts`), WebSocket client (`join_room`), Cloudinary media uploads, and UI design standards. |
