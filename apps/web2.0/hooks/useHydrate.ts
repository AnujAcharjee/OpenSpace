"use client"

import useAppStore from "@/stores/app-store"
import axios from "axios"
import { useCallback, useState, useEffect } from "react"
import type { RoomRecord, UserRecord } from "@repo/validation"
import { useShallow } from "zustand/react/shallow"
import { usersApiUrl } from "@/constants/apiUrls"

export const useHydrate = () => {
  const { user, rooms, hasHydrated, hydrateUserState, resetAppState, setHasHydrated } =
    useAppStore(
      useShallow((state) => ({
        user: state.user,
        rooms: state.rooms,
        hasHydrated: state.hasHydrated,
        hydrateUserState: state.hydrateUserState,
        resetAppState: state.resetAppState,
        setHasHydrated: state.setHasHydrated,
      }))
    )

  // Guarantee hydration flag is set when mounted in the browser
  useEffect(() => {
    setHasHydrated(true)
  }, [setHasHydrated])

  const [isLoading, setIsLoading] = useState(!user)

  // Safety fallback timer: ensure loading never hangs indefinitely
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 4000)
    return () => clearTimeout(timer)
  }, [])

  const fetch = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await axios.get(`${usersApiUrl}/hydrate`, {
        withCredentials: true,
        timeout: 6000,
      })

      if (res.data?.data?.user) {
        hydrateUserState({
          user: res.data.data.user as UserRecord,
          rooms: (res.data.data.rooms as RoomRecord[]) ?? [],
        })
      } else {
        resetAppState()
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
        // For network drops or offline dev, preserve local cache!
        console.warn("Hydrate request was not reachable; preserving local offline cache:", error)
      }
    } finally {
      setIsLoading(false)
    }
  }, [hydrateUserState, resetAppState])

  return { hasHydrated: true, isLoading, fetch, user, rooms }
}
