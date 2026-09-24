"use client"

import { useState, useMemo, useEffect, type CSSProperties, type FormEvent, useRef } from "react"
import { useRouter } from "next/navigation"
import { Fragment } from "react/jsx-runtime"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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

type CreateRoomFormInput = Omit<CreateRoomInput, "creatorId" | "isPrivate"> & {
  isPrivate: "true" | "false"
}

const roomBodySchema = createRoomSchema.shape.body

const createRoomFormSchema = z.object({
  name: roomBodySchema.shape.name,
  description: roomBodySchema.shape.description,
  topics: z.array(z.string()).default([]),
  isPrivate: z.enum(["false", "true"]),
})

const toastOptions = {
  position: "top-center" as const,
  style: {
    "--border-radius": "calc(var(--radius) + 4px)",
  } as CSSProperties,
}

export default function RoomsSection() {
  const router = useRouter()
  const { activeRoom, rooms, user, roomUiOptions, setActiveRoom, upsertRoom } = useAppStore(
    useShallow((state) => ({
      activeRoom: state.activeRoom,
      rooms: state.rooms,
      user: state.user,
      roomUiOptions: state.roomUiOptions,
      setActiveRoom: state.setActiveRoom,
      upsertRoom: state.upsertRoom,
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

      // Newest channel/activity at top
      const aTime = Math.max(
        a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0,
        a.createdAt ? new Date(a.createdAt).getTime() : 0
      )
      const bTime = Math.max(
        b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0,
        b.createdAt ? new Date(b.createdAt).getTime() : 0
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
          "Unable to search rooms")
        : "Unable to search rooms"

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
          "Unable to join room")
        : "Unable to join room"

      toast.error(message, toastOptions)
    } finally {
      setJoiningRoomId(null)
    }
  }

  return (
    <div className="h-full w-full p-1.5">
      <Card className="relative flex h-full w-full flex-col border border-border/70 dark:border-border/40 bg-white/95 dark:bg-card/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-md rounded-2xl p-0 overflow-hidden">
        <CardHeader className="shrink-0 relative z-30 flex flex-col gap-3 border-b border-border/60 dark:border-border/50 px-4 py-3 bg-white/80 dark:bg-card/40 backdrop-blur-sm w-full">
          <CardTitle className="flex w-full items-center justify-between gap-2">
            <AppIcon />
            {user ? (
              <DialogSettings />
            ) : (
              <ThemeToggleButton className="h-7 w-7" />
            )}
          </CardTitle>

          <CardDescription className="w-full">
            <div ref={searchContainerRef} className="relative w-full">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!user) return
                  handleSearch(e)
                }}
                className={`flex h-8 items-center gap-2 rounded-full border border-border/60 bg-stone-100/90 dark:bg-muted/60 px-2.5 transition-colors ${
                  !user
                    ? "opacity-60 cursor-not-allowed"
                    : "focus-within:border-primary/50 focus-within:bg-muted/80"
                }`}
              >
                <IconSearch
                  stroke={2}
                  height={14}
                  width={14}
                  className="shrink-0 text-muted-foreground"
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
                  placeholder={user ? "Search channels to join..." : "Channels"}
                  className={`flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground ${
                    !user ? "cursor-not-allowed" : ""
                  }`}
                />
                {searchName && user && (
                  <button
                    type="button"
                    onClick={resetSearch}
                    className="text-muted-foreground hover:text-foreground rounded p-0.5 cursor-pointer"
                  >
                    <IconX size={12} />
                  </button>
                )}
                <Separator orientation="vertical" decorative />
                {user ? (
                  <DialogCreateRoom creatorId={user.id} />
                ) : (
                  <Button
                    type="button"
                    disabled
                    className="flex h-5 w-5 shrink-0 cursor-not-allowed items-center justify-center rounded-full border border-border/40 bg-background text-base leading-none text-muted-foreground/40 opacity-50"
                  >
                    +
                  </Button>
                )}
              </form>

              {/* Floating Dynamic Search Dropdown */}
              {showSearchDropdown && searchName.trim() && (
                <div className="absolute top-full left-0 right-0 mt-2 z-50 flex flex-col rounded-2xl border border-border/80 dark:border-[#d4af37]/40 bg-popover dark:bg-[#18181b] p-2 shadow-[0_20px_50px_rgba(0,0,0,0.45)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-border/40">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {isSearching ? "Searching..." : `Channels (${searchResults.length})`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSearchDropdown(false)}
                      className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <IconX size={12} />
                    </button>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-1 pr-1 select-none scrollbar-thin scrollbar-thumb-muted-foreground/20">
                    {isSearching ? (
                      <div className="space-y-2 p-2">
                        <div className="h-9 animate-pulse rounded-xl bg-muted/70" />
                        <div className="h-9 animate-pulse rounded-xl bg-muted/50" />
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="py-6 text-center text-xs text-muted-foreground">
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
                            className="flex items-center justify-between gap-2.5 rounded-xl p-2 transition-all hover:bg-muted/70 cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <Avatar className="h-8 w-8 shrink-0 border border-border/60">
                                <AvatarImage src={room.avatarUrl ?? undefined} alt={room.name} />
                                <AvatarFallback className="text-xs font-semibold bg-muted">
                                  {room.name[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate text-xs font-semibold text-foreground">
                                    {room.name}
                                  </span>
                                  {room.isPrivate ? (
                                    <IconLock size={12} className="shrink-0 text-muted-foreground" />
                                  ) : (
                                    <IconLockOpen2 size={12} className="shrink-0 text-muted-foreground" />
                                  )}
                                </div>
                                {room.description?.trim() ? (
                                  <div className="truncate text-[11px] text-muted-foreground">
                                    {room.description}
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-muted-foreground/70">
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
                                  className="h-6.5 px-2.5 text-xs font-medium rounded-lg cursor-pointer"
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
                                  className="h-6.5 px-2.5 text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
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

        <CardContent className="relative z-0 min-h-0 flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full w-full min-h-0 flex-1">
            <div className="space-y-1 px-3 py-2 sm:px-4">
              {!user ? (
                <div className="my-10 px-4 flex flex-col items-center justify-center text-center space-y-2 select-none opacity-60">
                  <div className="rounded-full border border-border/50 bg-muted/40 p-3 text-muted-foreground">
                    <IconLock size={20} />
                  </div>
                  <p className="text-xs font-semibold text-foreground/80">Channels Locked</p>
                  <p className="text-[11px] text-muted-foreground max-w-[200px] leading-relaxed">
                    Channels and conversations are disabled. Sign in from the right to access your workspace.
                  </p>
                </div>
              ) : myRooms.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/70 px-3 py-6 text-center text-sm text-muted-foreground">
                  No channels joined yet. Use the search bar above to discover and join public channels!
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
        className={`group relative flex items-center justify-between rounded-xl px-2.5 py-2 transition-all duration-150 cursor-pointer ${
          isActive
            ? "border border-[#d4af37]/80 dark:border-[#f5d061]/70 bg-amber-500/10 dark:bg-muted/70 text-foreground shadow-xs"
            : "border border-transparent bg-transparent hover:bg-stone-100/80 dark:hover:bg-muted/50 text-muted-foreground hover:text-foreground"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Avatar className={`h-8 w-8 shrink-0 border transition-all ${isActive ? "border-[#d4af37]/60" : "border-border/60"}`}>
            <AvatarImage
              src={room.avatarUrl ?? undefined}
              alt={room.name}
            />
            <AvatarFallback className="text-xs font-semibold bg-muted">
              {room.name[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <div className={`truncate text-xs tracking-tight ${unread && !isActive ? "font-bold text-foreground" : isActive ? "font-semibold text-foreground" : "font-medium text-foreground/90"}`}>
                {room.name}
              </div>
              {lastMessageTime && (
                <span className={`shrink-0 text-[10px] ${unread && !isActive ? "font-semibold text-primary" : "text-muted-foreground/70"}`}>
                  {lastMessageTime}
                </span>
              )}
            </div>
            {lastMessageText && (
              <div className={`truncate text-[11px] leading-tight ${unread && !isActive ? "font-medium text-foreground/90" : "text-muted-foreground/80"}`}>
                {lastMessageText}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-2">
          {isSearchMode &&
            (room.isPrivate ? (
              <IconLock size={14} className="text-muted-foreground" />
            ) : (
              <IconLockOpen2 size={14} className="text-muted-foreground" />
            ))}
          {isPinned && <IconPinned size={14} />}
          {isMuted && <IconVolume3 size={14} />}
          {unread && unreadCount > 0 && !isActive && (
            <div className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-[0_0_8px_rgba(244,187,68,0.4)]">
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
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
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
              className="absolute top-10 right-2 z-20 w-40 rounded-xl border border-border/80 bg-popover p-1 shadow-lg backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors hover:bg-muted cursor-pointer"
                onClick={() => {
                  toggleRoomPinned(room.id)
                  setShowOptions(false)
                }}
              >
                {isPinned ? "Unpin channel" : "Pin channel"}
              </button>
              <button
                type="button"
                className="w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors hover:bg-muted cursor-pointer"
                onClick={() => {
                  toggleRoomMuted(room.id)
                  setShowOptions(false)
                }}
              >
                {isMuted ? "Unmute channel" : "Mute channel"}
              </button>
              <button
                type="button"
                className="w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors hover:bg-muted cursor-pointer"
                onClick={() => {
                  toggleRoomUnread(room.id)
                  setShowOptions(false)
                }}
              >
                {unread ? "Mark as read" : "Mark as unread"}
              </button>
              {isMember && (
                <>
                  <div className="my-1 h-px bg-border/50" />
                  <button
                    type="button"
                    className="w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 cursor-pointer"
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
        <DialogContent className="sm:max-w-sm border border-border/60 bg-card/95 backdrop-blur-xl rounded-2xl">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-base font-bold text-foreground">
              Leave {room.name}?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to leave <span className="font-semibold text-foreground">{room.name}</span>? You will no longer receive or send messages in this channel unless you join again.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLeaving}
              onClick={() => setConfirmLeaveOpen(false)}
              className="h-8 px-3 text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isLeaving}
              onClick={() => void handleConfirmLeave()}
              className="h-8 px-3 text-xs font-semibold cursor-pointer shadow-xs"
            >
              {isLeaving ? "Leaving..." : "Leave Channel"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function DialogCreateRoom({ creatorId }: { creatorId: string }) {
  const { setActiveRoom, upsertRoom } = useAppStore(
    useShallow((state) => ({
      setActiveRoom: state.setActiveRoom,
      upsertRoom: state.upsertRoom,
    }))
  )
  const { createRoom: createRoomRequest } = useRooms()
  const [open, setOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const defaultCreateRoomValues: CreateRoomFormInput = {
    name: "",
    description: "",
    topics: [],
    isPrivate: "false",
  }

  const roomFields: FieldConfig<CreateRoomFormInput>[] = [
    {
      name: "name",
      label: "Channel Name",
      placeholder: "my channel",
      autoComplete: "off",
    },
    {
      name: "description",
      label: "Description",
      placeholder: "We all are a big family here",
      autoComplete: "off",
    },
    {
      name: "isPrivate",
      label: "Channel Visibility",
      fieldType: "radio",
      options: [
        { label: "Public", value: "false" },
        { label: "Private", value: "true" },
      ],
    },
  ]

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

  async function createRoom(data: CreateRoomFormInput) {
    try {
      const payload: CreateRoomInput = {
        ...data,
        avatarUrl,
        creatorId,
        isPrivate: data.isPrivate === "true",
      }
      const room = await createRoomRequest(payload)

      upsertRoom(room)
      setActiveRoom(room.id)
      wsClient.joinRoom(room.id)
      setFormKey((currentKey) => currentKey + 1)
      setAvatarUrl(null)
      setOpen(false)
      toast.success("Channel created", toastOptions)
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ??
          error.response?.data?.message ??
          "Something went wrong")
        : "Something went wrong"

      toast.error(message, toastOptions)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val)
        if (!val) {
          setAvatarUrl(null)
        }
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border/80 bg-background text-base leading-none text-muted-foreground transition-colors hover:bg-muted">
              +
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Create Channel</p>
        </TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-2xl">Create New Channel</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center gap-2 pt-1 pb-3">
          <Avatar className="h-16 w-16 border-2 border-primary/30 shadow-md">
            <AvatarImage src={avatarUrl ?? undefined} />
            <AvatarFallback className="bg-muted text-lg font-bold text-muted-foreground">
              <IconPhoto size={28} />
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs rounded-lg cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload Channel Icon
            </Button>
            {avatarUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive cursor-pointer"
                onClick={() => setAvatarUrl(null)}
              >
                <IconTrash size={14} className="mr-1" /> Remove
              </Button>
            )}
          </div>
        </div>

        <AppForm
          key={formKey}
          formId="create-room-form"
          schema={createRoomFormSchema}
          defaultValues={defaultCreateRoomValues}
          fields={roomFields}
          onSubmit={async (data) => {
            await createRoom(data)
          }}
          submitLabel="Create channel"
          pendingLabel="Creating channel..."
        />
      </DialogContent>
    </Dialog>
  )
}

