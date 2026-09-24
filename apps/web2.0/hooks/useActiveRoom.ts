"use client"

import useAppStore from "@/stores/app-store"

export function useActiveRoom() {
  const activeRoomId = useAppStore((s) => s.activeRoom)
  const rooms = useAppStore((s) => s.rooms)
  return rooms.find((r) => r.id === activeRoomId) ?? null
}
