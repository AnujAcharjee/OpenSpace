"use client"

import { useEffect } from "react"
import ChatSection from "./chatSection"
import RoomsSection from "./roomsSection"
import { useIsLargeScreen } from "@/hooks/useIsLargeScreen"
import { useHomePage } from "@/hooks/useHomePage"
import { useUserWs } from "@/hooks/useUserWs"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

export default function HomeLayout() {
  const { hasHydrated, fetch, user, isCurrentUser, activeRoom } = useHomePage()
  const isLg = useIsLargeScreen()

  useUserWs(isCurrentUser ? user : null)

  // hydrate
  useEffect(() => {
    if (!hasHydrated) return
    void fetch()
  }, [fetch, hasHydrated])

  if (!hasHydrated) {
    return (
      <div className="flex h-svh w-full items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    )
  }

  const showSidebar = isLg || !activeRoom
  const showChat = isLg || !!activeRoom

  return (
    <div className="relative flex h-svh w-full overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(244,187,68,0.05),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(120,80,200,0.04),transparent_40%),linear-gradient(135deg,#FAF7F2_0%,#FDFBF7_50%,#F5EFE4_100%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(244,187,68,0.03),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(120,80,200,0.03),transparent_45%),linear-gradient(135deg,#0E0E11_0%,#09090B_60%,#0D0D10_100%)] p-2 md:p-3">
      <ResizablePanelGroup className="h-full w-full">
        {showSidebar && (
          <>
            <ResizablePanel
              defaultSize={isLg ? 25 : 100}
              minSize={isLg ? 16 : 100}
            >
              <div className="h-full overflow-hidden">
                <RoomsSection />
              </div>
            </ResizablePanel>
            {isLg && showChat && (
              <ResizableHandle
                withHandle
                className="w-2 bg-transparent hover:bg-primary/20 transition-colors mx-0.5 rounded-full cursor-col-resize"
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
    </div>
  )
}
