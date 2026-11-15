"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import ChatSection from "./chatSection"
import ChannelsSection from "./channels"
import { useIsLargeScreen } from "@/hooks/useIsLargeScreen"
import { useHomePage } from "@/hooks/useHomePage"
import { useUserWs } from "@/hooks/useUserWs"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { ChatOnboarding } from "@/components/ChatOnboarding"
import { AppIcon } from "@/components/AppIcon"
import { IconLoader2 } from "@tabler/icons-react"

export default function HomeLayout() {
  const router = useRouter()
  const { hasHydrated, isLoading, fetch, user, isCurrentUser, activeRoom } = useHomePage()
  const isLg = useIsLargeScreen()

  useUserWs(isCurrentUser ? user : null)

  // Fetch / revalidate session on mount
  useEffect(() => {
    void fetch()
  }, [fetch])

  // Redirect to signin if user is not authenticated once initial loading is done
  useEffect(() => {
    if (!isLoading && !user) {
      const returnUrl = typeof window !== "undefined"
        ? encodeURIComponent(`${window.location.pathname}${window.location.search}`)
        : ""
      router.replace(`/signin${returnUrl ? `?returnUrl=${returnUrl}` : ""}`)
    }
  }, [isLoading, user, router])

  // If no user is cached and still loading/fetching, show the opening screen
  if (!user) {
    return (
      <div className="relative flex h-svh w-full flex-col items-center justify-center overflow-hidden bg-paper text-ink">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,160,61,0.08)_0%,transparent_65%)]" />
        <div className="relative flex flex-col items-center gap-4">
          <div className="animate-pulse">
            <AppIcon size="lg" />
          </div>
          <div className="flex items-center gap-2.5 font-display text-sm font-semibold tracking-tight text-ink-muted">
            <IconLoader2 className="size-4 animate-spin text-[var(--pencil-teal)]" />
            <span>{isLoading ? "Opening OpenSpace..." : "Redirecting to sign in..."}</span>
          </div>
        </div>
      </div>
    )
  }

  // Mobile first: show sidebar if large screen OR no chat is currently selected
  const showSidebar = isLg || !activeRoom
  // Show chat if large screen OR a chat is active
  const showChat = isLg || !!activeRoom

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
