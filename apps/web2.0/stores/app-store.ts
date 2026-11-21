import { create, type StateCreator } from "zustand"
import { devtools, persist, createJSONStorage } from "zustand/middleware"

import type {
  UserRecord,
  RoomRecord,
  ChatMessagePayload,
} from "@repo/validation"

export type RoomMessage = ChatMessagePayload & {
  type?: string
  senderUsername?: string
  senderAvatarUrl?: string | null
  isDeleted?: boolean
  status?: "sending" | "sent" | "failed"
}

export type RoomUiOptions = {
  pinned: boolean
  pinnedAt?: number
  muted: boolean
  unread: boolean
  unreadCount?: number
}

// ─── Direct & Group Presentation Helpers ─────────────────────────────────────

export function getOtherParticipant(
  room: RoomRecord,
  currentUserId?: string | null
): UserRecord | null {
  if (room.type !== "DIRECT") return null
  const otherMember = room.members?.find((m) => m.userId !== currentUserId)
  return otherMember?.user ?? null
}

export function getRoomDisplayName(
  room: RoomRecord,
  currentUserId?: string | null
): string {
  if (room.type === "DIRECT") {
    const other = getOtherParticipant(room, currentUserId)
    return other?.name || (other?.username ? `@${other.username}` : "Direct Message")
  }
  return room.name || "Group Chat"
}

export function getRoomDisplayAvatar(
  room: RoomRecord,
  currentUserId?: string | null
): string | null {
  if (room.type === "DIRECT") {
    const other = getOtherParticipant(room, currentUserId)
    return other?.avatarUrl ?? null
  }
  return room.avatarUrl ?? null
}

// ─── Slices Interfaces ────────────────────────────────────────────────────────

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
  replaceMessage: (roomId: string, oldMessageId: string, newMessage: RoomMessage) => void
  updateMessageStatus: (roomId: string, messageId: string, status: "sending" | "sent" | "failed") => void
  clearMessages: (roomId: string) => void
}

interface DraftsState {
  drafts: Record<string, string>
  setRoomDraft: (roomId: string, text: string) => void
  clearRoomDraft: (roomId: string) => void
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

function mergeRoomMessages(
  currentMessages: RoomMessage[],
  incomingMessages: RoomMessage[]
): RoomMessage[] {
  const mergedMessages = new Map(
    currentMessages.map((message) => [message.id, message])
  )

  for (const incoming of incomingMessages) {
    // Reconcile incoming confirmed message with any matching optimistic placeholder ("sending")
    for (const [id, current] of mergedMessages.entries()) {
      if (
        current.status === "sending" &&
        current.sender === incoming.sender &&
        current.roomId === incoming.roomId &&
        (current.text ?? "") === (incoming.text ?? "") &&
        (current.attachments ?? "") === (incoming.attachments ?? "")
      ) {
        mergedMessages.delete(id)
        break
      }
    }

    mergedMessages.set(incoming.id, incoming)
  }

  return [...mergedMessages.values()].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  )
}

// ─── Slice Creators ───────────────────────────────────────────────────────────

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
            unreadCount: state.roomUiOptions[roomId]?.unreadCount,
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
          unreadCount: state.roomUiOptions[roomId]?.unreadCount,
        },
      },
    })),
  toggleRoomUnread: (roomId) =>
    set((state) => {
      const currentUnread = state.roomUiOptions[roomId]?.unread ?? false
      const nextUnread = !currentUnread
      return {
        roomUiOptions: {
          ...state.roomUiOptions,
          [roomId]: {
            pinned: state.roomUiOptions[roomId]?.pinned ?? false,
            pinnedAt: state.roomUiOptions[roomId]?.pinnedAt,
            muted: state.roomUiOptions[roomId]?.muted ?? false,
            unread: nextUnread,
            unreadCount: nextUnread ? 1 : 0,
          },
        },
      }
    }),
  incrementRoomUnread: (roomId) =>
    set((state) => {
      const currentCount = state.roomUiOptions[roomId]?.unreadCount ?? 0
      return {
        roomUiOptions: {
          ...state.roomUiOptions,
          [roomId]: {
            pinned: state.roomUiOptions[roomId]?.pinned ?? false,
            pinnedAt: state.roomUiOptions[roomId]?.pinnedAt,
            muted: state.roomUiOptions[roomId]?.muted ?? false,
            unread: true,
            unreadCount: currentCount + 1,
          },
        },
      }
    }),
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
        room.id === roomId
          ? {
              ...room,
              lastMessage: message,
              updatedAt: message.createdAt ?? new Date().toISOString(),
            }
          : room
      ),
    })),
  updateRoomInfo: (roomId, data) =>
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === roomId
          ? {
              ...room,
              ...data,
              updatedAt: new Date().toISOString(),
            }
          : room
      ),
    })),
  setActiveRoom: (roomId) => set({ activeRoom: roomId }),
})

