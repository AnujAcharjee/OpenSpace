---
name: dev-environment-docker
description: >-
  Use this skill when starting, stopping, configuring, or troubleshooting local development services,
  Docker containers (PostgreSQL, Redis), Docker Compose environments, Caddy TLS reverse proxy,
  or environment variable configuration across the OpenSpace project.
---

# Development Environment & Docker Operations

This guide covers local environment setup, running backing services (PostgreSQL & Redis) via Docker, configuring environment variables, and orchestrating production container deployments.

---

## 1. Quick Start Workflow

### Step 1: Environment Setup
Copy the template files into place:
```bash
# In project root (cd project)
cp .env.example .env
cp apps/web/.env.example apps/web/.env
```

Ensure `project/.env` contains:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/openspace
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev_jwt_secret_change_me
GATEWAY_INTERNAL_SECRET=dev_gateway_secret_change_me
```

### Step 2: Start Backing Infrastructure (Docker)
Launch PostgreSQL 16 and Redis 7:
```bash
# In project root (cd project)
pnpm docker:dev
```
Verify the containers are healthy:
```bash
docker ps --filter "name=openspace_"
```

### Step 3: Run Database Migrations
```bash
# In project root (cd project)
pnpm --filter @repo/db db:migrate
pnpm --filter @repo/db db:generate
```

### Step 4: Start All Applications (Turborepo)
```bash
# In project root (cd project)
pnpm dev
```
Turbo will boot:
* `project/apps/web` (Next.js with Turbopack)
* `project/apps/api-gateway`
* `project/apps/http-service`
* `project/apps/chat-service`
* `project/apps/ws-service`

---

## 2. Port Allocation Reference

### Local Development Ports (`project/.env.example`)

| Service | Port | Local URL | Role |
| :--- | :--- | :--- | :--- |
| **Web Frontend** | `3000` | `http://localhost:3000` | Next.js 16 Web App |
| **API Gateway** | `3005` | `http://localhost:3005` | Entry point & proxy |
| **HTTP Service** | `3003` | `http://localhost:3003` | REST endpoints & Auth |
| **Chat Service** | `3001` | `http://localhost:3001` | Chat ingestion & StreamWorker |
| **WS Service** | `3002` | `ws://localhost:3002` | Real-time WebSocket server |
| **PostgreSQL** | `5432` | `localhost:5432` | Main database |
| **Redis** | `6379` | `localhost:6379` | Pub/Sub, Cache, Streams |

### Production Docker Stack (`project/docker-compose.yml`)

| Container | Internal Port | Exposed Port | Description |
| :--- | :--- | :--- | :--- |
| `openspace_caddy` | 80, 443 | `80`, `443` | Reverse proxy with TLS |
| `openspace_api_gateway` | 3005 | Internal | Routes client requests |
| `openspace_http_service` | 3001 | Internal | REST API |
| `openspace_chat_service` | 3000 | Internal | Chat & StreamWorker |
| `openspace_ws_service` | 3002 | Internal | WebSocket broadcaster |

---

## 3. Managing Docker Dev Infrastructure

| Action | Command | Details |
| :--- | :--- | :--- |
| **Start Dev Services** | `pnpm docker:dev` | Starts Postgres & Redis in background with healthchecks |
| **Stop Dev Services** | `pnpm docker:dev:down` | Stops containers without removing data volumes |
| **Inspect Redis CLI** | `docker exec -it openspace_redis_dev redis-cli` | Access interactive Redis shell |
| **Inspect Postgres SQL** | `docker exec -it openspace_postgres_dev psql -U postgres -d openspace` | Access interactive psql shell |
| **Wipe Dev DB Volumes** | `docker compose -f project/docker-compose.dev.yml down -v` | Resets Postgres & Redis data completely |

---

## 4. Multi-Stage Docker Builds (`project/Dockerfile`)

The root `project/Dockerfile` is parameterized using the `APP_NAME` build argument:
```bash
# Build specific service container (from project/)
docker build -t openspace:chat-service --build-arg APP_NAME=chat-service .
```

To build and run the complete production stack:
```bash
# From project/
docker compose up -d --build
```

### Key Production Docker Characteristics:
* **Node Alpine Base**: Minimal image footprint.
* **Pruned Project Monorepo**: Uses `turbo prune --scope=${APP_NAME} --docker` to isolate only necessary packages.
* **Prisma Generation**: Generates client types during the build stage before compiling TypeScript.
* **Isolated Network**: All services communicate over internal bridge `openspace_net`. Caddy is the only exposed edge container.

---

## 5. Troubleshooting Common Issues

* **Port Collision**: If `5432` or `6379` is already in use by local services, stop existing local services (`net stop postgresql` / `brew services stop redis`) or change host port in `project/docker-compose.dev.yml`.
* **Prisma Connection Refused**: Ensure container healthcheck is green (`docker inspect --format='{{json .State.Health}}' openspace_postgres_dev`).
* **Caddy SSL Errors on Localhost**: Caddy is configured for production domains. For local testing without a domain, set `API_DOMAIN=localhost` in `project/.env`.
