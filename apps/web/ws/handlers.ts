import {
  chatMessagePayloadSchema,
  messageDeletedPayloadSchema,
  notificationPayloadSchema,
  roomMemberRemovedPayloadSchema,
  roomJoinedPayloadSchema,
  roomUpdatedPayloadSchema,
  roomDeletedPayloadSchema,
  roomJoinRequestedPayloadSchema,
} from "@repo/validation"
import useAppStore from "@/stores/app-store"
import { wsClient } from "@/ws"
import { toast } from "sonner"

export const handlers: Record<string, (payload: unknown) => void> = {
  chat_message: (payload) => {
    try {
      const message = chatMessagePayloadSchema.parse(payload)
      const { addMessage, updateRoomLastMessage, activeRoom, incrementRoomUnread } = useAppStore.getState()
      addMessage(message.roomId, message)
      updateRoomLastMessage(message.roomId, message)
      if (activeRoom !== message.roomId) {
        incrementRoomUnread(message.roomId)
      }
    } catch {}
  },
  message_deleted: (payload) => {
    try {
      const data = messageDeletedPayloadSchema.parse(payload)
      const { removeMessage } = useAppStore.getState()
      removeMessage(data.roomId, data.messageId)
    } catch {}
  },
  notification: (payload) => {
    try {
      const data = notificationPayloadSchema.parse(payload)
      toast(data.title, {
        description: data.body,
        position: "top-center",
      })
    } catch {}
  },
  room_joined: (payload) => {
    try {
      const { room } = roomJoinedPayloadSchema.parse(payload)
      const { upsertRoom } = useAppStore.getState()
      upsertRoom(room)
      wsClient.joinRoom(room.id)
    } catch {}
  },
  room_updated: (payload) => {
    try {
      const { room } = roomUpdatedPayloadSchema.parse(payload)
      const { upsertRoom } = useAppStore.getState()
      upsertRoom(room)
    } catch {}
  },
  room_deleted: (payload) => {
    try {
      const data = roomDeletedPayloadSchema.parse(payload)
      const { removeRoom, clearMessages, activeRoom, setActiveRoom } = useAppStore.getState()

      clearMessages(data.roomId)
      removeRoom(data.roomId)
      if (activeRoom === data.roomId) {
        setActiveRoom(null)
      }

      toast.info(`Channel ${data.roomName ? `"${data.roomName}" ` : ""}has been deleted`, {
        position: "top-center",
      })
    } catch {}
  },
  room_member_removed: (payload) => {
    try {
      const data = roomMemberRemovedPayloadSchema.parse(payload)
      const { user, removeRoom, clearMessages, activeRoom, setActiveRoom } = useAppStore.getState()

      if (user?.id !== data.removedUserId) {
        return
      }

      clearMessages(data.roomId)
      removeRoom(data.roomId)
      if (activeRoom === data.roomId) {
        setActiveRoom(null)
      }

      toast.error("You have been removed from the channel and can no longer send messages.", {
        position: "top-center",
      })
    } catch {}
  },
  room_join_requested: (payload) => {
    try {
      const data = roomJoinRequestedPayloadSchema.parse(payload)
      const { addJoinRequest } = useAppStore.getState()
      addJoinRequest(data.roomId, data.request)
    } catch {}
  },
}
