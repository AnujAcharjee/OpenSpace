"use client"

import { useState, useMemo, useEffect, useRef, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import {
  IconSearch,
  IconPinned,
  IconDotsVertical,
  IconPhoto,
  IconTrash,
  IconX,
  IconPlus,
  IconUsers,
  IconUser,
  IconMessagePlus,
  IconCheck,
  IconLoader2,
  IconLogout,
} from "@tabler/icons-react"
import { useShallow } from "zustand/react/shallow"
import type { RoomRecord, UserRecord } from "@repo/validation"
import useAppStore, {
  getRoomDisplayName,
  getRoomDisplayAvatar,
  getOtherParticipant,
} from "@/stores/app-store"
import axios from "axios"
import { useRooms } from "@/hooks/useRooms"
import { AppIcon } from "@/components/AppIcon"
import { DialogSettings } from "@/components/DialogSettings"
import { usersApiUrl } from "@/constants/apiUrls"

const toastOptions = {
  position: "top-center" as const,
}

function safeTimestamp(dateStr?: string | null): number {
  if (!dateStr) return 0
  const t = new Date(dateStr).getTime()
  return Number.isNaN(t) ? 0 : t
}

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ""

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return "just now"
  if (diffMinutes < 60) return `${diffMinutes}m`
  if (diffHours < 24) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date)
  }
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) {
    return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date)
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date)
}

// ─── New Chat Modal (Direct Message & Group) ────────────────────────────────

interface NewChatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUserId?: string
}

