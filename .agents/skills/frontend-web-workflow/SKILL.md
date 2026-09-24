---
name: frontend-web-workflow
description: >-
  Use this skill when developing UI components, pages, state management, WebSocket client
  interactions, Cloudinary media uploads, or styling in the Next.js frontend application (project/apps/web).
---

# Frontend Web Workflow (`project/apps/web`)

This guide outlines architecture, component design, state management with Zustand, WebSocket connection lifecycles, and styling practices for the OpenSpace Next.js 16 web application.

---

## 1. Technical Stack & Layout

* **Framework**: Next.js 16 (App Router with Turbopack, React 19)
* **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`), Radix UI primitives, `class-variance-authority` (CVA), `tw-animate-css`
* **Icons**: `@tabler/icons-react`
* **State Management**: Zustand (`project/apps/web/stores/app-store.ts`)
* **Toasts & Feedback**: Sonner (`toast`)
* **Theme**: `next-themes` (Dark & Light support)
* **Real-Time Client**: Singleton WebSocket manager (`project/apps/web/ws/index.ts`)

---

## 2. Running & Developing the Frontend

```bash
# From project root (cd project, Turbopack dev mode)
pnpm --filter web dev

# Run type check
pnpm --filter web typecheck

# Run linter
pnpm --filter web lint

# Format frontend code
pnpm --filter web format
```

Ensure `project/apps/web/.env` is configured:
```env
NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:3005
NEXT_PUBLIC_WS_SRV_URL=ws://localhost:3002
NEXT_PUBLIC_CLOUDINARY_URL=cloudinary://your_key:your_secret@your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=openspace_avatars
```

---

## 3. Real-Time WebSocket Client Pattern

The frontend maintains a single WebSocket connection across the entire user session.

### Connection & Ticket Handshake
1. Client calls `POST /api/v1/users/ticket` to acquire a short-lived ticket.
2. Client opens socket: `ws://${NEXT_PUBLIC_WS_SRV_URL}?ticket=${ticket}`.
3. On connection open, socket listener is wired to message handlers in `project/apps/web/ws/handlers.ts`.

### Room Subscription Lifecycle (`join_room`)
When a user navigates to or opens a room:
```typescript
import { wsClient } from '@/ws';

// In room component or selection hook
useEffect(() => {
  if (!activeRoomId) return;

  // Inform ws-service to add this client to room:{roomId} ref count
  wsClient.send({
    type: 'join_room',
    data: { roomId: activeRoomId },
  });
}, [activeRoomId]);
```

### Optimistic Message Dispatch
When sending a message:
1. Generate temporary ID with `uuidv4()`.
2. Add message to local Zustand store (`addMessage`) with `status: 'sending'`.
3. Dispatch `POST /api/v1/chat/messages` through API gateway.
4. When confirmation / WebSocket event arrives, update temporary message ID and mark `status: 'sent'`.

---

## 4. State Management with Zustand (`project/apps/web/stores/app-store.ts`)

Centralized store in `project/apps/web/stores/app-store.ts` handles:
* `user`: Current authenticated user profile
* `rooms`: List of public and joined chat rooms
* `activeRoomId`: Currently selected conversation
* `messages`: Map of `roomId -> ChatMessage[]`
* `onlineUsers`: Real-time online presence set
* `typingUsers`: Ephemeral map of typing indicators per room

### Store Usage Example:
```typescript
import { useAppStore } from '@/stores/app-store';

export function ChatHeader() {
  const activeRoomId = useAppStore(state => state.activeRoomId);
  const rooms = useAppStore(state => state.rooms);
  const activeRoom = rooms.find(r => r.id === activeRoomId);

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b">
      <h2 className="text-lg font-semibold">{activeRoom?.name}</h2>
    </div>
  );
}
```

---

## 5. UI & Styling Guidelines

* **Tailwind v4 Conventions**: Use standard Tailwind CSS classes. Leverage utility functions in `project/apps/web/lib/utils.ts` (`cn()`) for conditional class merging.
* **Component Primitives**: Check `project/apps/web/components/ui/` for existing Radix-based UI components (buttons, dialogs, dropdown menus, inputs) before creating custom elements.
* **Responsive Layout**: OpenSpace uses `react-resizable-panels` for desktop split views (Sidebar, Chat Window, Info Panel) with collapsible mobile drawer overlays.
* **Rich Aesthetics**: Maintain dark mode contrast, subtle glassmorphism (`backdrop-blur`), smooth transitions, and distinct status badges (online/offline, admin/member).

---

## 6. Cloudinary Upload Integration

For avatar changes and chat attachment uploads:
1. Direct unsigned upload to Cloudinary using `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`.
2. Retrieve secure URL from Cloudinary JSON response.
3. Attach secure URL to message attachment payload or user profile update request.
