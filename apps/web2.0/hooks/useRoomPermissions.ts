import type { RoomRecord } from "@repo/validation"

export function useRoomPermissions(
  room: RoomRecord | null,
  userId: string | undefined
) {
  const currentRoomMember = room?.members.find((m) => m.userId === userId)
  const isOwner = Boolean(
    userId &&
    (currentRoomMember?.role === "OWNER" || room?.creatorId === userId)
  )
  const isAdmin = Boolean(
    userId && currentRoomMember?.role === "ADMIN"
  )
  const isMember = Boolean(
    userId && currentRoomMember && !isOwner && !isAdmin
  )
  const canManageRoom = isOwner || isAdmin
  return { isOwner, isAdmin, isMember, canManageRoom, currentRoomMember }
}
