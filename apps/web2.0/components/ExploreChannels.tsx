"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import {
  IconSearch,
  IconFilter,
  IconHash,
  IconLock,
  IconLockOpen2,
  IconUsers,
  IconCheck,
  IconX,
  IconLoader2,
  IconArrowLeft,
  IconCalendar,
  IconMessageCircle,
} from "@tabler/icons-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import type { RoomRecord } from "@repo/validation"
import useAppStore from "@/stores/app-store"
import { useRooms } from "@/hooks/useRooms"
import { wsClient } from "@/ws"
import { useShallow } from "zustand/react/shallow"

export const PREDEFINED_TOPICS = [
  "technology",
  "ai",
  "programming",
  "startups",
  "gaming",
  "football",
  "cricket",
  "basketball",
  "f1",
  "sports",
  "music",
  "movies",
  "tv-shows",
  "anime",
  "memes",
  "news",
  "world-news",
  "science",
  "business",
  "politics",
  "finance",
  "education",
  "career",
  "fitness",
  "food",
  "travel",
  "fashion",
  "books",
  "photography",
  "cars",
  "general",
  "random",
  "debate",
  "advice",
  "off-topic",
] as const

const FILTER_TOPICS = ["All", ...PREDEFINED_TOPICS] as const

const toastOptions = {
  position: "top-center" as const,
}

// Topic-specific pencil accent color helper
function getTopicColor(topic: string): {
  bg: string
  text: string
  border: string
} {
  const lower = topic.toLowerCase()
  if (
    lower.includes("tech") ||
    lower.includes("dev") ||
    lower.includes("program") ||
    lower.includes("ai") ||
    lower.includes("car")
  ) {
    return {
      bg: "bg-[var(--pencil-blue-soft)]",
      text: "text-[var(--pencil-blue)]",
      border: "border-[var(--pencil-blue)]/30",
    }
  }
  if (
    lower.includes("design") ||
    lower.includes("art") ||
    lower.includes("fashion") ||
    lower.includes("photo") ||
    lower.includes("book")
  ) {
    return {
      bg: "bg-[var(--pencil-coral-soft)]",
      text: "text-[var(--pencil-coral)]",
      border: "border-[var(--pencil-coral)]/30",
    }
  }
  if (
    lower.includes("gam") ||
    lower.includes("music") ||
    lower.includes("movie") ||
    lower.includes("anime") ||
    lower.includes("meme") ||
    lower.includes("tv") ||
    lower.includes("random") ||
    lower.includes("off-topic")
  ) {
    return {
      bg: "bg-[var(--pencil-yellow-soft)]",
      text: "text-[var(--pencil-yellow)]",
      border: "border-[var(--pencil-yellow)]/30",
    }
  }
  if (
    lower.includes("sport") ||
    lower.includes("foot") ||
    lower.includes("cricket") ||
    lower.includes("basket") ||
    lower.includes("f1") ||
    lower.includes("fit") ||
    lower.includes("food") ||
    lower.includes("travel")
  ) {
    return {
      bg: "bg-[var(--pencil-green-soft)]",
      text: "text-[var(--pencil-green)]",
      border: "border-[var(--pencil-green)]/30",
    }
  }
  if (
    lower.includes("science") ||
    lower.includes("crypto") ||
    lower.includes("biz") ||
    lower.includes("business") ||
    lower.includes("finance") ||
    lower.includes("startup") ||
    lower.includes("politic") ||
    lower.includes("news") ||
    lower.includes("world") ||
    lower.includes("career") ||
    lower.includes("debate")
  ) {
    return {
      bg: "bg-[var(--pencil-orange-soft)]",
      text: "text-[var(--pencil-orange)]",
      border: "border-[var(--pencil-orange)]/30",
    }
  }
  return {
    bg: "bg-[var(--pencil-teal-soft)]",
    text: "text-[var(--pencil-teal)]",
    border: "border-[var(--pencil-teal)]/30",
  }
}

