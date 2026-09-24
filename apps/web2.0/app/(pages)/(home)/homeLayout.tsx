"use client"

import { useEffect } from "react"
import ChatSection from "./chatSection"
import ChannelsSection from "./channels"
import { useIsLargeScreen } from "@/hooks/useIsLargeScreen"
import { useHomePage } from "@/hooks/useHomePage"
import { useUserWs } from "@/hooks/useUserWs"
import useAppStore from "@/stores/app-store"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { ChatOnboarding } from "@/components/ChatOnboarding"

export default function HomeLayout() {
  const { hasHydrated, fetch, user, isCurrentUser, activeRoom } = useHomePage()
  const isLg = useIsLargeScreen()
  const isExploringChannels = useAppStore((s) => s.isExploringChannels)

  useUserWs(isCurrentUser ? user : null)

  // hydrate
  useEffect(() => {
    if (!hasHydrated) return
    void fetch()
  }, [fetch, hasHydrated])

  if (!hasHydrated) {
    return (
      <div className="flex h-svh w-full items-center justify-center bg-paper text-sm text-ink-muted font-display">
        Opening OpenSpace...
      </div>
    )
  }

  const showSidebar = isLg || (!activeRoom && !isExploringChannels)
  const showChat = isLg || !!activeRoom || isExploringChannels

  return (
    <div className="relative flex h-svh w-full overflow-hidden bg-paper bg-[radial-gradient(ellipse_at_top_right,rgba(212,160,61,0.06),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(59,122,119,0.04),transparent_50%)] p-1.5 sm:p-2.5">
      <ResizablePanelGroup className="h-full w-full">
        {showSidebar && (
          <>
            <ResizablePanel
              defaultSize={isLg ? 25 : 100}
              minSize={isLg ? 18 : 100}
            >
              <div className="h-full overflow-hidden">
                <ChannelsSection />
              </div>
            </ResizablePanel>
            {isLg && showChat && (
              <ResizableHandle
                withHandle
                className="w-2 bg-transparent hover:bg-[var(--pencil-teal-soft)] transition-colors mx-0.5 rounded-full cursor-col-resize"
              />
            )}
          </>
        )}
        {showChat && (
          <ResizablePanel
            defaultSize={isLg ? 75 : 100}
            minSize={isLg ? 25 : 100}
          >
            <div className="h-full overflow-hidden">
              <ChatSection room={activeRoom} />
            </div>
          </ResizablePanel>
        )}
      </ResizablePanelGroup>
      <ChatOnboarding user={isCurrentUser ? user : null} />
    </div>
  )
}