function NewChatDialog({ open, onOpenChange, currentUserId }: NewChatDialogProps) {
  const [tab, setTab] = useState<"direct" | "group">("direct")
  const [userQuery, setUserQuery] = useState("")
  const [userResults, setUserResults] = useState<UserRecord[]>([])
  const [isSearchingUsers, setIsSearchingUsers] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Group creation state
  const [groupName, setGroupName] = useState("")
  const [groupDescription, setGroupDescription] = useState("")
  const [selectedMembers, setSelectedMembers] = useState<UserRecord[]>([])

  const { createDirectRoom, createGroupRoom } = useRooms()
  const upsertRoom = useAppStore((s) => s.upsertRoom)
  const setActiveRoom = useAppStore((s) => s.setActiveRoom)
  const rooms = useAppStore((s) => s.rooms)

  // Reset dialog on open/close
  useEffect(() => {
    if (!open) {
      setUserQuery("")
      setUserResults([])
      setGroupName("")
      setGroupDescription("")
      setSelectedMembers([])
      setIsSubmitting(false)
    }
  }, [open])

  // Debounced user search
  useEffect(() => {
    const q = userQuery.trim().replace(/^@+/, "")
    if (!q) {
      setUserResults([])
      setIsSearchingUsers(false)
      return
    }

    setIsSearchingUsers(true)
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get<{ data?: { users?: UserRecord[] } }>(
          `${usersApiUrl}/search`,
          {
            params: { q },
            withCredentials: true,
          }
        )
        const found = res.data.data?.users ?? []
        // Filter out current user from search results
        setUserResults(found.filter((u) => u.id !== currentUserId))
      } catch {
        setUserResults([])
      } finally {
        setIsSearchingUsers(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [userQuery, currentUserId])

  // Handle starting a 1-to-1 Direct Chat
  async function handleStartDirect(targetUser: UserRecord) {
    if (isSubmitting) return

    // Check if an existing direct room already exists with this user
    const existingDirect = rooms.find(
      (r) =>
        r.type === "DIRECT" &&
        r.members.some((m) => m.userId === targetUser.id)
    )

    if (existingDirect) {
      setActiveRoom(existingDirect.id)
      onOpenChange(false)
      return
    }

    setIsSubmitting(true)
    try {
      const room = await createDirectRoom(targetUser.id)
      upsertRoom(room)
      setActiveRoom(room.id)
      toast.success(`Chat opened with @${targetUser.username}`, toastOptions)
      onOpenChange(false)
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ??
          error.response?.data?.message ??
          "Unable to start direct chat")
        : "Unable to start direct chat"
      toast.error(message, toastOptions)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle creating a new Group
  async function handleCreateGroup(e: FormEvent) {
    e.preventDefault()
    const name = groupName.trim()
    if (!name || isSubmitting) return

    setIsSubmitting(true)
    try {
      const memberUsernames = selectedMembers.map((m) => m.username)
      const room = await createGroupRoom({
        name,
        description: groupDescription.trim() || undefined,
        memberUsernames,
      })
      upsertRoom(room)
      setActiveRoom(room.id)
      toast.success(`Group "${name}" created!`, toastOptions)
      onOpenChange(false)
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ??
          error.response?.data?.message ??
          "Unable to create group")
        : "Unable to create group"
      toast.error(message, toastOptions)
    } finally {
      setIsSubmitting(false)
    }
  }

  function toggleSelectMember(u: UserRecord) {
    setSelectedMembers((prev) =>
      prev.some((m) => m.id === u.id)
        ? prev.filter((m) => m.id !== u.id)
        : [...prev, u]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full border border-line bg-paper text-ink p-0 overflow-hidden shadow-xl rounded-[var(--radius-sketch-md)]">
        <DialogHeader className="p-4 pb-2 border-b border-line">
          <DialogTitle className="font-display text-lg font-bold text-ink">
            New Conversation
          </DialogTitle>
          <DialogDescription className="text-xs text-ink-muted">
            Start a private 1-to-1 conversation or create a group chat.
          </DialogDescription>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 pt-3">
            <button
              type="button"
              onClick={() => setTab("direct")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-[var(--radius-sketch-sm)] text-xs font-semibold transition-all ${
                tab === "direct"
                  ? "bg-[var(--pencil-teal)] text-white shadow-xs"
                  : "bg-paper-subtle text-ink-muted hover:text-ink hover:bg-paper-dark"
              }`}
            >
              <IconUser size={14} />
              <span>Direct Message</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("group")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-[var(--radius-sketch-sm)] text-xs font-semibold transition-all ${
                tab === "group"
                  ? "bg-[var(--pencil-teal)] text-white shadow-xs"
                  : "bg-paper-subtle text-ink-muted hover:text-ink hover:bg-paper-dark"
              }`}
            >
              <IconUsers size={14} />
              <span>New Group</span>
            </button>
          </div>
        </DialogHeader>

        <div className="p-4 space-y-3">
          {tab === "direct" ? (
            /* ─── DIRECT MESSAGE TAB ─── */
            <div className="space-y-3">
              <div className="relative">
                <IconSearch
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
                />
                <input
                  type="text"
                  placeholder="Search by name or @username..."
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  autoFocus
                  className="w-full h-9 pl-9 pr-8 text-xs bg-paper-subtle border border-line rounded-[var(--radius-sketch-sm)] text-ink placeholder:text-ink-subtle focus:outline-hidden focus:ring-1 focus:ring-[var(--pencil-teal)] transition-all"
                />
                {userQuery && (
                  <button
                    type="button"
                    onClick={() => setUserQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink"
                  >
                    <IconX size={13} />
                  </button>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                {isSearchingUsers ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-ink-muted text-xs">
                    <IconLoader2 className="size-4 animate-spin text-[var(--pencil-teal)]" />
                    <span>Searching users...</span>
                  </div>
                ) : userQuery && userResults.length === 0 ? (
                  <div className="text-center py-8 text-xs text-ink-muted">
                    No users found matching "{userQuery}"
                  </div>
                ) : !userQuery ? (
                  <div className="text-center py-6 text-xs text-ink-muted">
                    Type a username or name to find someone to chat with.
                  </div>
                ) : (
                  userResults.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleStartDirect(u)}
                      className="w-full flex items-center justify-between p-2 rounded-[var(--radius-sketch-sm)] hover:bg-paper-subtle text-left transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="size-8 rounded-[var(--radius-sketch-sm)] border border-line">
                          {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt={u.name || u.username} />}
                          <AvatarFallback className="bg-[var(--pencil-teal-soft)] text-[var(--pencil-teal)] text-xs font-semibold">
                            {(u.name || u.username || "U").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-ink truncate group-hover:text-[var(--pencil-teal)]">
                            {u.name || u.username}
                          </p>
                          <p className="text-[11px] text-ink-muted truncate">
                            @{u.username}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-[var(--pencil-teal)] opacity-0 group-hover:opacity-100 transition-opacity">
                        Chat →
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* ─── NEW GROUP TAB ─── */
            <form onSubmit={handleCreateGroup} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink">Group Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Design Team, Family, Weekend Project"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                  maxLength={64}
                  className="w-full h-9 px-3 text-xs bg-paper-subtle border border-line rounded-[var(--radius-sketch-sm)] text-ink placeholder:text-ink-subtle focus:outline-hidden focus:ring-1 focus:ring-[var(--pencil-teal)] transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink">Description (Optional)</label>
                <textarea
                  placeholder="What is this group about?"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  rows={2}
                  maxLength={256}
                  className="w-full p-2.5 text-xs bg-paper-subtle border border-line rounded-[var(--radius-sketch-sm)] text-ink placeholder:text-ink-subtle focus:outline-hidden focus:ring-1 focus:ring-[var(--pencil-teal)] transition-all resize-none"
                />
              </div>

              {/* Selected member chips */}
              {selectedMembers.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink">
                    Selected Members ({selectedMembers.length})
                  </label>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {selectedMembers.map((m) => (
                      <span
                        key={m.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-[var(--pencil-teal-soft)] text-[var(--pencil-teal)] font-medium"
                      >
                        @{m.username}
                        <button
                          type="button"
                          onClick={() => toggleSelectMember(m)}
                          className="hover:opacity-70"
                        >
                          <IconX size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Add member search */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink">Add Members</label>
                <div className="relative">
                  <IconSearch
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
                  />
                  <input
                    type="text"
                    placeholder="Search users to add..."
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    className="w-full h-8 pl-8 pr-7 text-xs bg-paper-subtle border border-line rounded-[var(--radius-sketch-sm)] text-ink placeholder:text-ink-subtle focus:outline-hidden focus:ring-1 focus:ring-[var(--pencil-teal)]"
                  />
                  {userQuery && (
                    <button
                      type="button"
                      onClick={() => setUserQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink"
                    >
                      <IconX size={12} />
                    </button>
                  )}
                </div>

                {userQuery && (
                  <div className="max-h-36 overflow-y-auto border border-line rounded-[var(--radius-sketch-sm)] bg-surface p-1 space-y-0.5">
                    {isSearchingUsers ? (
                      <div className="text-center py-3 text-[11px] text-ink-muted">Searching...</div>
                    ) : userResults.length === 0 ? (
                      <div className="text-center py-3 text-[11px] text-ink-muted">No users found</div>
                    ) : (
                      userResults.map((u) => {
                        const isSelected = selectedMembers.some((m) => m.id === u.id)
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => toggleSelectMember(u)}
                            className="w-full flex items-center justify-between p-1.5 rounded-sm hover:bg-paper-subtle text-left text-xs"
                          >
                            <span className="font-medium text-ink truncate">
                              {u.name ? `${u.name} (@${u.username})` : `@${u.username}`}
                            </span>
                            {isSelected && (
                              <IconCheck size={14} className="text-[var(--pencil-teal)] shrink-0" />
                            )}
                          </button>
                        )
                      })
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="rounded-[var(--radius-sketch-sm)] h-8 text-xs border-line"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!groupName.trim() || isSubmitting}
                  className="rounded-[var(--radius-sketch-sm)] h-8 text-xs bg-[var(--pencil-teal)] text-white hover:bg-[var(--pencil-teal)]/90"
                >
                  {isSubmitting ? (
                    <IconLoader2 className="size-3.5 animate-spin mr-1" />
                  ) : null}
                  Create Group
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Channels / Conversations Component ────────────────────────────────

export default function ChannelsSection() {
  const router = useRouter()
  const {
    activeRoom,
    rooms,
    user,
    roomUiOptions,
    setActiveRoom,
    toggleRoomPinned,
    clearRoomUnread,
  } = useAppStore(
    useShallow((state) => ({
      activeRoom: state.activeRoom,
      rooms: state.rooms,
      user: state.user,
      roomUiOptions: state.roomUiOptions,
      setActiveRoom: state.setActiveRoom,
      toggleRoomPinned: state.toggleRoomPinned,
      clearRoomUnread: state.clearRoomUnread,
    }))
  )

  const { deleteRoom, leaveRoom } = useRooms()
  const [filterQuery, setFilterQuery] = useState("")
  const [isNewChatOpen, setIsNewChatOpen] = useState(false)

  // Filter and sort conversations
  const sortedRooms = useMemo(() => {
    const list = !user
      ? rooms
      : rooms.filter((room) =>
          room.members.some((member) => member.userId === user.id)
        )

    const filtered = filterQuery.trim()
      ? list.filter((r) => {
          const name = getRoomDisplayName(r, user?.id).toLowerCase()
          const other = getOtherParticipant(r, user?.id)
          const username = other?.username?.toLowerCase() || ""
          const q = filterQuery.trim().toLowerCase()
          return name.includes(q) || username.includes(q)
        })
      : list

    return [...filtered].sort((a, b) => {
      const aOptions = roomUiOptions[a.id]
      const bOptions = roomUiOptions[b.id]
      const aPinned = Boolean(aOptions?.pinned)
      const bPinned = Boolean(bOptions?.pinned)

      if (aPinned !== bPinned) return aPinned ? -1 : 1

      if (aPinned && bPinned) {
        const aPinnedAt = aOptions?.pinnedAt ?? 0
        const bPinnedAt = bOptions?.pinnedAt ?? 0
        if (aPinnedAt !== bPinnedAt) return bPinnedAt - aPinnedAt
      }

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
  }, [rooms, user, roomUiOptions, filterQuery, getRoomDisplayName, getOtherParticipant])

  function handleRoomSelect(room: RoomRecord) {
    setActiveRoom(room.id)
    clearRoomUnread(room.id)
  }

  async function handleDeleteOrLeave(room: RoomRecord) {
    if (!user) return
    const isOwner = room.creatorId === user.id
    try {
      if (isOwner && room.type === "GROUP") {
        await deleteRoom(room.id)
        useAppStore.getState().removeRoom(room.id)
        toast.success("Group deleted", toastOptions)
      } else {
        await leaveRoom(room.id, user.id)
        useAppStore.getState().removeRoom(room.id)
        toast.success("Left conversation", toastOptions)
      }
    } catch {
      toast.error("Failed to exit conversation", toastOptions)
    }
  }

  return (
    <Card className="h-full w-full flex flex-col border border-[#d4a03d]/40 dark:border-line bg-paper rounded-[var(--radius-sketch-md)] overflow-hidden shadow-xs">
      {/* ─── TOP BAR ─── */}
      <div className="p-3 pb-2 border-b border-line flex items-center justify-between gap-2 shrink-0">
        <div className="flex flex-col min-w-0">
          <AppIcon size="sm" />
          {user && (
            <p className="text-[11px] text-ink-muted truncate mt-0.5 font-medium pl-0.5">
              @{user.username}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsNewChatOpen(true)}
                className="size-8 rounded-[var(--radius-sketch-sm)] border-line bg-paper-subtle hover:bg-paper-dark text-ink shadow-2xs cursor-pointer"
              >
                <IconPlus size={16} className="text-[var(--pencil-teal)]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New Conversation</TooltipContent>
          </Tooltip>
          <DialogSettings />
        </div>
      </div>

      {/* ─── SEARCH INPUT ─── */}
      <div className="p-2.5 pb-2 shrink-0">
        <div className="relative">
          <IconSearch
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search conversations..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-7 text-xs bg-paper-subtle border border-line rounded-[var(--radius-sketch-sm)] text-ink placeholder:text-ink-subtle focus:outline-hidden focus:ring-1 focus:ring-[var(--pencil-teal)] transition-all"
          />
          {filterQuery && (
            <button
              type="button"
              onClick={() => setFilterQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink"
            >
              <IconX size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ─── CONVERSATIONS LIST ─── */}
      <ScrollArea className="flex-1 px-1.5 pb-2">
        <div className="space-y-0.5">
          {sortedRooms.length === 0 ? (
            <div className="p-6 text-center space-y-3">
              <div className="size-10 mx-auto rounded-full bg-[var(--pencil-teal-soft)] flex items-center justify-center text-[var(--pencil-teal)]">
                <IconMessagePlus size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-ink">No chats yet</p>
                <p className="text-[11px] text-ink-muted">
                  Start a private conversation or create a group to begin.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setIsNewChatOpen(true)}
                className="h-8 text-xs font-medium rounded-[var(--radius-sketch-sm)] bg-[var(--pencil-teal)] text-white hover:bg-[var(--pencil-teal)]/90"
              >
                <IconPlus size={13} className="mr-1" />
                Start Chat
              </Button>
            </div>
          ) : (
            sortedRooms.map((room) => {
              const isDirect = room.type === "DIRECT"
              const isActive = activeRoom === room.id
              const uiOpt = roomUiOptions[room.id]
              const isPinned = Boolean(uiOpt?.pinned)
              const unreadCount = uiOpt?.unreadCount ?? 0

              const displayName = getRoomDisplayName(room, user?.id)
              const displayAvatar = getRoomDisplayAvatar(room, user?.id)
              const otherUser = isDirect ? getOtherParticipant(room, user?.id) : null

              const lastMsg = room.lastMessage
              const lastMsgTime = formatRelativeTime(lastMsg?.createdAt || room.createdAt)
              const lastMsgPreview = lastMsg
                ? (lastMsg as any).isDeleted
                  ? "Message deleted"
                  : lastMsg.text || (lastMsg.attachments?.length ? "Attachment" : "...")
                : "No messages yet"

              return (
                <ContextMenu key={room.id}>
                  <ContextMenuTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handleRoomSelect(room)}
                      className={`w-full flex items-center gap-2.5 p-2 rounded-[var(--radius-sketch-sm)] text-left transition-all cursor-pointer ${
                        isActive
                          ? "bg-[var(--pencil-teal-soft)]/60 text-ink ring-1 ring-[var(--pencil-teal)]/40 shadow-xs"
                          : "hover:bg-paper-subtle text-ink"
                      }`}
                    >
                      {/* Avatar with presence */}
                      <div className="relative shrink-0">
                        <Avatar className="size-10 rounded-[var(--radius-sketch-sm)] border border-line bg-paper-subtle">
                          {displayAvatar && (
                            <AvatarImage src={displayAvatar} alt={displayName} />
                          )}
                          <AvatarFallback
                            className={`text-xs font-bold ${
                              isDirect
                                ? "bg-[var(--pencil-teal-soft)] text-[var(--pencil-teal)]"
                                : "bg-[var(--pencil-yellow-soft)] text-[var(--pencil-yellow)]"
                            }`}
                          >
                            {isDirect ? (
                              displayName.slice(0, 2).toUpperCase()
                            ) : (
                              <IconUsers size={16} />
                            )}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      {/* Info & Last message snippet */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span
                            className={`text-xs font-semibold truncate ${
                              isActive ? "text-[var(--pencil-teal)]" : "text-ink"
                            }`}
                          >
                            {displayName}
                          </span>
                          <span className="text-[10px] text-ink-subtle shrink-0">
                            {lastMsgTime}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-1">
                          <p className="text-[11px] text-ink-muted truncate">
                            {isDirect ? (
                              lastMsgPreview
                            ) : lastMsg?.senderUsername ? (
                              <span>
                                <span className="font-medium text-ink-subtle">
                                  {lastMsg.sender === user?.id ? "You" : lastMsg.senderUsername}:
                                </span>{" "}
                                {lastMsgPreview}
                              </span>
                            ) : (
                              lastMsgPreview
                            )}
                          </p>

                          <div className="flex items-center gap-1 shrink-0">
                            {isPinned && (
                              <IconPinned
                                size={12}
                                className="text-[var(--pencil-yellow)] rotate-45"
                              />
                            )}
                            {unreadCount > 0 && (
                              <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] font-bold bg-[var(--pencil-coral)] text-white">
                                {unreadCount > 99 ? "99+" : unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  </ContextMenuTrigger>

                  <ContextMenuContent className="w-44 border border-line bg-paper text-ink rounded-[var(--radius-sketch-sm)] shadow-lg">
                    <ContextMenuItem
                      onClick={() => toggleRoomPinned(room.id)}
                      className="text-xs cursor-pointer"
                    >
                      <IconPinned size={14} className="mr-2 text-[var(--pencil-yellow)]" />
                      {isPinned ? "Unpin chat" : "Pin chat"}
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => clearRoomUnread(room.id)}
                      className="text-xs cursor-pointer"
                    >
                      <IconCheck size={14} className="mr-2 text-[var(--pencil-teal)]" />
                      Mark as read
                    </ContextMenuItem>
                    <ContextMenuSeparator className="bg-line" />
                    <ContextMenuItem
                      onClick={() => handleDeleteOrLeave(room)}
                      className="text-xs text-[var(--pencil-coral)] cursor-pointer"
                    >
                      {room.creatorId === user?.id && room.type === "GROUP" ? (
                        <>
                          <IconTrash size={14} className="mr-2" />
                          Delete group
                        </>
                      ) : (
                        <>
                          <IconLogout size={14} className="mr-2" />
                          Leave chat
                        </>
                      )}
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* ─── NEW CHAT MODAL ─── */}
      <NewChatDialog
        open={isNewChatOpen}
        onOpenChange={setIsNewChatOpen}
        currentUserId={user?.id}
      />
    </Card>
  )
}
