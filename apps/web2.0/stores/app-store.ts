import { create, type StateCreator } from "zustand"
import { devtools, persist, createJSONStorage } from "zustand/middleware"

import type {
  UserRecord,
  RoomRecord,
  ChatMessagePayload,
  RoomJoinRequestRecord,
} from "@repo/validation"

export type RoomMessage = ChatMessagePayload & {
  type?: string
  senderUsername?: string
  senderAvatarUrl?: string | null
  isDeleted?: boolean
}

export type RoomUiOptions = {
  pinned: boolean
  pinnedAt?: number
  muted: boolean
  unread: boolean
  unreadCount?: number
}

// ─── Slices Interfaces ────────────────────────────────────────────────────────

interface UserState {
  user: UserRecord | null
  setUser: (user: UserRecord | null) => void
}

interface RoomsState {
  rooms: RoomRecord[]
  activeRoom: string | null
  isExploringChannels: boolean
  roomUiOptions: Record<string, RoomUiOptions>
  setRooms: (rooms: RoomRecord[]) => void
  upsertRoom: (room: RoomRecord) => void
  removeRoom: (roomId: string) => void
  toggleRoomPinned: (roomId: string) => void
  toggleRoomMuted: (roomId: string) => void
  toggleRoomUnread: (roomId: string) => void
  incrementRoomUnread: (roomId: string) => void
  clearRoomUnread: (roomId: string) => void
  updateRoomLastMessage: (roomId: string, message: ChatMessagePayload) => void
  updateRoomInfo: (roomId: string, data: Partial<RoomRecord>) => void
  setActiveRoom: (roomId: string | null) => void
  setIsExploringChannels: (isExploring: boolean) => void
}

interface MessagesState {
  messages: Record<string, RoomMessage[]>
  addMessage: (roomId: string, msg: RoomMessage) => void
  setMessages: (roomId: string, msgs: RoomMessage[]) => void
  removeMessage: (roomId: string, messageId: string) => void
  clearMessages: (roomId: string) => void
}

interface DraftsState {
  drafts: Record<string, string>
  setRoomDraft: (roomId: string, text: string) => void
  clearRoomDraft: (roomId: string) => void
}

interface JoinRequestsState {
  joinRequests: Record<string, RoomJoinRequestRecord[]>
  setJoinRequests: (roomId: string, requests: RoomJoinRequestRecord[]) => void
  addJoinRequest: (roomId: string, request: RoomJoinRequestRecord) => void
  removeJoinRequest: (roomId: string, requestId: string) => void
}

interface HydrationState {
  hasHydrated: boolean
  setHasHydrated: (v: boolean) => void
}

interface AppActions {
  hydrateUserState: (payload: { user: UserRecord; rooms: RoomRecord[] }) => void
  resetAppState: () => void
}

export type AppState = UserState &
  RoomsState &
  MessagesState &
  DraftsState &
  JoinRequestsState &
  HydrationState &
  AppActions

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNextActiveRoomId(
  rooms: RoomRecord[],
  currentActiveRoom: string | null
): string | null {
  if (!rooms.length) {
    return null
  }

  if (
    currentActiveRoom &&
    rooms.some((room) => room.id === currentActiveRoom)
  ) {
    return currentActiveRoom
  }

  return rooms[0].id
}

function safeTimestamp(date?: string | Date | null): number {
  if (!date) return 0
  const t = new Date(date).getTime()
  return Number.isNaN(t) ? 0 : t
}

export function sortRooms(
  rooms: RoomRecord[],
  roomUiOptions: Record<string, RoomUiOptions>
): RoomRecord[] {
  return [...rooms].sort((a, b) => {
    const aOptions = roomUiOptions[a.id]
    const bOptions = roomUiOptions[b.id]
    const aPinned = Boolean(aOptions?.pinned)
    const bPinned = Boolean(bOptions?.pinned)

    // 1. Pinned channels always on top
    if (aPinned !== bPinned) {
      return aPinned ? -1 : 1
    }

    // 2. If both pinned, newest pinned at top
    if (aPinned && bPinned) {
      const aPinnedAt = aOptions?.pinnedAt ?? 0
      const bPinnedAt = bOptions?.pinnedAt ?? 0
      if (aPinnedAt !== bPinnedAt) {
        return bPinnedAt - aPinnedAt
      }
    }

    // 3. Newest channel/activity at top (guarded against NaN)
    const aTime = Math.max(
      safeTimestamp(a.lastMessage?.createdAt),
      safeTimestamp(a.createdAt)
    )
    const bTime = Math.max(
      safeTimestamp(b.lastMessage?.createdAt),
      safeTimestamp(b.createdAt)
    )
    return bTime - aTime
  })
}

function mergeRoomMessages(
  currentMessages: RoomMessage[],
  incomingMessages: RoomMessage[]
): RoomMessage[] {
  const mergedMessages = new Map(
    currentMessages.map((message) => [message.id, message])
  )

  for (const message of incomingMessages) {
    mergedMessages.set(message.id, message)
  }

  return [...mergedMessages.values()].sort(
    (left, right) => safeTimestamp(left.createdAt) - safeTimestamp(right.createdAt)
  )
}

