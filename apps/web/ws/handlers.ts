import {
  chatMessagePayloadSchema,
  notificationPayloadSchema,
  roomMemberRemovedPayloadSchema,
} from "@repo/validation"
import useAppStore from "@/stores/app-store"

export const handlers: Record<string, (payload: unknown) => void> = {
  chat_message: (payload) => {
    try {
      const message = chatMessagePayloadSchema.parse(payload)
      const { addMessage, updateRoomLastMessage } = useAppStore.getState()
      addMessage(message.roomId, message)
      updateRoomLastMessage(message.roomId, message)
    } catch {}
  },
  notification: (payload) => {
    try {
      notificationPayloadSchema.parse(payload)
    } catch {}
  },
  room_member_removed: (payload) => {
    try {
      const data = roomMemberRemovedPayloadSchema.parse(payload)
      const { user, removeRoom, clearMessages } = useAppStore.getState()

      if (user?.id !== data.removedUserId) {
        return
      }

      clearMessages(data.roomId)
      removeRoom(data.roomId)
    } catch {}
  },
}
