# ─── Stage 1: Base & Dependencies ─────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@10.33.0

# ─── Stage 2: Builder ────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

# Copy root workspace configs
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy internal packages and apps
COPY packages ./packages
COPY apps ./apps

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma Client singleton
RUN pnpm --filter @repo/db exec prisma generate

# Build all backend TypeScript packages & microservices (skipping web & web2.0)
RUN pnpm turbo run build --filter=!web --filter=!web2.0

# ─── Stage 3: Production Runner ──────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ARG APP_NAME
ENV APP_NAME=${APP_NAME}
ENV NODE_ENV=production

# Copy full built monorepo workspace
COPY --from=builder /app /app

WORKDIR /app/apps/${APP_NAME}

# Run the compiled microservice
CMD ["node", "dist/index.js"]
