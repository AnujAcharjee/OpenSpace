"use client"

import useAppStore from "@/stores/app-store"
import axios from "axios"
import { useCallback } from "react"
import type { RoomRecord, UserRecord } from "@repo/validation"
import { useShallow } from "zustand/react/shallow"
import { usersApiUrl } from "@/constants/apiUrls"
import { useRouter } from "next/navigation"

export const useHydrate = (userid: string) => {
  const router = useRouter()
  const { user, rooms, hasHydrated, hydrateUserState, resetAppState } =
    useAppStore(
      useShallow((state) => ({
        user: state.user,
        rooms: state.rooms,
        hasHydrated: state.hasHydrated,
        hydrateUserState: state.hydrateUserState,
        resetAppState: state.resetAppState,
      }))
    )

  const fetch = useCallback(async () => {
    try {
      // const currentUserId = useAppStore.getState().user?.id

      // if (currentUserId && currentUserId !== userid) {
      //   resetAppState()
      // }

      const res = await axios.get(`${usersApiUrl}/hydrate`, {
        withCredentials: true,
      })
      hydrateUserState({
        user: res.data.data.user as UserRecord,
        rooms: res.data.data.rooms as RoomRecord[],
      })
    } catch (error) {
      resetAppState()
      console.warn("User is not authenticated or hydrate failed:", error)
    }
  }, [hydrateUserState, resetAppState])

  return { hasHydrated, fetch, user, rooms }
}
