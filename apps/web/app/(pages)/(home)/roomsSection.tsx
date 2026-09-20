"use client"

import { useState, type CSSProperties, type FormEvent, useRef } from "react"
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
  AvatarBadge,
} from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
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

type CreateRoomFormInput = Omit<CreateRoomInput, "creatorId" | "isPrivate"> & {
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
  style: {
    "--border-radius": "calc(var(--radius) + 4px)",
  } as CSSProperties,
}

export default function RoomsSection() {
  const { activeRoom, rooms, user, setActiveRoom, upsertRoom } = useAppStore(
    useShallow((state) => ({
      activeRoom: state.activeRoom,
      rooms: state.rooms,
      user: state.user,
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
  const [hasSearched, setHasSearched] = useState(false)
  const [searchResults, setSearchResults] = useState<RoomRecord[]>([])
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null)
  const [pendingJoinRoomIds, setPendingJoinRoomIds] = useState<
    Record<string, true>
  >({})

  if (!user) {
    return null
  }

  const isSearchMode = hasSearched
  const displayedRooms = isSearchMode ? searchResults : rooms

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = searchName.trim()

    if (!name || isSearching) {
      return
    }

    setIsSearching(true)
    setHasSearched(true)

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
    setHasSearched(false)
    setSearchResults([])
  }

  async function handleJoinRoom(room: RoomRecord) {
    if (!user || joiningRoomId) {
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
      <Card className="flex h-full w-full flex-col border border-border/40 bg-card/50 shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-md rounded-2xl p-0 overflow-hidden">
        <CardHeader className="flex flex-col gap-3 border-b border-border/50 px-4 py-3 bg-card/40 backdrop-blur-sm w-full">
          <CardTitle className="flex w-full items-center justify-between gap-4">
            <AppIcon />
            <DialogSettings />
          </CardTitle>

          <CardDescription className="w-full">
            <form
              onSubmit={handleSearch}
              className="flex h-8 items-center gap-2 rounded-full border border-border/40 bg-muted/60 px-2.5"
            >
              <IconSearch
                stroke={2}
                height={14}
                width={14}
                className="shrink-0 text-muted-foreground"
              />
              <input
                value={searchName}
                onChange={(event) => setSearchName(event.target.value)}
                placeholder="Search rooms by name"
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              {isSearchMode && (
                <button
                  type="button"
                  onClick={resetSearch}
                  className="rounded-md px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  My rooms
                </button>
              )}
              <button
                type="submit"
                disabled={isSearching || !searchName.trim()}
                className="relative cursor-pointer rounded-md bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground shadow-[0_0_10px_rgba(244,187,68,0.35)] transition-all duration-200 hover:shadow-[0_0_14px_rgba(244,187,68,0.6)] hover:brightness-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none dark:shadow-[0_0_12px_rgba(244,187,68,0.4)] dark:hover:shadow-[0_0_16px_rgba(244,187,68,0.7)]"
              >
                {isSearching ? "..." : "Go"}
              </button>
              <Separator orientation="vertical" decorative />
              <DialogCreateRoom creatorId={user.id} />
            </form>
          </CardDescription>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 p-0">
          <ScrollArea className="h-full">
            <div className="space-y-1 px-3 py-2 sm:px-4">
              {isSearchMode && (
                <div className="pb-2 text-xs text-muted-foreground">
                  Search results for &quot;{searchName.trim()}&quot;
                </div>
              )}

              {isSearching && (
                <div className="space-y-2 rounded-lg border border-border/50 bg-card/40 p-3">
                  <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-10 animate-pulse rounded bg-muted/80" />
                  <div className="h-10 animate-pulse rounded bg-muted/70" />
                </div>
              )}

              {!isSearching && displayedRooms.length === 0 && (
                <div className="rounded-lg border border-dashed border-border/70 px-3 py-6 text-center text-sm text-muted-foreground">
                  {isSearchMode
                    ? "No rooms found with that name."
                    : "No rooms available."}
                </div>
              )}

              {!isSearching &&
                displayedRooms.map((room) => (
                  <ListItems
                    key={room.id}
                    room={room}
                    isActive={activeRoom === room.id}
                    onSelect={handleRoomSelect}
                    currentUserId={user.id}
                    isSearchMode={isSearchMode}
                    onJoinRoom={handleJoinRoom}
                    isJoining={joiningRoomId === room.id}
                    hasPendingRequest={Boolean(pendingJoinRoomIds[room.id])}
                  />
                ))}
            </div>
          </ScrollArea>
        </CardContent>

        {/* <CardFooter className="flex items-center justify-between gap-2 bg-primary/80 px-4 py-2 text-primary-foreground">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar className="h-7 w-7 border border-border">
              <AvatarImage
                src={user.avatarUrl ? user.avatarUrl : undefined}
                alt={user.username}
              />
              <AvatarFallback>{user.username[0]}</AvatarFallback>
              <AvatarBadge className="right-0.5 bottom-0.5 h-2.5 w-2.5 border-[1.5px] border-background bg-green-500" />
            </Avatar>
            <span className="truncate text-sm">{user.username}</span>
          </div>
          <ThemeToggleButton className="text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground" />
        </CardFooter> */}
      </Card>
    </div>
  )
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
  currentUserId: string
  isSearchMode: boolean
  onJoinRoom: (room: RoomRecord) => Promise<void>
  isJoining: boolean
  hasPendingRequest: boolean
}) {
  const isMember = room.members.some(
    (member) => member.userId === currentUserId
  )
  const isPinned = useAppStore(
    (state) => state.roomUiOptions[room.id]?.pinned ?? false
  )
  const isMuted = useAppStore(
    (state) => state.roomUiOptions[room.id]?.muted ?? false
  )
  const unread = useAppStore(
    (state) => state.roomUiOptions[room.id]?.unread ?? false
  )
  const toggleRoomPinned = useAppStore((state) => state.toggleRoomPinned)
  const toggleRoomMuted = useAppStore((state) => state.toggleRoomMuted)
  const toggleRoomUnread = useAppStore((state) => state.toggleRoomUnread)
  const [showOptions, setShowOptions] = useState(false)

  return (
    <div
      onClick={() => {
        if (!isSearchMode || isMember) {
          onSelect(room)
        }
      }}
      className={`group relative flex items-center justify-between rounded-xl px-2.5 py-2 transition-all duration-150 cursor-pointer bg-card/40 hover:bg-muted/60 ${
        isActive
          ? "border border-[#d4af37]/70 dark:border-[#f5d061]/70 text-foreground"
          : "border border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar className={`h-8 w-8 shrink-0 border transition-all ${isActive ? "border-[#d4af37]/60" : "border-border/60"}`}>
          <AvatarImage
            src={room.creator?.avatarUrl ?? undefined}
            alt={room.name}
          />
          <AvatarFallback className="text-xs font-semibold bg-muted">
            {room.name[0]?.toUpperCase()}
          </AvatarFallback>
          {isActive && (
            <AvatarBadge className="right-0 bottom-0 h-2 w-2 border-[1.5px] border-background bg-emerald-500" />
          )}
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className={`truncate text-xs tracking-tight ${isActive ? "font-semibold text-foreground" : "font-medium text-foreground/90"}`}>
            {room.name}
          </div>
          {room.description && (
            <div className="truncate text-[10px] text-muted-foreground/80">
              {room.description}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isSearchMode &&
          (room.isPrivate ? (
            <IconLock size={14} className="text-muted-foreground" />
          ) : (
            <IconLockOpen2 size={14} className="text-muted-foreground" />
          ))}
        {isPinned && <IconPinned />}
        {isMuted && <IconVolume3 />}
        {unread && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs">
            1
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
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Room options"
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
            className="absolute top-10 right-2 z-20 w-40 rounded-md border border-border bg-popover p-1 shadow-md"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="w-full rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
              onClick={() => {
                toggleRoomPinned(room.id)
                setShowOptions(false)
              }}
            >
              {isPinned ? "Unpin room" : "Pin room"}
            </button>
            <button
              type="button"
              className="w-full rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
              onClick={() => {
                toggleRoomMuted(room.id)
                setShowOptions(false)
              }}
            >
              {isMuted ? "Unmute room" : "Mute room"}
            </button>
            <button
              type="button"
              className="w-full rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
              onClick={() => {
                toggleRoomUnread(room.id)
                setShowOptions(false)
              }}
            >
              {unread ? "Mark as read" : "Mark as unread"}
            </button>
          </div>
        </>
      )}
    </div>
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

  const defaultCreateRoomValues: CreateRoomFormInput = {
    name: "",
    description: "",
    isPrivate: "false",
  }

  const roomFields: FieldConfig<CreateRoomFormInput>[] = [
    {
      name: "name",
      label: "Room Name",
      placeholder: "my room",
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
      label: "Room Visibility",
      fieldType: "radio",
      options: [
        { label: "Public", value: "false" },
        { label: "Private", value: "true" },
      ],
    },
  ]

  async function createRoom(data: CreateRoomFormInput) {
    try {
      const payload: CreateRoomInput = {
        ...data,
        creatorId,
        isPrivate: data.isPrivate === "true",
      }
      const room = await createRoomRequest(payload)

      upsertRoom(room)
      setActiveRoom(room.id)
      setFormKey((currentKey) => currentKey + 1)
      setOpen(false)
      toast.success("Room created", toastOptions)
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.message ?? "Something went wrong")
        : "Something went wrong"

      toast.error(message, toastOptions)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border/80 bg-background text-base leading-none text-muted-foreground transition-colors hover:bg-muted">
              +
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Create Room</p>
        </TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-2xl">Create New Room</DialogTitle>
        </DialogHeader>

        <AppForm
          key={formKey}
          formId="create-room-form"
          schema={createRoomFormSchema}
          defaultValues={defaultCreateRoomValues}
          fields={roomFields}
          onSubmit={async (data) => {
            await createRoom(data)
          }}
          submitLabel="Create room"
          pendingLabel="Creating room..."
        />
      </DialogContent>
    </Dialog>
  )
}

