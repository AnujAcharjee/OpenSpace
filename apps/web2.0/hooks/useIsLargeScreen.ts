"use client"

import { useSyncExternalStore } from "react"

const query = "(min-width: 1024px)"

export function useIsLargeScreen() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query)
      mq.addEventListener("change", cb)
      return () => mq.removeEventListener("change", cb)
    },
    () => window.matchMedia(query).matches,
    () => false
  )
}
