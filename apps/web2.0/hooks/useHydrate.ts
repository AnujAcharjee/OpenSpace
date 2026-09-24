"use client"

import useAppStore from "@/stores/app-store"
import axios from "axios"
import { useCallback } from "react"
import type { RoomRecord, UserRecord } from "@repo/validation"
import { useShallow } from "zustand/react/shallow"
import { usersApiUrl } from "@/constants/apiUrls"

export const useHydrate = () => {
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
      const res = await axios.get(`${usersApiUrl}/hydrate`, {
        withCredentials: true,
      })

      if (res.data?.data) {
        hydrateUserState({
          user: res.data.data.user as UserRecord,
          rooms: (res.data.data.rooms as RoomRecord[]) ?? [],
        })
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        // Only clear sensitive session state if user is explicitly unauthenticated
        resetAppState()
      } else {
        // For network drops or server reboots, preserve offline cache!
        console.warn("Hydrate request was not reachable; preserving local offline cache:", error)
      }
    }
  }, [hydrateUserState, resetAppState])

  return { hasHydrated, fetch, user, rooms }
}
