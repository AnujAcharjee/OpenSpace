# OpenSpace 

OpenSpace is a real-time social platform to discover channels, join conversations, and connect with people worldwide. It lets you create custom public or private spaces around any topic, chat in channels, and share media through a fast, modern communication experience.

---

## Architecture

OpenSpace is organized as a **pnpm + Turborepo** monorepo:

* **`apps/web`** — Next.js 16 frontend with Tailwind CSS, Zustand, and Cloudinary media uploads.
* **`apps/api-gateway`** — Single entry point managing route proxying, auth verification, and CORS.
* **`apps/http-service`** — REST API handling users, channel discovery, memberships, and Pramaan auth.
* **`apps/chat-service`** — Stream-based message ingestion and background persistence with Redis Streams & PostgreSQL.
* **`apps/ws-service`** — High-concurrency WebSocket server for instant real-time message broadcasting.
* **`packages/*`** — Shared database schemas (Prisma), auth helpers, TypeScript configs, and validation.

---

## Features

* **Channels & Direct Chat**: Create and discover public or private channels around any topic.
* **Live Messaging**: Low-latency chat delivery powered by WebSockets and Redis Streams.
* **Media Attachments**: Direct image and document sharing optimized with Cloudinary.
* **Authentication**: Streamlined OAuth sign-in with secure, stateless sessions powered by [Pramaan](https://github.com/AnujAcharjee/pramaan).
* **Modern Interface**: Custom dark and light themes, message replies, and optimistic UI updates.
* **Containerized Deployment**: Automated Docker Compose workflow with Caddy TLS on AWS EC2.

---

## Quick Start

### 1. Setup
```bash
pnpm install
cp .env.example .env
cp apps/web/.env.example apps/web/.env
```

### 2. Run
```bash
# Run all services
pnpm dev
```

---

## License

MIT © [Anuj Acharjee](https://github.com/AnujAcharjee)
