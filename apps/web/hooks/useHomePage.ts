"use client"

import { useParams } from "next/navigation"
import useAppStore from "@/stores/app-store"
import { useHydrate } from "@/hooks/useHydrate"

export function useHomePage() {
  const params = useParams<{ userid?: string; username?: string }>()
  const rawParam = params?.username ?? params?.userid ?? ""
  const cleanUsername = rawParam ? decodeURIComponent(rawParam).replace(/^@+/, "") : ""

  const { hasHydrated, fetch, user, rooms } = useHydrate()

  const activeRoomId = useAppStore((s) => s.activeRoom)
  const isCurrentUser = Boolean(
    user &&
      (!cleanUsername ||
        user.username.toLowerCase() === cleanUsername.toLowerCase() ||
        user.id === cleanUsername)
  )

  const storeRooms = useAppStore((s) => s.rooms)
  const activeRoom =
    rooms.find((r) => r.id === activeRoomId) ??
    storeRooms.find((r) => r.id === activeRoomId) ??
    null

  return {
    userid: user?.id,
    username: cleanUsername,
    hasHydrated,
    fetch,
    user,
    isCurrentUser,
    activeRoom,
  }
}
