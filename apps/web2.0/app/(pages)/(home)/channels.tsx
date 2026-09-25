"use client"

import { useState, useMemo, useEffect, type CSSProperties, type FormEvent, useRef } from "react"
import { useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import AppForm, { type FieldConfig } from "@/components/AppForm"
import {
  IconSearch,
  IconPinned,
  IconVolume3,
  IconDotsVertical,
  IconLock,
  IconLockOpen2,
  IconPhoto,
  IconTrash,
  IconX,
  IconHash,
  IconPlus,
  IconChevronLeft,
  IconAlertCircle,
} from "@tabler/icons-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { z } from "zod"
import { useShallow } from "zustand/react/shallow"
import { type CreateRoomInput, createRoomSchema } from "@repo/validation"
import type { RoomRecord } from "@repo/validation"
import useAppStore from "@/stores/app-store"
import axios from "axios"
import { useRooms } from "@/hooks/useRooms"
import { ThemeToggleButton } from "@/components/theme-toggle"
import { AppIcon } from "@/components/AppIcon"
import { DialogSettings } from "@/components/DialogSettings"
import { wsClient } from "@/ws"
import { PREDEFINED_TOPICS } from "@/components/ExploreChannels"

type CreateRoomFormInput = Omit<CreateRoomInput, "creatorId" | "isPrivate" | "topics"> & {
  isPrivate: "true" | "false"
}

const roomBodySchema = createRoomSchema.shape.body

const createRoomFormSchema = z.object({
  name: roomBodySchema.shape.name,
  description: roomBodySchema.shape.description,
  isPrivate: z.enum(["false", "true"]),
})

const toastOptions = {
  position: "top-center" as const,
}

function safeTimestamp(dateStr?: string | null): number {
  if (!dateStr) return 0
  const t = new Date(dateStr).getTime()
  return Number.isNaN(t) ? 0 : t
}

export default function ChannelsSection() {
  const router = useRouter()
  const {
    activeRoom,
    rooms,
    user,
    roomUiOptions,
    setActiveRoom,
    upsertRoom,
    isExploringChannels,
    setIsExploringChannels,
  } = useAppStore(
    useShallow((state) => ({
      activeRoom: state.activeRoom,
      rooms: state.rooms,
      user: state.user,
      roomUiOptions: state.roomUiOptions,
      setActiveRoom: state.setActiveRoom,
      upsertRoom: state.upsertRoom,
      isExploringChannels: state.isExploringChannels,
      setIsExploringChannels: state.setIsExploringChannels,
    }))
  )
  const {
    searchRooms: searchRoomsRequest,
    requestJoinRoom: requestJoinRoomRequest,
  } = useRooms()
  const [searchName, setSearchName] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [searchResults, setSearchResults] = useState<RoomRecord[]>([])
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null)
  const [pendingJoinRoomIds, setPendingJoinRoomIds] = useState<
    Record<string, true>
  >({})
  const searchContainerRef = useRef<HTMLDivElement>(null)

  const myRooms = useMemo(() => {
    const list = !user
      ? rooms
      : rooms.filter((room) =>
          room.members.some((member) => member.userId === user.id)
        )

    return [...list].sort((a, b) => {
      const aOptions = roomUiOptions[a.id]
      const bOptions = roomUiOptions[b.id]
      const aPinned = Boolean(aOptions?.pinned)
      const bPinned = Boolean(bOptions?.pinned)

      // Pinned channels on top
      if (aPinned !== bPinned) {
        return aPinned ? -1 : 1
      }

      // If both are pinned, newest pinned at top
      if (aPinned && bPinned) {
        const aPinnedAt = aOptions?.pinnedAt ?? 0
        const bPinnedAt = bOptions?.pinnedAt ?? 0
        if (aPinnedAt !== bPinnedAt) {
          return bPinnedAt - aPinnedAt
        }
      }

      // Newest channel/activity at top (guarded with safeTimestamp to avoid NaN bugs)
      const aTime = Math.max(
        safeTimestamp(a.lastMessage?.createdAt),
        safeTimestamp(a.createdAt)
      )
      const bTime = Math.max(
        safeTimestamp(b.lastMessage?.createdAt),
        safeTimestamp(b.createdAt)
      )
      return bTime - aTime
    })
  }, [rooms, user, roomUiOptions])

  // Debounced auto-search as user types
  useEffect(() => {
    const term = searchName.trim()
    if (!term) {
      setSearchResults([])
      setShowSearchDropdown(false)
      setIsSearching(false)
      return
    }

    setShowSearchDropdown(true)
    setIsSearching(true)

    const timer = setTimeout(async () => {
      try {
        const results = await searchRoomsRequest(term)
        setSearchResults(results)
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [searchName, searchRoomsRequest])

  // Click outside and escape handler
  useEffect(() => {
    if (!showSearchDropdown) return

    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSearchDropdown(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowSearchDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [showSearchDropdown])

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = searchName.trim()
    if (!name) return

    setIsSearching(true)
    setShowSearchDropdown(true)

    try {
      const results = await searchRoomsRequest(name)
      setSearchResults(results)
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ??
          error.response?.data?.message ??
          "Unable to search channels")
        : "Unable to search channels"

      toast.error(message, toastOptions)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  function handleRoomSelect(room: RoomRecord) {
    upsertRoom(room)
    setActiveRoom(room.id)
    useAppStore.getState().clearRoomUnread(room.id)
  }

  function resetSearch() {
    setSearchName("")
    setSearchResults([])
    setShowSearchDropdown(false)
  }

  async function handleJoinRoom(room: RoomRecord) {
    if (!user) {
      toast.info("Please sign in to join channels", toastOptions)
      router.push("/signin")
      return
    }

    if (joiningRoomId) {
      return
    }

    setJoiningRoomId(room.id)

    try {
      const result = await requestJoinRoomRequest(room.id, user.id)

      if (result.joined && result.room) {
        upsertRoom(result.room)
      }

      if (result.joined && result.room) {
        setActiveRoom(result.room.id)
        useAppStore.getState().clearRoomUnread(result.room.id)
        toast.success(`Joined ${room.name}`, toastOptions)
      } else if (result.pending) {
        setPendingJoinRoomIds((current) => ({
          ...current,
          [room.id]: true,
        }))
        toast.success("Join request sent", toastOptions)
      }
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ??
          error.response?.data?.message ??
          "Unable to join channel")
        : "Unable to join channel"

      toast.error(message, toastOptions)
    } finally {
      setJoiningRoomId(null)
    }
  }

  return (
    <div className="h-full w-full p-1 sm:p-1.5">
      <Card className="relative flex h-full w-full flex-col border border-[#d4a03d]/40 dark:border-line bg-paper shadow-sm rounded-[var(--radius-sketch-md)] p-0 overflow-hidden">
        {/* Letterhead Header */}
        <CardHeader className="shrink-0 relative z-30 flex flex-col gap-3 border-b border-line px-4 py-3 bg-paper-subtle/80 backdrop-blur-xs w-full">
          <CardTitle className="flex w-full items-center justify-between gap-2">
            <AppIcon size="sm" />
            {user ? (
              <DialogSettings />
            ) : (
              <ThemeToggleButton className="h-7 w-7 text-ink-muted hover:text-ink" />
            )}
          </CardTitle>

          <CardDescription className="w-full">
            <div ref={searchContainerRef} className="relative w-full space-y-2">
              {/* Full width search bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!user) return
                  handleSearch(e)
                }}
                style={{ backgroundColor: "var(--paper)" }}
                className={`flex h-8 w-full items-center gap-2 rounded-[var(--radius-sketch-sm)] border border-line px-2.5 transition-all ${
                  !user
                    ? "opacity-60 cursor-not-allowed"
                    : "focus-within:border-[var(--pencil-teal)] focus-within:ring-2 focus-within:ring-[var(--pencil-teal-soft)]"
                }`}
              >
                <IconSearch
                  stroke={2}
                  height={14}
                  width={14}
                  className="shrink-0 text-ink-muted"
                />
                <input
                  disabled={!user}
                  value={searchName}
                  onChange={(event) => setSearchName(event.target.value)}
                  onFocus={() => {
                    if (searchName.trim() && user) {
                      setShowSearchDropdown(true)
                    }
                  }}
                  placeholder={user ? "Search channels..." : "Channels"}
                  className={`flex-1 min-w-0 bg-transparent text-xs text-ink outline-none placeholder:text-ink-subtle ${
                    !user ? "cursor-not-allowed" : ""
                  }`}
                />
                {searchName && user && (
                  <button
                    type="button"
                    onClick={resetSearch}
                    className="text-ink-muted hover:text-ink rounded p-0.5 cursor-pointer"
                  >
                    <IconX size={12} />
                  </button>
                )}
              </form>

              {/* 2 Thin Action Buttons: Explore (Green) & Create (Blue) */}
              <div className="flex items-center gap-1.5 w-full">
                {/* Explore Channels Button (Green) */}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setActiveRoom(null)
                    setIsExploringChannels(true)
                  }}
                  className={`h-[22px] py-0 flex-1 px-2 text-[11px] font-medium rounded-[var(--radius-sketch-sm)] border transition-all cursor-pointer ${
                    isExploringChannels && !activeRoom
                      ? "bg-[var(--pencil-green-soft)] border-[var(--pencil-green)] text-[var(--pencil-green)] shadow-2xs font-semibold"
                      : "border-[var(--pencil-green)]/40 bg-paper hover:bg-[var(--pencil-green-soft)] text-[var(--pencil-green)] hover:border-[var(--pencil-green)]"
                  }`}
                >
                  <span className="truncate">Explore</span>
                </Button>

                {/* Create Channel Button (Blue) */}
                {user ? (
                  <DialogCreateRoom
                    creatorId={user.id}
                    trigger={
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-[22px] py-0 flex-1 px-2 text-[11px] font-medium rounded-[var(--radius-sketch-sm)] border border-[var(--pencil-blue)]/40 bg-paper hover:bg-[var(--pencil-blue-soft)] text-[var(--pencil-blue)] hover:border-[var(--pencil-blue)] transition-all cursor-pointer"
                      >
                        <span className="truncate">Create</span>
                      </Button>
                    }
                  />
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled
                    className="h-[22px] py-0 flex-1 px-2 text-[11px] font-medium rounded-[var(--radius-sketch-sm)] border border-line bg-paper-subtle text-ink-muted opacity-50 cursor-not-allowed"
                  >
                    <span className="truncate">Create</span>
                  </Button>
                )}
              </div>

              {/* Floating Dynamic Search Dropdown */}
              {showSearchDropdown && searchName.trim() && (
                <div
                  style={{ backgroundColor: "var(--paper)" }}
                  className="absolute top-full left-0 right-0 mt-2 z-50 flex flex-col rounded-[var(--radius-sketch-md)] border-2 border-line-strong shadow-2xl p-2.5 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="flex items-center justify-between px-2 py-1.5 mb-1.5 border-b border-line">
                    <span className="font-display text-[10px] font-semibold text-ink-muted uppercase tracking-wider">
                      {isSearching ? "Searching..." : `Channels (${searchResults.length})`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSearchDropdown(false)}
                      className="rounded p-0.5 text-ink-muted hover:bg-surface-hover hover:text-ink transition-colors cursor-pointer"
                    >
                      <IconX size={12} />
                    </button>
                  </div>

                  {/* Search Results List Container matching theme bg */}
                  <div
                    style={{ backgroundColor: "var(--paper)" }}
                    className="max-h-72 overflow-y-auto space-y-1.5 p-1 rounded-[var(--radius-sketch-sm)] border border-line select-none scrollbar-thin"
                  >
                    {isSearching ? (
                      <div className="space-y-2 p-2">
                        <div
                          style={{ backgroundColor: "var(--paper-subtle)" }}
                          className="h-9 animate-pulse rounded-[var(--radius-sketch-sm)]"
                        />
                        <div
                          style={{ backgroundColor: "var(--paper-subtle)" }}
                          className="h-9 animate-pulse rounded-[var(--radius-sketch-sm)] opacity-70"
                        />
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div
                        style={{ backgroundColor: "var(--paper)" }}
                        className="py-6 text-center text-xs text-ink-muted"
                      >
                        No channels found with &quot;{searchName}&quot;
                      </div>
                    ) : (
                      searchResults.map((room) => {
                        const isMember = user
                          ? room.members.some((m) => m.userId === user.id)
                          : false
                        const isJoining = joiningRoomId === room.id
                        const hasPending = Boolean(pendingJoinRoomIds[room.id])

                        return (
                          <div
                            key={room.id}
                            onClick={() => {
                              if (isMember) {
                                handleRoomSelect(room)
                                setShowSearchDropdown(false)
                              }
                            }}
                            style={{ backgroundColor: "var(--paper-subtle)" }}
                            className="flex items-center justify-between gap-2.5 rounded-[var(--radius-sketch-sm)] p-2 hover:brightness-95 dark:hover:brightness-110 border border-line shadow-2xs transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarImage src={room.avatarUrl ?? undefined} alt={room.name} />
                                <AvatarFallback className="text-xs font-semibold">
                                  {room.name[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate text-xs font-semibold text-ink">
                                    {room.name}
                                  </span>
                                  {room.isPrivate ? (
                                    <IconLock size={12} className="shrink-0 text-ink-muted" />
                                  ) : (
                                    <IconLockOpen2 size={12} className="shrink-0 text-ink-muted" />
                                  )}
                                </div>
                                {room.description?.trim() ? (
                                  <div className="truncate text-[11px] text-ink-muted">
                                    {room.description}
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-ink-subtle">
                                    {room.members.length} {room.members.length === 1 ? "member" : "members"}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="shrink-0">
                              {isMember ? (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  className="h-6.5 px-2.5 text-xs font-medium rounded-[var(--radius-sketch-sm)] cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRoomSelect(room)
                                    setShowSearchDropdown(false)
                                  }}
                                >
                                  Open
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={isJoining || hasPending}
                                  className="h-6.5 px-2.5 text-xs font-semibold rounded-[var(--radius-sketch-sm)] shadow-2xs cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    void handleJoinRoom(room)
                                  }}
                                >
                                  {isJoining ? "Joining..." : hasPending ? "Pending" : room.isPrivate ? "Request" : "Join"}
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardDescription>
        </CardHeader>

        {/* Channel List Area */}
        <CardContent className="relative z-0 min-h-0 flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full w-full min-h-0 flex-1">
            <div className="space-y-1 px-2.5 py-2 sm:px-3">
              {!user ? (
                <div className="my-10 px-4 flex flex-col items-center justify-center text-center space-y-2 select-none opacity-70">
                  <div className="rounded-[var(--radius-sketch-sm)] border border-line bg-paper-subtle p-3 text-ink-muted">
                    <IconLock size={20} />
                  </div>
                  <p className="font-display text-xs font-semibold text-ink">Channels Locked</p>
                  <p className="text-[11px] text-ink-muted max-w-[200px] leading-relaxed">
                    Sign in to join channels and view active conversations.
                  </p>
                </div>
              ) : myRooms.length === 0 ? (
                <div className="rounded-[var(--radius-sketch-sm)] border border-dashed border-line-strong px-3 py-6 text-center text-xs text-ink-muted">
                  No channels joined yet. Use the search bar above to discover public channels!
                </div>
              ) : (
                myRooms.map((room) => (
                  <ListItems
                    key={room.id}
                    room={room}
                    isActive={activeRoom === room.id}
                    onSelect={handleRoomSelect}
                    currentUserId={user?.id ?? null}
                    isSearchMode={false}
                    onJoinRoom={handleJoinRoom}
                    isJoining={joiningRoomId === room.id}
                    hasPendingRequest={Boolean(pendingJoinRoomIds[room.id])}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

function formatRoomTime(value?: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function ListItems({
  room,
  isActive,
  onSelect,
  currentUserId,
  isSearchMode,
  onJoinRoom,
  isJoining,
  hasPendingRequest,
}: {
  room: RoomRecord
  isActive: boolean
  onSelect: (room: RoomRecord) => void
  currentUserId: string | null
  isSearchMode: boolean
  onJoinRoom: (room: RoomRecord) => Promise<void>
  isJoining: boolean
  hasPendingRequest: boolean
}) {
  const isMember = currentUserId
    ? room.members.some((member) => member.userId === currentUserId)
    : false
  const isPinned = useAppStore(
    (state) => state.roomUiOptions[room.id]?.pinned ?? false
  )
  const isMuted = useAppStore(
    (state) => state.roomUiOptions[room.id]?.muted ?? false
  )
  const unread = useAppStore(
    (state) => state.roomUiOptions[room.id]?.unread ?? false
  )
  const unreadCount = useAppStore(
    (state) => state.roomUiOptions[room.id]?.unreadCount ?? (unread ? 1 : 0)
  )
  const toggleRoomPinned = useAppStore((state) => state.toggleRoomPinned)
  const toggleRoomMuted = useAppStore((state) => state.toggleRoomMuted)
  const toggleRoomUnread = useAppStore((state) => state.toggleRoomUnread)
  const { leaveRoom: leaveRoomRequest } = useRooms()
  const removeRoom = useAppStore((state) => state.removeRoom)
  const clearMessages = useAppStore((state) => state.clearMessages)
  const setActiveRoom = useAppStore((state) => state.setActiveRoom)
  const [showOptions, setShowOptions] = useState(false)
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  const currentMember = room.members.find((m) => m.userId === currentUserId)
  const isCurrentAdmin =
    currentMember?.role === "ADMIN" ||
    currentMember?.role === "OWNER" ||
    room.creatorId === currentUserId
  const otherMembers = room.members.filter((m) => m.userId !== currentUserId)
  const otherAdmins = otherMembers.filter(
    (m) => m.role === "ADMIN" || m.role === "OWNER"
  )
  const isLastAdmin = isCurrentAdmin && otherMembers.length > 0 && otherAdmins.length === 0

  const lastMessageText = room.lastMessage
    ? room.lastMessage.text?.trim() || "Attachment"
    : ""
  const lastMessageTime = room.lastMessage?.createdAt
    ? formatRoomTime(room.lastMessage.createdAt)
    : ""

  async function handleConfirmLeave() {
    if (isLeaving) return
    setIsLeaving(true)

    try {
      await leaveRoomRequest(room.id, currentUserId ?? undefined)
      wsClient.leaveRoom(room.id)
      clearMessages(room.id)
      removeRoom(room.id)
      if (isActive) {
        setActiveRoom(null)
      }
      setConfirmLeaveOpen(false)
      toast.success(`Left ${room.name}`, toastOptions)
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ??
          error.response?.data?.message ??
          "Unable to leave channel")
        : "Unable to leave channel"
      toast.error(message, toastOptions)
    } finally {
      setIsLeaving(false)
    }
  }

  return (
    <>
      <div
        onClick={() => {
          if (!isSearchMode || isMember) {
            onSelect(room)
          }
        }}
        className={`group relative flex items-center justify-between rounded-[var(--radius-sketch-sm)] px-2.5 py-2 transition-all duration-150 cursor-pointer ${
          isActive
            ? "border border-[var(--pencil-teal)] bg-[var(--pencil-teal-soft)] text-ink shadow-2xs font-medium"
            : "border border-transparent bg-transparent hover:bg-surface-hover text-ink-muted hover:text-ink"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Avatar className={`h-8 w-8 shrink-0 border transition-all ${isActive ? "border-[var(--pencil-teal)]" : "border-line"}`}>
            <AvatarImage
              src={room.avatarUrl ?? undefined}
              alt={room.name}
            />
            <AvatarFallback className="text-xs font-semibold">
              {room.name[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <div className={`truncate text-xs tracking-tight ${unread && !isActive ? "font-bold text-ink" : isActive ? "font-semibold text-ink" : "font-medium text-ink/90"}`}>
                <span className="text-ink-subtle mr-0.5">#</span>
                {room.name}
              </div>
              {lastMessageTime && (
                <span className={`shrink-0 text-[10px] ${unread && !isActive ? "font-semibold text-[var(--pencil-green)]" : "text-ink-subtle"}`}>
                  {lastMessageTime}
                </span>
              )}
            </div>
            {lastMessageText && (
              <div className={`truncate text-[11px] leading-tight ${unread && !isActive ? "font-medium text-ink" : "text-ink-muted"}`}>
                {lastMessageText}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-2">
          {isSearchMode &&
            (room.isPrivate ? (
              <IconLock size={14} className="text-ink-muted" />
            ) : (
              <IconLockOpen2 size={14} className="text-ink-muted" />
            ))}
          {isPinned && <IconPinned size={14} className="text-[var(--pencil-yellow)]" />}
          {isMuted && <IconVolume3 size={14} className="text-ink-subtle" />}
          {unread && unreadCount > 0 && !isActive && (
            <div className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[var(--pencil-green)] px-1.5 text-[10px] font-bold text-white shadow-2xs">
              {unreadCount > 99 ? "99+" : unreadCount}
            </div>
          )}

          {isSearchMode && !isMember ? (
            <Button
              type="button"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={isJoining || hasPendingRequest}
              onClick={(event) => {
                event.stopPropagation()
                void onJoinRoom(room)
              }}
            >
              {isJoining
                ? "Please wait..."
                : hasPendingRequest
                  ? "Requested"
                  : room.isPrivate
                    ? "Request join"
                    : "Join"}
            </Button>
          ) : (
            <button
              type="button"
              className="rounded-[4px] p-1 text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink cursor-pointer"
              aria-label="Channel options"
              onClick={(event) => {
                event.stopPropagation()
                setShowOptions((current) => !current)
              }}
            >
              <IconDotsVertical size={16} />
            </button>
          )}
        </div>

        {showOptions && !isSearchMode && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-10 cursor-default bg-transparent"
              aria-label="Close room options"
              onClick={(event) => {
                event.stopPropagation()
                setShowOptions(false)
              }}
            />

            <div
              className="absolute top-10 right-2 z-20 w-40 rounded-[var(--radius-sketch-sm)] border border-line bg-paper p-1 shadow-lg animate-in fade-in zoom-in-95 duration-100"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="w-full rounded-[6px] px-2 py-1.5 text-left text-xs font-medium text-ink transition-colors hover:bg-surface-hover cursor-pointer"
                onClick={() => {
                  toggleRoomPinned(room.id)
                  setShowOptions(false)
                }}
              >
                {isPinned ? "Unpin channel" : "Pin channel"}
              </button>
              <button
                type="button"
                className="w-full rounded-[6px] px-2 py-1.5 text-left text-xs font-medium text-ink transition-colors hover:bg-surface-hover cursor-pointer"
                onClick={() => {
                  toggleRoomMuted(room.id)
                  setShowOptions(false)
                }}
              >
                {isMuted ? "Unmute channel" : "Mute channel"}
              </button>
              <button
                type="button"
                className="w-full rounded-[6px] px-2 py-1.5 text-left text-xs font-medium text-ink transition-colors hover:bg-surface-hover cursor-pointer"
                onClick={() => {
                  toggleRoomUnread(room.id)
                  setShowOptions(false)
                }}
              >
                {unread ? "Mark as read" : "Mark as unread"}
              </button>
              {isMember && (
                <>
                  <div className="my-1 h-px bg-line" />
                  <button
                    type="button"
                    className="w-full rounded-[6px] px-2 py-1.5 text-left text-xs font-medium text-[var(--pencil-coral)] transition-colors hover:bg-[var(--pencil-coral-soft)] cursor-pointer"
                    onClick={() => {
                      setShowOptions(false)
                      setConfirmLeaveOpen(true)
                    }}
                  >
                    Leave channel
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Confirmation Modal to Leave Room */}
      <Dialog open={confirmLeaveOpen} onOpenChange={setConfirmLeaveOpen}>
        <DialogContent className="sm:max-w-sm border border-line bg-paper rounded-[var(--radius-sketch-md)]">
          <DialogHeader className="space-y-2">
            <DialogTitle className="font-display text-base font-bold text-ink">
              Leave #{room.name}?
            </DialogTitle>
            {isLastAdmin ? (
              <div className="rounded-[var(--radius-sketch-sm)] border border-[var(--pencil-coral)]/40 bg-[var(--pencil-coral-soft)]/30 p-2.5 text-xs text-[var(--pencil-coral)] leading-relaxed">
                You are the only admin in this channel. You cannot leave without assigning another admin first or deleting the channel.
              </div>
            ) : (
              <div className="text-xs text-ink-muted leading-relaxed">
                Are you sure you want to leave <span className="font-semibold text-ink">#{room.name}</span>? You will no longer receive or send messages here unless you join again.
              </div>
            )}
          </DialogHeader>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLeaving}
              onClick={() => setConfirmLeaveOpen(false)}
              className="h-8 px-3 text-xs cursor-pointer rounded-[var(--radius-sketch-sm)]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isLeaving || isLastAdmin}
              onClick={() => void handleConfirmLeave()}
              className="h-8 px-3 text-xs font-semibold cursor-pointer shadow-2xs rounded-[var(--radius-sketch-sm)]"
            >
              {isLeaving ? "Leaving..." : "Leave Channel"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function DialogCreateRoom({
  creatorId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
  defaultTopic,
}: {
  creatorId: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  defaultTopic?: string
}) {
  const { setActiveRoom, upsertRoom, setIsExploringChannels } = useAppStore(
    useShallow((state) => ({
      setActiveRoom: state.setActiveRoom,
      upsertRoom: state.upsertRoom,
      setIsExploringChannels: state.setIsExploringChannels,
    }))
  )
  const { createRoom: createRoomRequest } = useRooms()
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = (val: boolean) => {
    if (isControlled) {
      controlledOnOpenChange?.(val)
    } else {
      setInternalOpen(val)
    }
  }

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)
  const [selectedTopics, setSelectedTopics] = useState<string[]>(
    defaultTopic ? [defaultTopic.toLowerCase()] : []
  )
  const [topicInput, setTopicInput] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<1 | 2>(1)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (defaultTopic && !selectedTopics.includes(defaultTopic.toLowerCase())) {
      setSelectedTopics((prev) => [...prev, defaultTopic.toLowerCase()])
    }
  }, [defaultTopic])

  const resetForm = () => {
    setStep(1)
    setName("")
    setDescription("")
    setIsPrivate(false)
    setSelectedTopics(defaultTopic ? [defaultTopic.toLowerCase()] : [])
    setTopicInput("")
    setAvatarUrl(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleAddTopic = (topicToAdd?: string) => {
    const raw = (topicToAdd ?? topicInput).trim().replace(/^#+/, "").toLowerCase()
    if (!raw) return
    if (!selectedTopics.includes(raw)) {
      setSelectedTopics((prev) => [...prev, raw])
    }
    if (!topicToAdd) {
      setTopicInput("")
    }
    if (error) setError(null)
  }

  const handleRemoveTopic = (topicToRemove: string) => {
    setSelectedTopics((prev) => prev.filter((t) => t !== topicToRemove))
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2MB", toastOptions)
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setAvatarUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!name.trim()) {
      setError("Channel name is required")
      setStep(1)
      return
    }
    if (selectedTopics.length === 0) {
      setError("At least one topic is required")
      setStep(2)
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const payload: CreateRoomInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        isPrivate,
        topics: selectedTopics,
        avatarUrl,
        creatorId,
      }

      const room = await createRoomRequest(payload)

      upsertRoom(room)
      setActiveRoom(room.id)
      setIsExploringChannels(false)
      wsClient.joinRoom(room.id)
      resetForm()
      setOpen(false)
      toast.success(`Channel #${room.name} created!`, toastOptions)
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.error ??
          err.response?.data?.message ??
          "Something went wrong")
        : "Something went wrong"

      setError(message)
      toast.error(message, toastOptions)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val)
        if (!val) {
          resetForm()
        }
      }}
    >
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : null}

      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden rounded-[var(--radius-sketch-md)]">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-line shrink-0 pr-12">
          <DialogTitle className="font-display text-xl font-semibold">
            Create New Channel
          </DialogTitle>
          <DialogDescription className="sr-only">
            Create a new channel
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-thin">
          {step === 1 ? (
            <>
              {/* Avatar Upload */}
              <div className="flex flex-col items-center justify-center gap-1.5 pb-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative cursor-pointer rounded-full outline-none focus:ring-2 focus:ring-[var(--pencil-blue)] transition-all"
                  title="Click to choose channel image"
                >
                  <Avatar className="h-16 w-16 border-2 border-line group-hover:border-[var(--pencil-blue)] shadow-sm transition-colors">
                    <AvatarImage src={avatarUrl ?? undefined} />
                    <AvatarFallback className="bg-paper-dark text-lg font-bold text-ink-muted group-hover:text-ink transition-colors">
                      <IconPhoto size={28} />
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity">
                    <IconPhoto size={22} className="text-white drop-shadow" />
                  </div>
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    className="text-[11px] text-[var(--pencil-coral)] hover:underline cursor-pointer transition-colors"
                    onClick={() => {
                      setAvatarUrl(null)
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ""
                      }
                    }}
                  >
                    Remove image
                  </button>
                )}
              </div>

              {/* Channel Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink font-display">
                  Channel Name <span className="text-[var(--pencil-coral)]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (error) setError(null)
                  }}
                  placeholder="e.g. architects-lounge"
                  className="h-9 w-full rounded-[var(--radius-sketch-sm)] border border-line bg-paper px-3 text-xs text-ink placeholder:text-ink-subtle outline-none focus:border-[var(--pencil-blue)] focus:ring-2 focus:ring-[var(--pencil-blue-soft)] transition-all"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink font-display">
                  Description <span className="text-[11px] text-ink-muted font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this channel about?"
                  className="h-9 w-full rounded-[var(--radius-sketch-sm)] border border-line bg-paper px-3 text-xs text-ink placeholder:text-ink-subtle outline-none focus:border-[var(--pencil-blue)] focus:ring-2 focus:ring-[var(--pencil-blue-soft)] transition-all"
                />
              </div>

              {/* Visibility */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink font-display">
                  Channel Visibility
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-medium text-ink cursor-pointer">
                    <input
                      type="radio"
                      name="create-visibility"
                      checked={!isPrivate}
                      onChange={() => setIsPrivate(false)}
                      className="accent-[var(--pencil-blue)] cursor-pointer"
                    />
                    Public
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-ink cursor-pointer">
                    <input
                      type="radio"
                      name="create-visibility"
                      checked={isPrivate}
                      onChange={() => setIsPrivate(true)}
                      className="accent-[var(--pencil-blue)] cursor-pointer"
                    />
                    Private
                  </label>
                </div>
              </div>

              {error && (
                <p className="text-xs text-[var(--pencil-coral)] font-medium">
                  {error}
                </p>
              )}

              {/* Next Button */}
              <div className="pt-2">
                <Button
                  type="button"
                  onClick={() => {
                    if (!name.trim()) {
                      setError("Channel name is required")
                      return
                    }
                    setError(null)
                    setStep(2)
                  }}
                  disabled={!name.trim()}
                  className="w-full h-9 rounded-[var(--radius-sketch-sm)] bg-[var(--pencil-blue)] hover:bg-[var(--pencil-blue)]/90 text-white font-semibold text-xs shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  Next
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Step 2: Topics Selection */}
              <div className="space-y-3">
                {/* Selected Topics List */}
                {selectedTopics.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-ink-subtle block">
                      Selected topics ({selectedTopics.length})
                    </span>
                    <div className="flex flex-wrap gap-1 p-2 rounded-[var(--radius-sketch-sm)] border border-line/60 bg-paper max-h-24 overflow-y-auto scrollbar-ultra-thin">
                      {selectedTopics.map((topic) => (
                        <span
                          key={topic}
                          className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-[var(--radius-sketch-sm)] text-[11px] font-semibold bg-[var(--pencil-blue)] text-white shadow-2xs"
                        >
                          <span>{topic}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTopic(topic)}
                            className="rounded-full p-0.5 hover:bg-black/20 text-white/90 hover:text-white cursor-pointer transition-colors"
                            title={`Remove ${topic}`}
                          >
                            <IconX size={12} stroke={2.5} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Min 1 required message beside Add topic label in brackets */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-ink-subtle font-medium">Add topic</span>
                    <span
                      className={
                        selectedTopics.length === 0
                          ? "text-[var(--pencil-coral)] font-medium"
                          : "text-ink-subtle"
                      }
                    >
                      (min 1 required)
                    </span>
                  </div>

                  {/* Add Custom Topic Input + Button */}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={topicInput}
                      onChange={(e) => setTopicInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleAddTopic()
                        }
                      }}
                      placeholder="Add a topic (e.g. dev, design)..."
                      className="h-8 flex-1 px-3 rounded-[var(--radius-sketch-sm)] border border-line bg-paper text-xs text-ink placeholder:text-ink-subtle outline-none focus:border-[var(--pencil-blue)] focus:ring-1 focus:ring-[var(--pencil-blue-soft)] transition-all"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddTopic()}
                      disabled={!topicInput.trim()}
                      className="h-8 px-3 text-xs font-medium border-line text-ink hover:border-[var(--pencil-blue)] hover:text-[var(--pencil-blue)] rounded-[var(--radius-sketch-sm)] cursor-pointer disabled:opacity-40 shrink-0"
                    >
                      Add
                    </Button>
                  </div>
                </div>

                {/* Topics List (no Suggested topics message, no + and no # signs) */}
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-2 rounded-[var(--radius-sketch-sm)] border border-line/50 bg-paper/60 scrollbar-ultra-thin">
                  {PREDEFINED_TOPICS.map((topic) => {
                    const normalized = topic.toLowerCase()
                    const isAdded = selectedTopics.includes(normalized)
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => {
                          if (isAdded) {
                            handleRemoveTopic(normalized)
                          } else {
                            handleAddTopic(normalized)
                          }
                        }}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-sketch-sm)] text-[10px] font-medium transition-all cursor-pointer ${
                          isAdded
                            ? "bg-[var(--pencil-blue)] text-white shadow-2xs font-semibold"
                            : "bg-paper border border-line text-ink-muted hover:text-ink hover:border-line-strong"
                        }`}
                      >
                        <span>{topic}</span>
                        {isAdded && <span className="text-[9px]">✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {error && (
                <p className="text-xs text-[var(--pencil-coral)] font-medium">
                  {error}
                </p>
              )}

              {/* Submit Buttons */}
              <div className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 h-9 rounded-[var(--radius-sketch-sm)] border-line text-xs font-semibold cursor-pointer"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || selectedTopics.length === 0 || !name.trim()}
                  className="flex-1 h-9 rounded-[var(--radius-sketch-sm)] bg-[var(--pencil-blue)] hover:bg-[var(--pencil-blue)]/90 text-white font-semibold text-xs shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create"}
                </Button>
              </div>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