const createMessagesSlice: StateCreator<AppState, [], [], MessagesState> = (set) => ({
  messages: {},
  addMessage: (roomId, msg) =>
    set((state) => {
      const currentMessages = state.messages[roomId] ?? []
      return {
        messages: {
          ...state.messages,
          [roomId]: mergeRoomMessages(currentMessages, [msg]),
        },
      }
    }),
  setMessages: (roomId, msgs) =>
    set((state) => {
      const currentMessages = state.messages[roomId] ?? []
      return {
        messages: {
          ...state.messages,
          [roomId]: mergeRoomMessages(currentMessages, msgs),
        },
      }
    }),
  removeMessage: (roomId, messageId) =>
    set((state) => {
      const currentMessages = state.messages[roomId] ?? []
      return {
        messages: {
          ...state.messages,
          [roomId]: currentMessages.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  isDeleted: true,
                  text: undefined,
                  attachments: undefined,
                }
              : msg
          ),
        },
      }
    }),
  replaceMessage: (roomId, oldMessageId, newMessage) =>
    set((state) => {
      const roomMsgs = state.messages[roomId] ?? []
      const alreadyHasNew = roomMsgs.some((m) => m.id === newMessage.id)

      let updatedMsgs: RoomMessage[]
      if (alreadyHasNew) {
        // If WebSocket already added the new message, just remove the old optimistic message
        updatedMsgs = roomMsgs.filter((m) => m.id !== oldMessageId)
      } else {
        // Replace the old optimistic message with the new confirmed message
        updatedMsgs = roomMsgs.map((m) => (m.id === oldMessageId ? newMessage : m))
      }

      // Safeguard: guarantee strict deduplication by id
      const deduplicated = new Map(updatedMsgs.map((m) => [m.id, m]))

      return {
        messages: {
          ...state.messages,
          [roomId]: [...deduplicated.values()].sort(
            (left, right) =>
              new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
          ),
        },
      }
    }),
  updateMessageStatus: (roomId, messageId, status) =>
    set((state) => {
      const roomMsgs = state.messages[roomId] ?? []
      return {
        messages: {
          ...state.messages,
          [roomId]: roomMsgs.map((m) => (m.id === messageId ? { ...m, status } : m)),
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
      roomUiOptions: {},
      messages: {},
      drafts: {},
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
        ...createHydrationSlice(...a),
        ...createAppActionsSlice(...a),
      }),
      {
        name: "openspace-illustrated-cache-v2",
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          user: state.user,
          rooms: state.rooms,
          activeRoom: state.activeRoom,
          roomUiOptions: state.roomUiOptions,
          drafts: state.drafts,
          messages: Object.fromEntries(
            Object.entries(state.messages).map(([roomId, msgs]) => [
              roomId,
              msgs.slice(-100),
            ])
          ),
        }),
        onRehydrateStorage: () => (state, error) => {
          if (error) {
            console.warn("Zustand cache rehydrate error:", error)
          }
          state?.setHasHydrated(true)
        },
      }
    )
  )
)

// Ensure hasHydrated is synchronized on the client immediately if persist finished early
if (typeof window !== "undefined") {
  if (useAppStore.persist?.hasHydrated?.()) {
    useAppStore.getState().setHasHydrated(true)
  } else {
    useAppStore.persist?.onFinishHydration?.(() => {
      useAppStore.getState().setHasHydrated(true)
    })
  }
}

export default useAppStore