export function ExploreChannels({
  onOpenCreateChannel,
  onClose,
}: {
  onOpenCreateChannel?: (defaultTopic?: string) => void
  onClose?: () => void
}) {
  const { user, rooms, setActiveRoom, upsertRoom, setIsExploringChannels } = useAppStore(
    useShallow((state) => ({
      user: state.user,
      rooms: state.rooms,
      setActiveRoom: state.setActiveRoom,
      upsertRoom: state.upsertRoom,
      setIsExploringChannels: state.setIsExploringChannels,
    }))
  )

  const { searchRooms, requestJoinRoom } = useRooms()

  const [channels, setChannels] = useState<RoomRecord[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState<string>("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null)
  const [pendingJoinRoomIds, setPendingJoinRoomIds] = useState<Record<string, boolean>>({})
  const [showMobileDetail, setShowMobileDetail] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [filterSearch, setFilterSearch] = useState("")
  const filterRef = useRef<HTMLDivElement>(null)

  // Close filter dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false)
      }
    }
    if (isFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isFilterOpen])

  const filteredTopics = useMemo(() => {
    if (!filterSearch.trim()) return FILTER_TOPICS
    const q = filterSearch.trim().toLowerCase()
    return FILTER_TOPICS.filter((t) => t.toLowerCase().includes(q))
  }, [filterSearch])

  // Fetch channels in paginated chunks
  const fetchPage = useCallback(
    async (pageToFetch: number, isInitial = false) => {
      if (isInitial) {
        setIsLoading(true)
      } else {
        setIsLoadingMore(true)
      }

      try {
        const queryTopic = selectedTopic === "All" ? undefined : selectedTopic
        const queryName = searchQuery.trim() || undefined
        const results = await searchRooms({
          name: queryName,
          topic: queryTopic,
          page: pageToFetch,
          limit: 10,
        })

        setHasMore(Boolean(results.hasMore))
        setPage(pageToFetch)

        if (isInitial) {
          setChannels(results)
          if (results.length > 0) {
            setSelectedChannelId((prev) =>
              results.some((r) => r.id === prev) ? prev : results[0]?.id ?? null
            )
          } else {
            setSelectedChannelId(null)
          }
        } else {
          setChannels((prev) => {
            const existingIds = new Set(prev.map((c) => c.id))
            const newRooms = results.filter((c) => !existingIds.has(c.id))
            return [...prev, ...newRooms]
          })
        }
      } catch {
        toast.error("Failed to load channels", toastOptions)
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [searchRooms, selectedTopic, searchQuery]
  )

  // Trigger initial / reset page 1 load when topic or search query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchPage(1, true)
    }, 200)
    return () => clearTimeout(timer)
  }, [fetchPage])

  // Load next chunk
  const loadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore) return
    void fetchPage(page + 1, false)
  }, [fetchPage, isLoading, isLoadingMore, hasMore, page])

  // Infinite scroll listener on the LHS channel list
  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollHeight - scrollTop - clientHeight < 50 && hasMore && !isLoadingMore && !isLoading) {
      void loadMore()
    }
  }

  // Active channel selected for the RHS detail pane
  const activeChannel = useMemo(() => {
    if (!channels.length) return null
    if (selectedChannelId) {
      const found = channels.find((c) => c.id === selectedChannelId)
      if (found) return found
    }
    return channels[0] ?? null
  }, [channels, selectedChannelId])

  // Handle joining or opening a channel
  const handleAction = async (channel: RoomRecord) => {
    const isMember = user ? channel.members.some((m) => m.userId === user.id) : false

    if (isMember) {
      setActiveRoom(channel.id)
      setIsExploringChannels(false)
      return
    }

    if (!user) {
      toast.error("Please sign in to join channels", toastOptions)
      return
    }

    if (pendingJoinRoomIds[channel.id]) {
      toast.info("Join request already pending approval", toastOptions)
      return
    }

    setJoiningRoomId(channel.id)
    try {
      const result = await requestJoinRoom(channel.id, user.id)

      if (result.joined && result.room) {
        upsertRoom(result.room)
        setActiveRoom(result.room.id)
        setIsExploringChannels(false)
        wsClient.joinRoom(result.room.id)
        toast.success(`Joined #${result.room.name}`, toastOptions)
      } else if (result.pending) {
        setPendingJoinRoomIds((prev) => ({ ...prev, [channel.id]: true }))
        toast.info("Join request sent to channel admins", toastOptions)
      } else {
        void fetchPage(1, true)
      }
    } catch {
      toast.error("Unable to join channel", toastOptions)
    } finally {
      setJoiningRoomId(null)
    }
  }

  const isCurrentMember = user && activeChannel
    ? activeChannel.members.some((m) => m.userId === user.id)
    : false
  const isCurrentPending = activeChannel ? Boolean(pendingJoinRoomIds[activeChannel.id]) : false
  const isCurrentJoining = activeChannel ? joiningRoomId === activeChannel.id : false

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-paper text-ink p-1 sm:p-1.5">
      <Card className="flex h-full w-full flex-col gap-0 border border-[#d4a03d]/40 dark:border-line bg-paper shadow-sm rounded-[var(--radius-sketch-md)] p-0 overflow-hidden">
        {/* Top Stationery Header (No channel count numbers) */}
        <div className="shrink-0 flex items-center justify-between border-b border-line bg-paper-subtle/80 px-3.5 py-2.5 backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-sm sm:text-base font-bold tracking-tight text-ink leading-none">
              Explore Channels
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {onOpenCreateChannel && (
              <Button
                size="sm"
                onClick={() => onOpenCreateChannel(selectedTopic !== "All" ? selectedTopic : undefined)}
                className="h-[24px] rounded-[var(--radius-sketch-sm)] bg-[var(--pencil-blue)] hover:bg-[var(--pencil-blue)]/90 text-white text-[11px] font-semibold px-2.5 shadow-2xs cursor-pointer"
              >
                <span>Create</span>
              </Button>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sketch-sm)] border border-line text-ink-muted hover:text-ink hover:bg-surface-hover transition-colors cursor-pointer"
                title="Close Explore"
              >
                <IconX size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Master-Detail Split Pane: LHS List + RHS Details */}
        <div className="flex flex-1 min-h-0 w-full overflow-hidden">
          {/* ─── LHS: Channels List (Avatar, Name, Tags) ─── */}
          <div
            className={`${
              showMobileDetail ? "hidden md:flex" : "flex"
            } w-full md:w-[320px] lg:w-[350px] shrink-0 flex-col border-r border-line bg-paper overflow-hidden`}
          >
            {/* Search Box with Topic Filter */}
            <div className="p-2.5 border-b border-line bg-paper-subtle/50 relative">
              <div className="relative flex items-center" ref={filterRef}>
                <IconSearch
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
                />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search channels..."
                  className={`h-7.5 w-full rounded-[var(--radius-sketch-sm)] border border-line bg-paper pl-7 ${
                    selectedTopic !== "All"
                      ? searchQuery
                        ? "pr-28"
                        : "pr-24"
                      : searchQuery
                        ? "pr-14"
                        : "pr-8"
                  } text-xs text-ink placeholder:text-ink-subtle outline-none focus:border-[var(--pencil-green)] focus:ring-1 focus:ring-[var(--pencil-green-soft)] transition-all`}
                />

                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="text-ink-muted hover:text-ink rounded p-0.5"
                      title="Clear search"
                    >
                      <IconX size={12} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsFilterOpen((prev) => !prev)
                      setFilterSearch("")
                    }}
                    className={`flex items-center gap-1 h-5.5 px-1.5 rounded-[var(--radius-sketch-sm)] border transition-all cursor-pointer ${
                      selectedTopic !== "All"
                        ? "bg-[var(--pencil-green)] text-white border-[var(--pencil-green)] shadow-2xs font-semibold"
                        : isFilterOpen
                        ? "bg-paper-dark border-line-strong text-ink"
                        : "bg-paper text-ink-muted border-line hover:border-line-strong hover:text-ink"
                    }`}
                    title={selectedTopic !== "All" ? `Filtered by #${selectedTopic} (click to change)` : "Filter by topic"}
                  >
                    <IconFilter size={11} />
                    {selectedTopic !== "All" && (
                      <span className="text-[10px] max-w-[65px] truncate leading-none">
                        {selectedTopic}
                      </span>
                    )}
                  </button>
                </div>

                {/* Topics Dropdown */}
                {isFilterOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 rounded-[var(--radius-sketch-md)] border border-line bg-paper shadow-lg z-50 overflow-hidden flex flex-col">
                    {/* Filter header with search & reset */}
                    <div className="p-2 border-b border-line bg-paper-subtle space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-ink font-display">
                          Filter by Topic
                        </span>
                        {selectedTopic !== "All" && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTopic("All")
                              setIsFilterOpen(false)
                            }}
                            className="text-[10px] text-[var(--pencil-coral)] hover:underline font-medium cursor-pointer"
                          >
                            Reset filter
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={filterSearch}
                        onChange={(e) => setFilterSearch(e.target.value)}
                        placeholder="Search topics..."
                        className="h-6.5 w-full rounded-[var(--radius-sketch-sm)] border border-line bg-paper px-2 text-[11px] text-ink placeholder:text-ink-subtle outline-none focus:border-[var(--pencil-green)] transition-all"
                        autoFocus
                      />
                    </div>

                    {/* Topics List */}
                    <div className="max-h-56 overflow-y-auto p-1 scrollbar-ultra-thin space-y-0.5">
                      {filteredTopics.map((topic) => {
                        const isSelected = selectedTopic === topic
                        return (
                          <button
                            key={topic}
                            type="button"
                            onClick={() => {
                              setSelectedTopic(topic)
                              setIsFilterOpen(false)
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1 rounded-[var(--radius-sketch-sm)] text-xs text-left transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-[var(--pencil-green-soft)] text-[var(--pencil-green)] font-semibold"
                                : "text-ink hover:bg-paper-subtle"
                            }`}
                          >
                            <span className="truncate">
                              {topic === "All" ? "All Channels" : `#${topic}`}
                            </span>
                            {isSelected && <IconCheck size={12} className="shrink-0 ml-1.5" />}
                          </button>
                        )
                      })}
                      {filteredTopics.length === 0 && (
                        <div className="py-3 text-center text-[11px] text-ink-subtle">
                          No matching topics
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Channels Scrollable List with Infinite / Chunk Loading */}
            <div
              onScroll={handleListScroll}
              className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin"
            >
              {isLoading ? (
                <div className="flex h-48 flex-col items-center justify-center gap-2 text-ink-muted">
                  <IconLoader2 size={20} className="animate-spin text-[var(--pencil-green)]" />
                  <span className="text-xs font-display">Loading channels...</span>
                </div>
              ) : channels.length === 0 ? (
                <div className="py-12 px-3 text-center space-y-2">
                  <IconHash size={24} className="mx-auto text-ink-subtle opacity-60" />
                  <p className="text-xs text-ink-muted font-display">No channels found</p>
                  <p className="text-[11px] text-ink-subtle">Try choosing another topic or clearing search.</p>
                </div>
              ) : (
                <>
                  {channels.map((channel) => {
                    const isSelected = activeChannel?.id === channel.id
                    const channelTopics =
                      channel.topics && channel.topics.length > 0 ? channel.topics : ["general"]
                    const isMember = user ? channel.members.some((m) => m.userId === user.id) : false

                    return (
                      <div
                        key={channel.id}
                        onClick={() => {
                          setSelectedChannelId(channel.id)
                          setShowMobileDetail(true)
                        }}
                        className={`group flex items-start gap-2.5 rounded-[var(--radius-sketch-sm)] p-2.5 transition-all duration-150 cursor-pointer border ${
                          isSelected
                            ? "border-[var(--pencil-teal)] bg-surface-hover shadow-2xs"
                            : "border-line/70 bg-paper hover:bg-paper-subtle hover:border-line"
                        }`}
                      >
                        {/* Avatar (avi) */}
                        <Avatar className="h-9 w-9 shrink-0 border border-line rounded-[var(--radius-sketch-sm)]">
                          <AvatarImage src={channel.avatarUrl ?? undefined} alt={channel.name} />
                          <AvatarFallback className="font-display font-bold text-xs bg-paper text-ink">
                            {channel.name[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        {/* Name & Tags */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="font-display text-xs font-bold text-ink truncate group-hover:text-[var(--pencil-teal)] transition-colors">
                                #{channel.name}
                              </span>
                              {channel.isPrivate ? (
                                <IconLock size={11} className="shrink-0 text-ink-muted" />
                              ) : (
                                <IconLockOpen2 size={11} className="shrink-0 text-ink-muted" />
                              )}
                            </div>
                            {isMember && (
                              <span className="shrink-0 rounded px-1 py-0.2 text-[9px] font-semibold bg-[var(--pencil-teal-soft)] text-[var(--pencil-teal)] border border-[var(--pencil-teal)]/30">
                                Joined
                              </span>
                            )}
                          </div>

                          {/* Topic Tags */}
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            {channelTopics.slice(0, 3).map((topic) => {
                              const style = getTopicColor(topic)
                              return (
                                <span
                                  key={topic}
                                  className={`inline-flex items-center rounded-[var(--radius-sketch-sm)] px-1.5 py-0.2 text-[9px] font-medium border ${style.bg} ${style.text} ${style.border}`}
                                >
                                  #{topic}
                                </span>
                              )
                            })}
                            {channelTopics.length > 3 && (
                              <span className="text-[9px] text-ink-subtle">
                                +{channelTopics.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* Loading more indicator / Load more button */}
                  {isLoadingMore && (
                    <div className="py-2.5 flex items-center justify-center gap-1.5 text-xs text-ink-muted">
                      <IconLoader2 size={14} className="animate-spin text-[var(--pencil-green)]" />
                      <span className="text-[11px] font-medium">Loading more channels...</span>
                    </div>
                  )}

                  {hasMore && !isLoadingMore && (
                    <div className="py-2 text-center">
                      <button
                        type="button"
                        onClick={loadMore}
                        className="text-[11px] font-semibold text-[var(--pencil-teal)] hover:underline cursor-pointer py-1 px-3 rounded-[var(--radius-sketch-sm)] border border-line bg-paper-subtle hover:bg-paper transition-colors"
                      >
                        Load more channels
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ─── RHS: Channel Details & Preview ─── */}
          <div
            className={`${
              showMobileDetail ? "flex" : "hidden md:flex"
            } flex-1 flex-col overflow-y-auto bg-paper-subtle/30 p-4 sm:p-6 scrollbar-thin`}
          >
            {/* Mobile Back Button */}
            <div className="md:hidden mb-3">
              <button
                type="button"
                onClick={() => setShowMobileDetail(false)}
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--pencil-teal)] hover:underline cursor-pointer"
              >
                <IconArrowLeft size={14} /> Back to channels list
              </button>
            </div>

            {activeChannel ? (
              <div className="max-w-2xl mx-auto w-full space-y-4 animate-in fade-in duration-150">
                {/* Main Channel Card */}
                <div className="rounded-[var(--radius-sketch-md)] border border-line bg-paper p-5 sm:p-6 shadow-xs space-y-5">
                  {/* Channel Header Banner */}
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 border-2 border-line rounded-[var(--radius-sketch-md)] shadow-sm">
                      <AvatarImage src={activeChannel.avatarUrl ?? undefined} alt={activeChannel.name} />
                      <AvatarFallback className="font-display font-bold text-2xl bg-paper-subtle text-ink">
                        {activeChannel.name[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-ink">
                          #{activeChannel.name}
                        </h1>
                        <span className="inline-flex items-center gap-1 rounded-[var(--radius-sketch-sm)] px-2 py-0.5 text-[11px] font-medium border border-line bg-paper-subtle text-ink-muted">
                          {activeChannel.isPrivate ? (
                            <>
                              <IconLock size={12} /> Private Channel
                            </>
                          ) : (
                            <>
                              <IconLockOpen2 size={12} /> Public Channel
                            </>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-ink-muted pt-0.5">
                        <span className="flex items-center gap-1">
                          <IconUsers size={14} className="text-ink-subtle" />
                          <strong className="text-ink">{activeChannel.members.length}</strong>{" "}
                          {activeChannel.members.length === 1 ? "member" : "members"}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <IconCalendar size={14} className="text-ink-subtle" />
                          Created {new Date(activeChannel.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                        </span>
                      </div>

                      {/* Topic Tags Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-2">
                        {(activeChannel.topics && activeChannel.topics.length > 0
                          ? activeChannel.topics
                          : ["general"]
                        ).map((topic) => {
                          const style = getTopicColor(topic)
                          return (
                            <span
                              key={topic}
                              className={`inline-flex items-center rounded-[var(--radius-sketch-sm)] px-2 py-0.5 text-[11px] font-semibold border ${style.bg} ${style.text} ${style.border}`}
                            >
                              #{topic}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Channel Description */}
                  <div className="pt-2 border-t border-line space-y-2">
                    <h3 className="font-display text-xs font-semibold text-ink-muted uppercase tracking-wider">
                      About Channel
                    </h3>
                    <p className="text-xs sm:text-sm text-ink leading-relaxed whitespace-pre-wrap bg-paper-subtle/50 p-3 rounded-[var(--radius-sketch-sm)] border border-line/60">
                      {activeChannel.description?.trim() ||
                        "A creative channel for discussions, collaboration, and sharing ideas on OpenSpace."}
                    </p>
                  </div>

                  {/* Members Preview */}
                  <div className="pt-2 border-t border-line space-y-2.5">
                    <h3 className="font-display text-xs font-semibold text-ink-muted uppercase tracking-wider flex items-center justify-between">
                      <span>Members ({activeChannel.members.length})</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {activeChannel.members.slice(0, 10).map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-1.5 rounded-[var(--radius-sketch-sm)] border border-line bg-paper-subtle px-2 py-1 text-xs text-ink"
                        >
                          <Avatar className="h-5 w-5 border border-line">
                            <AvatarImage src={m.user?.avatarUrl ?? undefined} />
                            <AvatarFallback className="text-[9px] font-bold">
                              {m.user?.username?.[0]?.toUpperCase() ?? "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate max-w-[90px] font-medium text-[11px]">
                            {m.user?.name || m.user?.username || "Member"}
                          </span>
                          {m.role === "OWNER" && (
                            <span className="text-[9px] text-[var(--pencil-yellow)] font-bold">★</span>
                          )}
                        </div>
                      ))}
                      {activeChannel.members.length > 10 && (
                        <div className="flex items-center rounded-[var(--radius-sketch-sm)] border border-line bg-paper-subtle px-2 py-1 text-[11px] text-ink-muted">
                          +{activeChannel.members.length - 10} more
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Primary Action Button */}
                  <div className="pt-3 border-t border-line flex items-center justify-between gap-3">
                    <div className="text-xs text-ink-muted">
                      {isCurrentMember
                        ? "You are a member of this channel."
                        : activeChannel.isPrivate
                        ? "Admin approval is required to join this channel."
                        : "This is a public channel open for everyone."}
                    </div>

                    <div>
                      {isCurrentMember ? (
                        <Button
                          size="sm"
                          onClick={() => handleAction(activeChannel)}
                          className="h-9 px-5 rounded-[var(--radius-sketch-sm)] bg-[var(--pencil-teal)] hover:bg-[var(--pencil-teal)]/90 text-white font-semibold text-xs shadow-2xs cursor-pointer gap-1.5"
                        >
                          <IconMessageCircle size={15} />
                          <span>Open Channel</span>
                        </Button>
                      ) : isCurrentPending ? (
                        <Button
                          size="sm"
                          disabled
                          className="h-9 px-4 rounded-[var(--radius-sketch-sm)] border border-line bg-paper text-ink-muted opacity-80 text-xs"
                        >
                          <IconCheck size={14} className="mr-1 text-[var(--pencil-green)]" />
                          Request Pending
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={isCurrentJoining}
                          onClick={() => handleAction(activeChannel)}
                          className={`h-9 px-5 rounded-[var(--radius-sketch-sm)] font-semibold text-xs transition-all shadow-2xs cursor-pointer gap-1.5 ${
                            activeChannel.isPrivate
                              ? "bg-[var(--pencil-yellow-soft)] hover:bg-[var(--pencil-yellow-soft)]/80 text-ink border border-[var(--pencil-yellow)]/50"
                              : "bg-[var(--pencil-green)] hover:bg-[var(--pencil-green)]/90 text-white"
                          }`}
                        >
                          {isCurrentJoining ? (
                            <IconLoader2 size={14} className="animate-spin" />
                          ) : (
                            <IconCheck size={14} />
                          )}
                          <span>
                            {activeChannel.isPrivate ? "Request to Join" : "Join Channel"}
                          </span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-sketch-md)] bg-[var(--pencil-teal-soft)] text-[var(--pencil-teal)] border border-[var(--pencil-teal)]/30">
                  <IconHash size={24} />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h3 className="font-display text-base font-bold text-ink">
                    Select a channel to preview
                  </h3>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    Choose a channel from the list on the left to see its members, description, and join.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
