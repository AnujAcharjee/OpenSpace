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
        // Clear sensitive session state when explicitly unauthenticated
        resetAppState()
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/signin")) {
          const isUserPage =
            window.location.pathname.startsWith("/@") ||
            window.location.pathname.startsWith("/user") ||
            window.location.pathname.startsWith("/profile") ||
            window.location.pathname.startsWith("/settings")
          if (isUserPage) {
            const returnUrl = encodeURIComponent(`${window.location.pathname}${window.location.search}`)
            window.location.href = `/signin?returnUrl=${returnUrl}`
          }
        }
      } else {
        // For network drops or server reboots, preserve offline cache!
        console.warn("Hydrate request was not reachable; preserving local offline cache:", error)
      }
    }
  }, [hydrateUserState, resetAppState])

  return { hasHydrated, fetch, user, rooms }
}
