---
trigger: always_on
description: Mandatory preservation rules ensuring 100% functional, architectural, API, and state parity when building or redesigning the frontend (web-2).
---

# Frontend Functional Preservation Rules

> [!IMPORTANT]
> **Core Mandate**: This is a **VISUAL REDESIGN ONLY**. Do NOT alter the application's underlying functionality, architecture, data contracts, routes, authentication, WebSocket lifecycle, or state management. Use `project/apps/web` as the definitive single source of truth for behavior.

---

## 1. Absolute Behavioral Invariants

When creating, refactoring, or building components in `project/apps/web-2`:

1. **Zero Backend / API Changes**:
   - Preserve all existing API endpoints, HTTP methods, headers, and request/response payloads.
   - Reuse the exact API constants from `project/apps/web/constants/apiUrls.ts` (proxied via API Gateway on port `3005`).
   - Do NOT replace working APIs with mock data, stub responses, or fake delays.

2. **WebSocket & Real-Time Parity**:
   - Replicate the exact WebSocket connection lifecycle from `project/apps/web/ws/index.ts`.
   - Maintain the ticket authentication handshake (`POST /api/v1/users/ticket`).
   - Maintain dynamic room subscription via `{ type: 'join_room', data: { roomId } }`.
   - Wire all incoming WebSocket events (`chat_message`, `message_deleted`, `room_member_removed`, `notification`, etc.) to the exact same handlers as `project/apps/web/ws/handlers.ts`.

3. **State Management & Zustand Store Parity**:
   - The state model must match `project/apps/web/stores/app-store.ts` in full.
   - All state slices (`user`, `rooms`, `activeRoomId`, `messages`, `onlineUsers`, `typingUsers`, `notifications`) and actions must retain their exact signatures and behaviors.
   - Maintain optimistic updates: generate local message UUIDs, set temporary status (`sending`), and update upon server/WS confirmation.

4. **Authentication & Session Preservation**:
   - Maintain the cookie-based session model and Pramaan OAuth redirect flow.
   - Do not alter token storage, cookie names, or route guards.
   - Preserve authenticated vs. unauthenticated route middleware and redirects.

5. **Route Hierarchy & Page Parity**:
   - Replicate the route layout and App Router structure from `project/apps/web/app`:
     - `/(auth)/login`
     - `/(auth)/signup`
     - `/(pages)/(home)` (Main chat interface with sidebar, channel browsing, active room chat, user settings modal)
     - `/(pages)/profile` or account settings
   - Do not remove or hide routes or features because they are visually inconvenient to style.

6. **Shared Monorepo Integration**:
   - Depend directly on `@repo/validation` for Zod schemas and TypeScript payload types.
   - Maintain identical package dependencies, scripts, and TypeScript configurations.

---

## 2. Pre-Redesign Inspection Checklist

Before writing any new component or screen in `project/apps/web-2`:
- [ ] Inspect the corresponding component in `project/apps/web`.
- [ ] List all props, state hooks, and custom hooks (`useAppStore`, `useChatSocket`, etc.).
- [ ] Identify all network requests triggered (fetching messages, creating rooms, reactions, uploads).
- [ ] Confirm all edge cases (empty states, errors, loading, optimistic rollback, disconnect reconnections).
- [ ] Implement the new visual design around the *identical* functional logic.