// ─── Slices ───────────────────────────────────────────────────────────────────

const createUserSlice: StateCreator<AppState, [], [], UserState> = (set) => ({
  user: null,
  setUser: (user) => set({ user }),
})

const createRoomsSlice: StateCreator<AppState, [], [], RoomsState> = (set) => ({
  rooms: [],
  activeRoom: null,
  isExploringChannels: false,
  roomUiOptions: {},
  setIsExploringChannels: (isExploring) => set({ isExploringChannels: isExploring }),
  setRooms: (rooms) =>
    set((state) => ({
      rooms,
      activeRoom: getNextActiveRoomId(rooms, state.activeRoom),
      roomUiOptions: rooms.reduce<Record<string, RoomUiOptions>>(
        (acc, room) => {
          acc[room.id] = state.roomUiOptions[room.id] ?? {
            pinned: false,
            muted: false,
            unread: false,
          }
          return acc
        },
        { ...state.roomUiOptions }
      ),
    })),
  upsertRoom: (room) =>
    set((state) => {
      const roomExists = state.rooms.some(
        (existingRoom) => existingRoom.id === room.id
      )
      const rooms = roomExists
        ? state.rooms.map((existingRoom) =>
            existingRoom.id === room.id ? room : existingRoom
          )
        : [...state.rooms, room]

      return {
        rooms,
        activeRoom: state.activeRoom ?? room.id,
        roomUiOptions: {
          ...state.roomUiOptions,
          [room.id]: state.roomUiOptions[room.id] ?? {
            pinned: false,
            muted: false,
            unread: false,
          },
        },
      }
    }),
  removeRoom: (roomId) =>
    set((state) => {
      const rooms = state.rooms.filter((room) => room.id !== roomId)
      const roomUiOptions = { ...state.roomUiOptions }
      delete roomUiOptions[roomId]

      return {
        rooms,
        activeRoom: getNextActiveRoomId(rooms, state.activeRoom),
        roomUiOptions,
      }
    }),
  toggleRoomPinned: (roomId) =>
    set((state) => {
      const isCurrentlyPinned = state.roomUiOptions[roomId]?.pinned ?? false
      const nextPinned = !isCurrentlyPinned
      return {
        roomUiOptions: {
          ...state.roomUiOptions,
          [roomId]: {
            pinned: nextPinned,
            pinnedAt: nextPinned ? Date.now() : undefined,
            muted: state.roomUiOptions[roomId]?.muted ?? false,
            unread: state.roomUiOptions[roomId]?.unread ?? false,
            unreadCount: state.roomUiOptions[roomId]?.unreadCount ?? 0,
          },
        },
      }
    }),
  toggleRoomMuted: (roomId) =>
    set((state) => ({
      roomUiOptions: {
        ...state.roomUiOptions,
        [roomId]: {
          pinned: state.roomUiOptions[roomId]?.pinned ?? false,
          pinnedAt: state.roomUiOptions[roomId]?.pinnedAt,
          muted: !(state.roomUiOptions[roomId]?.muted ?? false),
          unread: state.roomUiOptions[roomId]?.unread ?? false,
          unreadCount: state.roomUiOptions[roomId]?.unreadCount ?? 0,
        },
      },
    })),
  toggleRoomUnread: (roomId) =>
    set((state) => {
      const isUnread = !(state.roomUiOptions[roomId]?.unread ?? false)
      return {
        roomUiOptions: {
          ...state.roomUiOptions,
          [roomId]: {
            pinned: state.roomUiOptions[roomId]?.pinned ?? false,
            pinnedAt: state.roomUiOptions[roomId]?.pinnedAt,
            muted: state.roomUiOptions[roomId]?.muted ?? false,
            unread: isUnread,
            unreadCount: isUnread ? 1 : 0,
          },
        },
      }
    }),
  incrementRoomUnread: (roomId) =>
    set((state) => ({
      roomUiOptions: {
        ...state.roomUiOptions,
        [roomId]: {
          pinned: state.roomUiOptions[roomId]?.pinned ?? false,
          pinnedAt: state.roomUiOptions[roomId]?.pinnedAt,
          muted: state.roomUiOptions[roomId]?.muted ?? false,
          unread: true,
          unreadCount: (state.roomUiOptions[roomId]?.unreadCount ?? 0) + 1,
        },
      },
    })),
  clearRoomUnread: (roomId) =>
    set((state) => ({
      roomUiOptions: {
        ...state.roomUiOptions,
        [roomId]: {
          pinned: state.roomUiOptions[roomId]?.pinned ?? false,
          pinnedAt: state.roomUiOptions[roomId]?.pinnedAt,
          muted: state.roomUiOptions[roomId]?.muted ?? false,
          unread: false,
          unreadCount: 0,
        },
      },
    })),
  updateRoomLastMessage: (roomId, message) =>
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === roomId ? { ...room, lastMessage: message } : room
      ),
    })),
  updateRoomInfo: (roomId, data) => {
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === roomId ? { ...room, ...data } : room
      ),
    }))
  },
  setActiveRoom: (roomId) =>
    set((state) => ({
      activeRoom: roomId,
      isExploringChannels: roomId ? false : state.isExploringChannels,
      roomUiOptions: roomId
        ? {
            ...state.roomUiOptions,
            [roomId]: {
              pinned: state.roomUiOptions[roomId]?.pinned ?? false,
              pinnedAt: state.roomUiOptions[roomId]?.pinnedAt,
              muted: state.roomUiOptions[roomId]?.muted ?? false,
              unread: false,
              unreadCount: 0,
            },
          }
        : state.roomUiOptions,
    })),
})

