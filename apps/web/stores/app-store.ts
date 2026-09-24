import { create, type StateCreator } from "zustand"
import { devtools, persist } from "zustand/middleware"

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

/**
 * Here only User and rooms are stored in Indexed Db
 */

interface UserState {
  user: UserRecord | null
  setUser: (user: UserRecord | null) => void
}

interface RoomsState {
  rooms: RoomRecord[]
  activeRoom: string | null
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
}

interface MessagesState {
  messages: Record<string, RoomMessage[]>
  addMessage: (roomId: string, msg: RoomMessage) => void
  setMessages: (roomId: string, msgs: RoomMessage[]) => void
  removeMessage: (roomId: string, messageId: string) => void
  clearMessages: (roomId: string) => void
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

type AppState = UserState &
  RoomsState &
  MessagesState &
  JoinRequestsState &
  HydrationState &
  AppActions

function getNextActiveRoomId(
  rooms: RoomRecord[],
  currentActiveRoom: string | null
) {
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

function mergeRoomMessages(
  currentMessages: RoomMessage[],
  incomingMessages: RoomMessage[]
) {
  const mergedMessages = new Map(
    currentMessages.map((message) => [message.id, message])
  )

  for (const message of incomingMessages) {
    mergedMessages.set(message.id, message)
  }

  return [...mergedMessages.values()].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  )
}

// Slices

const createUserSlice: StateCreator<AppState, [], [], UserState> = (set) => ({
  user: null,
  setUser: (user) => set({ user }),
})

const createRoomsSlice: StateCreator<AppState, [], [], RoomsState> = (set) => ({
  rooms: [],
  activeRoom: null,
  roomUiOptions: {},
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
        {}
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
          muted: !(state.roomUiOptions[roomId]?.muted ?? false),
          unread: state.roomUiOptions[roomId]?.unread ?? false,
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
      roomUiOptions: roomId
        ? {
            ...state.roomUiOptions,
            [roomId]: {
              pinned: state.roomUiOptions[roomId]?.pinned ?? false,
              muted: state.roomUiOptions[roomId]?.muted ?? false,
              unread: false,
              unreadCount: 0,
            },
          }
        : state.roomUiOptions,
    })),
})

const createMessagesSlice: StateCreator<AppState, [], [], MessagesState> = (
  set
) => ({
  messages: {},

  addMessage: (roomId, msg) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: mergeRoomMessages(state.messages[roomId] ?? [], [msg]),
      },
    })),

  setMessages: (roomId, msgs) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: mergeRoomMessages(state.messages[roomId] ?? [], msgs),
      },
    })),

  removeMessage: (roomId, messageId) =>
    set((state) => {
      const currentMessages = state.messages[roomId] ?? []
      const filtered = currentMessages.filter((m) => m.id !== messageId)
      const lastMsg = filtered[filtered.length - 1]

      return {
        messages: {
          ...state.messages,
          [roomId]: filtered,
        },
        rooms: state.rooms.map((room) =>
          room.id === roomId && room.lastMessage?.id === messageId
            ? { ...room, lastMessage: lastMsg }
            : room
        ),
      }
    }),

  clearMessages: (roomId) =>
    set((state) => {
      const messages = { ...state.messages }

      delete messages[roomId]

      return { messages }
    }),
})

const createJoinRequestsSlice: StateCreator<
  AppState,
  [],
  [],
  JoinRequestsState
> = (set) => ({
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
      const existing = state.joinRequests[roomId] ?? []
      if (existing.some((r) => r.id === request.id)) {
        return state
      }
      return {
        joinRequests: {
          ...state.joinRequests,
          [roomId]: [request, ...existing],
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

const createHydrationSlice: StateCreator<AppState, [], [], HydrationState> = (
  set
) => ({
  hasHydrated: false,
  setHasHydrated: (v) => set({ hasHydrated: v }),
})

const createAppActionsSlice: StateCreator<AppState, [], [], AppActions> = (
  set
) => ({
  hydrateUserState: ({ user, rooms }) =>
    set((state) => ({
      user,
      rooms,
      activeRoom: getNextActiveRoomId(rooms, state.activeRoom),
    })),
  resetAppState: () =>
    set({
      user: null,
      rooms: [],
      activeRoom: null,
      roomUiOptions: {},
      messages: {},
      joinRequests: {},
    }),
})

// Store

const useAppStore = create<AppState>()(
  devtools(
    persist(
      (...a) => ({
        ...createUserSlice(...a),
        ...createRoomsSlice(...a),
        ...createMessagesSlice(...a),
        ...createJoinRequestsSlice(...a),
        ...createHydrationSlice(...a),
        ...createAppActionsSlice(...a),
      }),
      {
        name: "collab-store",
        partialize: (state) => ({
          user: state.user,
          rooms: state.rooms,
          activeRoom: state.activeRoom,
          roomUiOptions: state.roomUiOptions,
          messages: Object.fromEntries(
            Object.entries(state.messages).map(([roomId, msgs]) => [
              roomId,
              msgs.slice(-50),
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
