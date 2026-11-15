# OpenSpace

OpenSpace is a distraction-free, real-time messaging application for 1-to-1 direct messaging and group chats. Built with a distinctive illustrated stationery & colored-pencil design system on warm tactile paper.

---

## Architecture

OpenSpace is structured as a **pnpm + Turborepo** monorepo:

* **`apps/web2.0`** — Next.js 16 mobile-first web app with Tailwind CSS, Zustand, and Cloudinary media uploads.
* **`apps/api-gateway`** — Single reverse proxy entry point managing route dispatching, auth verification, and CORS.
* **`apps/http-service`** — REST API handling users, direct & group chat creation, memberships, and Pramaan auth.
* **`apps/chat-service`** — Real-time message ingestion, persistence pipeline with Redis Streams, and PostgreSQL.
* **`apps/ws-service`** — High-concurrency WebSocket server for instant real-time message broadcasting and room subscriptions.
* **`packages/@repo/db`** — Prisma schema with PostgreSQL database layer (`ChatRoom`, `RoomMember`, `ChatMessage`, `User`).
* **`packages/@repo/validation`** — Shared Zod validation schemas and TypeScript types across services and frontend.

---

## Features

* **1-to-1 Direct Messaging**: Search users by username or name to immediately start private conversations.
* **Group Chats**: Create collaborative groups with member invitations, roles (`OWNER`, `ADMIN`, `MEMBER`), and group management.
* **Real-Time Delivery**: Low-latency instant message broadcasting powered by WebSockets, Redis Pub/Sub, and Streams.
* **Media & File Attachments**: Share images and PDF documents with inline previews and lightbox viewer.
* **Threaded Replies & Soft Deletes**: Reply directly to messages and manage message lifecycles.
* **Mobile-First Stationery UI**: Responsive dual-pane on desktop, single-pane sliding view on mobile, with colored-pencil aesthetics.
* **Pramaan Authentication**: Secure OAuth authentication and session management.

---

## Quick Start

### 1. Setup
```bash
pnpm install
cp .env.example .env
cp apps/web2.0/.env.example apps/web2.0/.env
```

### 2. Database
```bash
pnpm --filter @repo/db exec prisma generate
pnpm --filter @repo/db run db:push
```

### 3. Run
```bash
# Run all services concurrently in dev mode
pnpm dev
```

---

## License

MIT © [Anuj Acharjee](https://github.com/AnujAcharjee)