const createMessagesSlice: StateCreator<AppState, [], [], MessagesState> = (set) => ({
  messages: {},
  addMessage: (roomId, msg) =>
    set((state) => {
      const roomMsgs = state.messages[roomId] ?? []
      if (roomMsgs.some((m) => m.id === msg.id)) {
        return state
      }
      return {
        messages: {
          ...state.messages,
          [roomId]: [...roomMsgs, msg],
        },
      }
    }),
  setMessages: (roomId, msgs) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: mergeRoomMessages(state.messages[roomId] ?? [], msgs),
      },
    })),
  removeMessage: (roomId, messageId) =>
    set((state) => {
      const roomMsgs = state.messages[roomId] ?? []
      return {
        messages: {
          ...state.messages,
          [roomId]: roomMsgs.map((m) =>
            m.id === messageId ? { ...m, isDeleted: true } : m
          ),
        },
      }
    }),
  clearMessages: (roomId) =>
    set((state) => {
      const messages = { ...state.messages }
      delete messages[roomId]
      return { messages }
    }),
})

const createDraftsSlice: StateCreator<AppState, [], [], DraftsState> = (set) => ({
  drafts: {},
  setRoomDraft: (roomId, text) =>
    set((state) => ({
      drafts: {
        ...state.drafts,
        [roomId]: text,
      },
    })),
  clearRoomDraft: (roomId) =>
    set((state) => {
      const drafts = { ...state.drafts }
      delete drafts[roomId]
      return { drafts }
    }),
})

const createJoinRequestsSlice: StateCreator<AppState, [], [], JoinRequestsState> = (set) => ({
  joinRequests: {},
  setJoinRequests: (roomId, requests) =>
    set((state) => ({
      joinRequests: {
        ...state.joinRequests,
        [roomId]: requests,
      },
    })),
  addJoinRequest: (roomId, request) =>
    set((state) => {
      const current = state.joinRequests[roomId] ?? []
      if (current.some((r) => r.id === request.id)) {
        return state
      }
      return {
        joinRequests: {
          ...state.joinRequests,
          [roomId]: [...current, request],
        },
      }
    }),
  removeJoinRequest: (roomId, requestId) =>
    set((state) => ({
      joinRequests: {
        ...state.joinRequests,
        [roomId]: (state.joinRequests[roomId] ?? []).filter(
          (r) => r.id !== requestId
        ),
      },
    })),
})

const createHydrationSlice: StateCreator<AppState, [], [], HydrationState> = (set) => ({
  hasHydrated: false,
  setHasHydrated: (v) => set({ hasHydrated: v }),
})

const createAppActionsSlice: StateCreator<AppState, [], [], AppActions> = (set) => ({
  hydrateUserState: ({ user, rooms }) =>
    set((state) => ({
      user,
      rooms,
      activeRoom: getNextActiveRoomId(rooms, state.activeRoom),
      roomUiOptions: rooms.reduce<Record<string, RoomUiOptions>>(
        (acc, room) => {
          acc[room.id] = state.roomUiOptions[room.id] ?? {
            pinned: false,
            muted: false,
            unread: false,
          }
          return acc
        },
        { ...state.roomUiOptions }
      ),
    })),
  resetAppState: () =>
    set({
      user: null,
      rooms: [],
      activeRoom: null,
      isExploringChannels: false,
      roomUiOptions: {},
      messages: {},
      drafts: {},
      joinRequests: {},
    }),
})

// ─── Store Initialization with Deep Browser Caching ──────────────────────────

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (...a) => ({
        ...createUserSlice(...a),
        ...createRoomsSlice(...a),
        ...createMessagesSlice(...a),
        ...createDraftsSlice(...a),
        ...createJoinRequestsSlice(...a),
        ...createHydrationSlice(...a),
        ...createAppActionsSlice(...a),
      }),
      {
        name: "openspace-illustrated-cache-v1",
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          user: state.user,
          rooms: state.rooms,
          activeRoom: state.activeRoom,
          roomUiOptions: state.roomUiOptions,
          drafts: state.drafts,
          // Cache up to 100 recent messages per channel for 0ms initial load & room switching
          messages: Object.fromEntries(
            Object.entries(state.messages).map(([roomId, msgs]) => [
              roomId,
              msgs.slice(-100),
            ])
          ),
        }),
        onRehydrateStorage: () => (state) => {
          state?.setHasHydrated(true)
        },
      }
    )
  )
)

export default useAppStore
