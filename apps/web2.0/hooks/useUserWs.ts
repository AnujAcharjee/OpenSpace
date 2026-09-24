"use client"

import { useEffect, useRef } from "react"
import { wsClient } from "@/ws"

function isWsUser(user: any): user is {
  id: string
  username: string
  email: string
} {
  return !!user?.id && !!user?.username && !!user?.email
}

export function useUserWs(user: any) {
  const currentUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isWsUser(user)) {
      if (currentUserIdRef.current) {
        wsClient.close()
        currentUserIdRef.current = null
      }
      return
    }

    if (currentUserIdRef.current !== user.id || !wsClient.isOpen()) {
      currentUserIdRef.current = user.id
      wsClient.connect(user)
    }

    return () => {
      // Intentionally keep connection open across soft navigation within the session
    }
  }, [user?.id, user?.username, user?.email])
}
