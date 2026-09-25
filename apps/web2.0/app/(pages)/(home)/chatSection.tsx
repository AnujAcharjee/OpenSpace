"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import useAppStore from "@/stores/app-store"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  IconBrandTelegram,
  IconPaperclip,
  IconMoodSmile,
  IconMicrophone,
  IconChevronLeft,
  IconDotsVertical,
  IconMessageReply,
  IconPinned,
  IconTrash,
  IconUserMinus,
  IconUserPlus,
  IconUsers,
  IconX,
  IconPhoto,
  IconAlertCircle,
  IconCopy,
  IconLogout,
  IconBolt,
  IconShieldCheck,
  IconCrown,
  IconArrowDown,
  IconHash,
  IconSearch,
  IconPlus,
  IconVideo,
  IconMessageCircle,
  IconFileTypePdf,
  IconDownload,
  IconExternalLink,
  IconLoader2,
} from "@tabler/icons-react"
import type { ChatAttachment } from "@/utils/cloudinary"
import { wsClient } from "@/ws"
import { PREDEFINED_TOPICS } from "@/components/ExploreChannels"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { toast } from "sonner"
import AppForm, { type FieldConfig } from "@/components/AppForm"
import { AppIcon } from "@/components/AppIcon"
import { Button } from "@/components/ui/button"
import { createRoomSchema } from "@repo/validation"
import type {
  AddRoomMembersRequest,
  EditRoomRequest,
  RoomJoinRequestRecord,
  RoomMemberRecord,
  RoomRecord,
} from "@repo/validation"
import axios from "axios"
import type { RoomMessage } from "@/stores/app-store"
import { useRooms } from "@/hooks/useRooms"
import { z } from "zod"
import { useChatSection, formatMessageTime } from "@/hooks/useChatSection"
import { DialogAddMembers } from "@/components/DialogAddMembers"
import { EmojiPicker } from "@/components/EmojiPicker"
import { ExploreChannels } from "@/components/ExploreChannels"
import { DialogCreateRoom } from "./channels"

type MessageBubbleParent = {
  id: string
  username: string
  message?: string
  isDeleted?: boolean
}

type EditRoomFormInput = {
  name: string
  description: string
  isPrivate: "true" | "false"
}

const toastOptions = {
  position: "top-center" as const,
}

const EMPTY_JOIN_REQUESTS: RoomJoinRequestRecord[] = []
const roomBodySchema = createRoomSchema.shape.body

const editRoomFormSchema = z.object({
  name: roomBodySchema.shape.name,
  description: roomBodySchema.shape.description,
  isPrivate: z.enum(["false", "true"]),
})

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export default function ChatSection({
  room,
  onShowSidebar,
}: {
  room: RoomRecord | null
  onShowSidebar?: () => void
}) {
  const router = useRouter()
  const {
    user,
    setActiveRoom,
    canManageRoom,
    roomMessages,
    roomMessagesById,
    isLoading,
    messagesEndRef,
    replyingTo,
    setReplyingTo,
    clearReply,
    showMembersPanel,
    toggleMembersPanel,
    closeMembersPanel,
    deletingMessageId,
    handleDeleteMessage,
    draft,
    setDraft,
    isSending,
    uploadProgress,
    stagedAttachment,
    stageAttachment,
    clearStagedAttachment,
    sendMessage,
    getAuthorName,
    getAuthorAvatar,
    getMessageBody,
  } = useChatSection(room)

  // Deduplicate messages by ID to guarantee distinct React keys
  const displayMessages = useMemo(() => {
    const seen = new Set<string>()
    return roomMessages.filter((m) => {
      if (seen.has(m.id)) return false
      seen.add(m.id)
      return true
    })
  }, [roomMessages])

  const isExploringChannels = useAppStore((s) => s.isExploringChannels)
  const setIsExploringChannels = useAppStore((s) => s.setIsExploringChannels)
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false)
  const [createRoomDefaultTopic, setCreateRoomDefaultTopic] = useState<string | undefined>(undefined)

  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; name: string } | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const chatFileInputRef = useRef<HTMLInputElement>(null)

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/") || item.type === "application/pdf") {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          stageAttachment(file)
          break
        }
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragOver) setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      stageAttachment(file)
    }
  }

  const { getPendingJoinRequests: getPendingJoinRequestsRequest } = useRooms()
  const pendingRequests = useAppStore(
    (s) => (room ? s.joinRequests[room.id] ?? EMPTY_JOIN_REQUESTS : EMPTY_JOIN_REQUESTS)
  )

  useEffect(() => {
    if (replyingTo) {
      inputRef.current?.focus()
    }
  }, [replyingTo])

  const handleScrollToMessage = (targetId?: string) => {
    if (!targetId) return
    const el = document.getElementById(`msg-${targetId}`)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      el.classList.add("ring-2", "ring-[var(--pencil-teal)]", "bg-[var(--pencil-teal-soft)]", "rounded-[var(--radius-sketch-sm)]")
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-[var(--pencil-teal)]", "bg-[var(--pencil-teal-soft)]", "rounded-[var(--radius-sketch-sm)]")
      }, 1400)
    }
  }

  useEffect(() => {
    if (!room || !canManageRoom || !user?.id) return
    let isCancelled = false

    void getPendingJoinRequestsRequest(room.id, user.id)
      .then((requests) => {
        if (!isCancelled) {
          useAppStore.getState().setJoinRequests(room.id, requests)
        }
      })
      .catch(() => {})

    return () => {
      isCancelled = true
    }
  }, [canManageRoom, getPendingJoinRequestsRequest, room, user?.id])

  if (isExploringChannels) {
    return (
      <div className="h-full w-full">
        <ExploreChannels
          onOpenCreateChannel={(defaultTopic) => {
            if (!user) {
              router.push("/signin")
              return
            }
            setCreateRoomDefaultTopic(defaultTopic)
            setIsCreateRoomOpen(true)
          }}
          onClose={() => setIsExploringChannels(false)}
        />
        {user && (
          <DialogCreateRoom
            creatorId={user.id}
            open={isCreateRoomOpen}
            onOpenChange={setIsCreateRoomOpen}
            defaultTopic={createRoomDefaultTopic}
          />
        )}
      </div>
    )
  }

  if (!room) {
    if (!user) {
      return (
        <div className="h-full w-full p-1 sm:p-1.5">
          <Card className="flex h-full w-full flex-col items-center justify-center border border-line bg-paper rounded-[var(--radius-sketch-md)] shadow-sm p-6 text-center">
            <div className="flex flex-col items-center max-w-md space-y-6">
              <div className="relative flex items-center justify-center py-4">
                <AppIcon size="lg" />
              </div>

              <div className="space-y-2">
                <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
                  Welcome to OpenSpace
                </h2>
                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                  A real-time workspace drawn with colored pencils and ink on fine stationery. Discover channels, join discussions, and sketch your ideas.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-11 px-8 rounded-[var(--radius-sketch-sm)] font-semibold shadow-xs cursor-pointer"
                  onClick={() => router.push("/signin")}
                >
                  Sign in
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto h-11 px-6 rounded-[var(--radius-sketch-sm)] font-semibold border-[var(--pencil-green)]/40 text-[var(--pencil-green)] hover:bg-[var(--pencil-green-soft)] cursor-pointer"
                  onClick={() => setIsExploringChannels(true)}
                >
                  Explore Channels
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-3 w-full pt-4 border-t border-line text-center">
                <div className="flex flex-col items-center space-y-1">
                  <div className="flex items-center gap-1 text-xs font-semibold text-ink font-display">
                    <IconBolt size={14} className="text-[var(--pencil-yellow)]" />
                    <span>Real-time</span>
                  </div>
                  <div className="text-[10px] text-ink-muted">0ms local caching</div>
                </div>
                <div className="flex flex-col items-center space-y-1">
                  <div className="flex items-center gap-1 text-xs font-semibold text-ink font-display">
                    <IconShieldCheck size={14} className="text-[var(--pencil-green)]" />
                    <span>Protected</span>
                  </div>
                  <div className="text-[10px] text-ink-muted">Pramaan Auth</div>
                </div>
                <div
                  onClick={() => setIsExploringChannels(true)}
                  className="flex flex-col items-center space-y-1 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-1 text-xs font-semibold text-ink font-display">
                    <IconHash size={14} className="text-[var(--pencil-teal)]" />
                    <span>Channels</span>
                  </div>
                  <div className="text-[10px] text-ink-muted">Public & Private</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )
    }

    return (
      <div className="h-full w-full p-1 sm:p-1.5">
        <Card className="flex h-full w-full flex-col items-center justify-center border border-[#d4a03d]/40 dark:border-line bg-paper rounded-[var(--radius-sketch-md)] shadow-sm p-6 text-center">
          <div className="flex flex-col items-center max-w-sm space-y-4">
            <div className="relative flex items-center justify-center py-2">
              <AppIcon size="lg" />
            </div>

            <div className="space-y-1">
              <h2 className="font-display text-xl font-bold tracking-tight text-ink">
                Welcome to OpenSpace{user?.name ? `, ${user.name}` : user?.username ? `, ${user.username}` : ""}!
              </h2>
              <p className="text-xs text-ink-muted leading-relaxed">
                Pick a channel from the sidebar and join the conversation.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 w-full pt-4 border-t border-line text-left">
              <div
                onClick={() => setIsExploringChannels(true)}
                className="flex flex-col gap-1 rounded-[var(--radius-sketch-sm)] border border-line bg-paper-subtle p-3 cursor-pointer hover:border-[var(--pencil-green)] hover:-translate-y-0.5 transition-all shadow-2xs group"
              >
                <div className="font-display text-xs font-semibold text-ink group-hover:text-[var(--pencil-green)] transition-colors">
                  Explore Channels
                </div>
                <div className="text-[11px] text-ink-muted leading-tight">
                  Browse discussions by topic
                </div>
              </div>

              <div
                onClick={() => setIsCreateRoomOpen(true)}
                className="flex flex-col gap-1 rounded-[var(--radius-sketch-sm)] border border-line bg-paper-subtle p-3 cursor-pointer hover:border-[var(--pencil-blue)] hover:-translate-y-0.5 transition-all shadow-2xs group"
              >
                <div className="font-display text-xs font-semibold text-ink group-hover:text-[var(--pencil-blue)] transition-colors">
                  Create Channel
                </div>
                <div className="text-[11px] text-ink-muted leading-tight">
                  Start your own community
                </div>
              </div>
            </div>
          </div>
        </Card>

        {user && (
          <DialogCreateRoom
            creatorId={user.id}
            open={isCreateRoomOpen}
            onOpenChange={setIsCreateRoomOpen}
            defaultTopic={createRoomDefaultTopic}
          />
        )}
      </div>
    )
  }

  return (
    <div className="h-full w-full p-1 sm:p-1.5">
      <Card className="flex h-full w-full flex-col gap-0 border border-[#d4a03d]/40 dark:border-line bg-paper shadow-sm rounded-[var(--radius-sketch-md)] p-0 overflow-hidden">
        {/* Letterhead Header */}
        <CardHeader className="shrink-0 flex items-center gap-2 border-b border-line bg-paper-subtle/80 px-3 py-3 backdrop-blur-xs">
          <button
            type="button"
            onClick={() => {
              setActiveRoom(null)
              onShowSidebar?.()
            }}
            className="group flex items-center justify-center rounded-[var(--radius-sketch-sm)] p-1 text-ink-muted transition-all duration-150 hover:bg-surface-hover hover:text-ink active:scale-95 cursor-pointer"
            aria-label="Go back"
          >
            <IconChevronLeft
              stroke={2}
              height={18}
              width={18}
              className="transition-transform duration-150 group-hover:-translate-x-0.5"
            />
          </button>

          <button
            type="button"
            onClick={toggleMembersPanel}
            className="rounded-[var(--radius-sketch-sm)] transition hover:opacity-90 cursor-pointer"
            aria-label="View channel members"
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={room.avatarUrl ?? undefined} alt={room.name} />
              <AvatarFallback className="text-xs font-semibold">
                {room.name[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>

          <button
            type="button"
            onClick={toggleMembersPanel}
            className="min-w-0 flex-1 rounded-[var(--radius-sketch-sm)] px-1 py-0.5 text-left transition hover:bg-surface-hover cursor-pointer"
            aria-label="View channel members"
          >
            <div className="font-display text-sm font-semibold truncate tracking-tight text-ink flex items-center gap-1">
              <span className="text-ink-subtle">#</span>
              <span>{room.name}</span>
            </div>
            {room.description?.trim() && (
              <div className="truncate text-xs text-ink-muted">
                {room.description}
              </div>
            )}
          </button>

          {canManageRoom && pendingRequests.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleMembersPanel}
              className="h-7 px-2.5 text-xs font-semibold text-[var(--pencil-teal)] border-[var(--pencil-teal)]/40 bg-[var(--pencil-teal-soft)] hover:bg-[var(--pencil-teal-soft)]/80 rounded-[var(--radius-sketch-sm)] cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--pencil-teal)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--pencil-teal)]" />
              </span>
              <span>
                {pendingRequests.length} {pendingRequests.length === 1 ? "Request" : "Requests"}
              </span>
            </Button>
          )}

          {canManageRoom && <DialogEditRoom key={room.id} room={room} />}
        </CardHeader>

        {/* Chat / Members Area */}
        <CardContent className="min-h-0 flex-1 overflow-hidden px-0 py-0 sm:px-1">
          {showMembersPanel ? (
            <RoomMembersPanel
              room={room}
              currentUserId={user?.id ?? null}
              canManageRoom={canManageRoom}
              onShowChat={closeMembersPanel}
            />
          ) : (
            <div
              className="relative flex h-full min-h-0 flex-col overflow-hidden"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/* Drag and drop overlay */}
              {isDragOver && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-[var(--radius-sketch-md)] bg-paper/90 backdrop-blur-xs border-2 border-dashed border-[var(--pencil-teal)] animate-in fade-in duration-150">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-sketch-md)] bg-[var(--pencil-teal-soft)] text-[var(--pencil-teal)] shadow-sm animate-bounce">
                    <IconPhoto size={30} stroke={2} />
                  </div>
                  <div className="mt-3 font-display text-sm font-semibold text-ink">Drop to attach sketch / document</div>
                  <div className="text-xs text-ink-muted">Supports images and PDF documents</div>
                </div>
              )}

              {canManageRoom && pendingRequests.length > 0 && (
                <div className="shrink-0 mx-3 mt-2 flex items-center justify-between rounded-[var(--radius-sketch-sm)] border border-[var(--pencil-teal)]/30 bg-[var(--pencil-teal-soft)]/30 px-3 py-1.5 text-xs text-ink animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center gap-2">
                    <IconUsers size={14} className="text-[var(--pencil-teal)] shrink-0" />
                    <span className="font-medium text-[11px] sm:text-xs">
                      {pendingRequests.length} pending join {pendingRequests.length === 1 ? "request" : "requests"}
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs font-semibold text-[var(--pencil-teal)] hover:bg-[var(--pencil-teal-soft)] cursor-pointer"
                    onClick={toggleMembersPanel}
                  >
                    Review requests
                  </Button>
                </div>
              )}

              <ScrollArea className="h-full w-full min-h-0 flex-1">
                <div className="space-y-2.5 px-3 py-3 sm:px-4">
                  {isLoading && (
                    <div className="text-center text-xs text-ink-muted py-4">
                      Loading messages...
                    </div>
                  )}
                  {!isLoading && displayMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center select-none space-y-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-sketch-md)] bg-paper-subtle border border-line text-ink-muted mb-1">
                        <IconMessageReply size={22} className="opacity-70" />
                      </div>
                      <div className="font-display text-sm font-semibold text-ink">No entries on this page yet</div>
                      <div className="text-xs text-ink-muted max-w-xs">Be the first to leave a message in this channel.</div>
                    </div>
                  )}
                  {displayMessages.map((message) => {
                    const isSystemMessage =
                      message.type === "SYSTEM" ||
                      message.sender === "SYSTEM" ||
                      message.sender?.toLowerCase() === "system" ||
                      message.senderUsername?.toLowerCase() === "system"

                    if (isSystemMessage) {
                      return (
                        <SystemMessage
                          key={message.id}
                          message={
                            message.isDeleted ? "Message deleted" : message.text
                          }
                          timestamp={formatMessageTime(message.createdAt)}
                        />
                      )
                    }

                    const isOwn = message.sender === user?.id
                    const username = getAuthorName(message)
                    const avatar = getAuthorAvatar(message)
                    const parentMsg = message.parent ?? (message.parentId ? roomMessagesById.get(message.parentId) : undefined)
                    const parentUsername = message.parent?.senderUsername ?? (parentMsg ? getAuthorName(parentMsg as RoomMessage) : undefined)
                    const hasParent = Boolean(message.parentId || message.parent)

                    return (
                      <MessageBubble
                        key={message.id}
                        id={`msg-${message.id}`}
                        username={username}
                        avatar={avatar}
                        parentId={message.parentId ?? message.parent?.id}
                        parentMessage={
                          hasParent
                            ? {
                                id: message.parent?.id ?? parentMsg?.id ?? message.parentId ?? "",
                                username: parentUsername ?? "Original message",
                                message: message.parent?.text ?? parentMsg?.text,
                                isDeleted: message.parent?.isDeleted ?? parentMsg?.isDeleted,
                              }
                            : undefined
                        }
                        message={
                          message.isDeleted ? "Message deleted" : message.text
                        }
                        attachments={message.attachments}
                        timestamp={formatMessageTime(message.createdAt)}
                        isOwn={isOwn}
                        status={message.status}
                        canDelete={
                          isOwn &&
                          !message.isDeleted &&
                          deletingMessageId !== message.id
                        }
                        onReply={() => setReplyingTo(message)}
                        onDelete={() => void handleDeleteMessage(message.id)}
                        onJumpToParent={() => handleScrollToMessage(message.parentId ?? message.parent?.id)}
                        onPreviewImage={(url, name) => setLightboxMedia({ url, name })}
                      />
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>

        {/* Message Composer */}
        {!showMembersPanel && (
          <CardFooter className="shrink-0 flex gap-2 px-3 py-3 border-t border-line bg-paper-subtle/80 backdrop-blur-xs">
            {!user ? (
              <div className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-sketch-sm)] border border-line bg-paper px-4 py-2.5">
                <span className="text-xs text-ink-muted">
                  Sign in to write on this stationery desk.
                </span>
                <Button
                  size="sm"
                  className="h-8 shrink-0 rounded-[var(--radius-sketch-sm)] px-3 text-xs font-semibold cursor-pointer"
                  onClick={() => router.push("/signin")}
                >
                  Sign In
                </Button>
              </div>
            ) : user && !room.members.some((m) => m.userId === user.id) ? (
              <div className="flex w-full max-w-xl mx-auto items-center gap-2 rounded-[var(--radius-sketch-sm)] border border-[var(--pencil-yellow)]/40 bg-[var(--pencil-yellow-soft)]/30 px-3 py-2.5 text-xs font-medium text-ink">
                <IconAlertCircle size={16} className="shrink-0 text-[var(--pencil-yellow)]" />
                <span>You have been removed from this channel. You can no longer send messages.</span>
              </div>
            ) : (
              <form
                className="flex w-full max-w-xl mx-auto items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!draft.trim() && !stagedAttachment) return
                  if (isSending) return
                  const textToSend = draft
                  setDraft("")
                  if (inputRef.current) inputRef.current.value = ""
                  void sendMessage(textToSend)
                }}
              >
                <div className="relative flex flex-1 flex-col gap-1.5">
                  <EmojiPicker
                    isOpen={showEmojiPicker}
                    onClose={() => setShowEmojiPicker(false)}
                    onSelectEmoji={(emoji) => {
                      setDraft(draft + emoji)
                    }}
                  />

                  {/* Staged Attachment Preview Bar */}
                  {stagedAttachment && (
                    <div className="relative flex items-center justify-between gap-3 rounded-[var(--radius-sketch-sm)] border border-[var(--pencil-teal)]/40 bg-paper shadow-sm px-3 py-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {stagedAttachment.type === "IMAGE" ? (
                          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[var(--radius-sketch-sm)] border border-line bg-paper-dark shadow-2xs">
                            <img
                              src={stagedAttachment.previewUrl}
                              alt={stagedAttachment.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-sketch-sm)] bg-[var(--pencil-coral-soft)] text-[var(--pencil-coral)] border border-[var(--pencil-coral)]/30 shadow-2xs">
                            <IconFileTypePdf size={22} stroke={1.8} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-xs font-semibold text-ink">
                              {stagedAttachment.name}
                            </span>
                            <span className="shrink-0 rounded bg-paper-dark px-1.5 py-0.5 text-[10px] font-mono text-ink-muted">
                              {formatFileSize(stagedAttachment.size)}
                            </span>
                          </div>
                          {isSending ? (
                            <div className="mt-1 space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-[var(--pencil-teal)] font-medium">
                                <span>Uploading attachment...</span>
                                <span>{uploadProgress}%</span>
                              </div>
                              <div className="h-1 w-full overflow-hidden rounded-full bg-paper-dark">
                                <div
                                  className="h-full bg-[var(--pencil-teal)] transition-all duration-200"
                                  style={{ width: `${uploadProgress}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="text-[11px] text-ink-muted">
                              Ready to send — add note or click send
                            </div>
                          )}
                        </div>
                      </div>
                      {!isSending && (
                        <button
                          type="button"
                          onClick={clearStagedAttachment}
                          className="rounded-[4px] p-1.5 text-ink-muted transition-all duration-150 hover:bg-surface-hover hover:text-ink cursor-pointer shrink-0"
                          title="Remove attachment"
                          aria-label="Remove attachment"
                        >
                          <IconX size={15} />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Reply Quote Banner */}
                  {replyingTo && (
                    <div className="flex items-center justify-between gap-2.5 rounded-[var(--radius-sketch-sm)] border border-[var(--pencil-teal)]/40 bg-paper shadow-sm px-3 py-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sketch-sm)] bg-[var(--pencil-teal-soft)] text-[var(--pencil-teal)] border border-[var(--pencil-teal)]/30 shadow-2xs">
                          <IconMessageReply size={14} stroke={2.5} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--pencil-teal)] font-display">
                            <span>Replying to</span>
                            <span className="truncate">@{getAuthorName(replyingTo)}</span>
                          </div>
                          <div className="line-clamp-1 text-[11px] text-ink-muted font-normal">
                            {getMessageBody(replyingTo)}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearReply}
                        className="rounded-[4px] p-1.5 text-ink-muted transition-all duration-150 hover:bg-surface-hover hover:text-ink cursor-pointer shrink-0"
                        title="Cancel reply"
                        aria-label="Cancel reply"
                      >
                        <IconX size={15} />
                      </button>
                    </div>
                  )}

                  <InputGroup className="h-10 w-full border border-line bg-paper shadow-2xs rounded-[var(--radius-sketch-sm)] focus-within:border-[var(--pencil-teal)]">
                    <input
                      type="file"
                      ref={chatFileInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          stageAttachment(file)
                        }
                        e.target.value = ""
                      }}
                      accept="image/*,application/pdf"
                      className="hidden"
                    />
                    <InputGroupInput
                      ref={inputRef}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          if (!isSending && (draft.trim() || stagedAttachment)) {
                            const textToSend = draft
                            setDraft("")
                            if (inputRef.current) inputRef.current.value = ""
                            void sendMessage(textToSend)
                          }
                        }
                      }}
                      onPaste={handlePaste}
                      placeholder={
                        !user
                          ? "Sign in to write"
                          : !room.members.some((m) => m.userId === user.id)
                            ? "You cannot message in this channel"
                            : replyingTo
                              ? `Reply to @${getAuthorName(replyingTo)}...`
                              : stagedAttachment
                                ? "Add a caption..."
                                : `Message #${room.name}`
                      }
                      disabled={!user || !room.members.some((m) => m.userId === user.id)}
                    />
                    <InputGroupAddon>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => chatFileInputRef.current?.click()}
                            disabled={!user || !room.members.some((m) => m.userId === user.id)}
                            className="rounded p-0.5 text-ink-muted transition-all hover:text-ink active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                            aria-label="Attach file"
                          >
                            <IconPaperclip
                              stroke={2}
                              height={19}
                              width={19}
                              className={
                                stagedAttachment
                                  ? "text-[var(--pencil-teal)]"
                                  : "text-ink-muted hover:text-ink"
                              }
                            />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Attach image or PDF</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => setShowEmojiPicker((prev) => !prev)}
                            disabled={!user || !room.members.some((m) => m.userId === user.id)}
                            className="rounded p-0.5 text-ink-muted transition-all hover:text-ink active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                            aria-label="Add emoji"
                          >
                            <IconMoodSmile
                              stroke={2}
                              height={20}
                              width={20}
                              className={
                                showEmojiPicker
                                  ? "text-[var(--pencil-teal)]"
                                  : "text-ink-muted hover:text-ink"
                              }
                            />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Add emoji</p>
                        </TooltipContent>
                      </Tooltip>
                    </InputGroupAddon>
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="submit"
                        variant="ghost"
                        size="icon-sm"
                        disabled={
                          !user ||
                          !room.members.some((m) => m.userId === user.id) ||
                          (!draft.trim() && !stagedAttachment)
                        }
                        className="text-ink-muted hover:text-ink cursor-pointer"
                      >
                        <IconBrandTelegram stroke={2} height={18} width={18} className="text-[var(--pencil-teal)]" />
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </div>

                <div className="rounded-[var(--radius-sketch-sm)] border border-line bg-paper-subtle p-2">
                  <IconMicrophone
                    stroke={2}
                    height={18}
                    width={18}
                    className="cursor-not-allowed text-ink-subtle"
                  />
                </div>
              </form>
            )}
          </CardFooter>
        )}
      </Card>

      {/* Lightbox Modal for high-resolution image preview */}
      {lightboxMedia && (
        <Dialog open={Boolean(lightboxMedia)} onOpenChange={(open) => !open && setLightboxMedia(null)}>
          <DialogContent className="sm:max-w-none w-auto max-w-[92vw] max-h-[92vh] p-0 bg-paper border-2 border-line rounded-[var(--radius-sketch-md)] overflow-hidden shadow-2xl inline-flex flex-col">
            <DialogHeader className="px-4 py-2.5 flex flex-row items-center justify-between border-b border-line shrink-0">
              <DialogTitle className="font-display text-sm font-semibold truncate max-w-xs sm:max-w-md text-ink">
                {lightboxMedia.name}
              </DialogTitle>
              <div className="flex items-center gap-2 pr-6">
                <a
                  href={lightboxMedia.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={lightboxMedia.name}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-sketch-sm)] text-xs font-medium bg-[var(--pencil-teal-soft)] text-[var(--pencil-teal)] hover:opacity-90 transition cursor-pointer"
                >
                  <IconDownload size={14} />
                  <span>Download</span>
                </a>
              </div>
            </DialogHeader>
            <div className="flex items-center justify-center p-2 sm:p-3 overflow-hidden bg-paper-subtle/80 max-h-[82vh] w-auto">
              <img
                src={lightboxMedia.url}
                alt={lightboxMedia.name}
                className="max-h-[76vh] max-w-[86vw] w-auto h-auto rounded-[var(--radius-sketch-sm)] object-contain shadow-sm"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function SystemMessage({
  message,
  timestamp,
}: {
  message?: string
  timestamp: string
}) {
  const formattedText = useMemo(() => {
    if (!message) return "System notification"
    const trimmed = message.trim()
    return trimmed.replace(
      /^([^@\s]+)\s+(left the room|joined the room|was removed from the room)/,
      "@$1 $2"
    )
  }, [message])

  return (
    <div className="flex w-full items-center justify-center my-2 select-none">
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-sketch-sm)] border border-dashed border-line bg-paper-subtle text-center">
        <span className="font-mono text-[11px] text-ink-muted leading-relaxed">
          {formattedText}
        </span>
        {timestamp && (
          <span className="text-[10px] text-ink-subtle shrink-0">
            {timestamp}
          </span>
        )}
      </div>
    </div>
  )
}

function MessageBubble({
  id,
  username,
  avatar,
  parentId,
  parentMessage,
  message,
  attachments,
  timestamp,
  isOwn = false,
  status,
  canDelete = false,
  onReply,
  onDelete,
  onJumpToParent,
  onPreviewImage,
}: {
  id?: string
  username: string
  avatar?: string
  parentId?: string
  parentMessage?: MessageBubbleParent
  message?: string
  attachments?: string
  timestamp: string
  isOwn?: boolean
  status?: "sending" | "sent" | "failed"
  canDelete?: boolean
  onReply: () => void
  onDelete: () => void
  onJumpToParent?: () => void
  onPreviewImage?: (url: string, name: string) => void
}) {
  const parsedAttachments = useMemo<ChatAttachment[]>(() => {
    if (!attachments) return []
    try {
      const parsed = typeof attachments === "string" ? JSON.parse(attachments) : attachments
      return Array.isArray(parsed) ? parsed : [parsed]
    } catch {
      return []
    }
  }, [attachments])

  const fallbackMessage = message?.trim() ? message : parsedAttachments.length > 0 ? "" : "Attachment"
  const fallbackParentMessage = parentMessage?.isDeleted
    ? "Message deleted"
    : parentMessage?.message?.trim()
      ? parentMessage.message
      : parentId
        ? "Original message unavailable"
        : ""

  const handleCopy = () => {
    const textToCopy = message?.trim() || parsedAttachments[0]?.url || ""
    if (textToCopy) {
      void navigator.clipboard.writeText(textToCopy)
      toast.success("Copied to clipboard", toastOptions)
    }
  }

  return (
    <div
      id={id}
      className={`group relative flex w-full items-end gap-2 px-1 py-0.5 transition-all duration-200 animate-in fade-in-50 slide-in-from-bottom-1 ${
        isOwn ? "justify-end" : "justify-start"
      }`}
    >
      {/* Avatar only shown for other users' messages on the left */}
      {!isOwn && (
        <Avatar className="h-7 w-7 shrink-0 mb-1">
          <AvatarImage src={avatar} alt={username} />
          <AvatarFallback className="text-[11px] font-semibold">
            {username[0]?.toUpperCase() ?? "U"}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Message Bubble Container with Context Menu on right-click */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={`relative flex min-w-0 max-w-[85%] sm:max-w-[75%] flex-col select-text ${
              isOwn ? "items-end" : "items-start"
            }`}
          >
            {/* Quick Action Floating Bar on Hover */}
            <div
              className={`absolute -top-3.5 opacity-0 group-hover:opacity-100 transition-all duration-150 z-10 flex items-center gap-0.5 bg-paper border border-line rounded-[var(--radius-sketch-sm)] p-0.5 shadow-md ${
                isOwn ? "left-0" : "right-0"
              }`}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onReply()
                    }}
                    className="p-1 rounded-[4px] text-ink-muted hover:text-ink hover:bg-surface-hover transition cursor-pointer"
                    aria-label="Reply"
                  >
                    <IconMessageReply size={13} stroke={2} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reply</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCopy()
                    }}
                    className="p-1 rounded-[4px] text-ink-muted hover:text-ink hover:bg-surface-hover transition cursor-pointer"
                    aria-label="Copy text"
                  >
                    <IconCopy size={13} stroke={2} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy text</p>
                </TooltipContent>
              </Tooltip>

              {canDelete && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete()
                      }}
                      className="p-1 rounded-[4px] text-ink-muted hover:text-[var(--pencil-coral)] hover:bg-[var(--pencil-coral-soft)] transition cursor-pointer"
                      aria-label="Delete"
                    >
                      <IconTrash size={13} stroke={2} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delete</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Bubble Box with organic stationery contours */}
            <div
              className={`min-w-0 px-3.5 py-2 text-xs leading-relaxed sm:text-sm text-ink transition-all duration-150 shadow-2xs ${
                status === "failed"
                  ? "rounded-[14px_11px_4px_12px] border border-[var(--pencil-coral)] bg-[var(--pencil-coral-soft)]/20"
                  : isOwn
                    ? "rounded-[14px_11px_4px_12px] border border-[var(--pencil-teal)] bg-[var(--pencil-teal-soft)]/30"
                    : "rounded-[4px_14px_12px_11px] border border-line bg-paper-subtle"
              }`}
            >
              {/* Sender Name for other users inside the bubble */}
              {!isOwn && (
                <div className="mb-1 text-[11px] font-semibold text-[var(--pencil-teal)] font-display truncate">
                  {username}
                </div>
              )}

              {/* Reply Quote Snippet */}
              {parentId && parentMessage && (
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    onJumpToParent?.()
                  }}
                  title="Jump to original message"
                  className={`group/reply mb-2 min-w-0 rounded-[var(--radius-sketch-sm)] border-l-[3px] bg-paper px-2.5 py-1.5 text-[11px] sm:text-xs transition-all duration-150 cursor-pointer shadow-2xs select-none active:scale-[0.99] ${
                    isOwn
                      ? "border-[var(--pencil-teal)] text-ink"
                      : "border-line-sketch text-ink"
                  }`}
                >
                  <div
                    className={`mb-0.5 flex items-center justify-between gap-1.5 font-semibold text-[11px] font-display ${
                      isOwn
                        ? "text-[var(--pencil-teal)]"
                        : "text-ink"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <IconMessageReply size={11} stroke={2.5} className="shrink-0" />
                      <span className="truncate">{parentMessage.username}</span>
                    </div>
                    <span className="text-[9px] opacity-0 group-hover/reply:opacity-80 transition-opacity shrink-0">Jump</span>
                  </div>
                  <div className="line-clamp-2 leading-relaxed break-words [overflow-wrap:anywhere] font-normal text-ink-muted">
                    {fallbackParentMessage}
                  </div>
                </div>
              )}

              {/* Attachments rendering */}
              {parsedAttachments.length > 0 && (
                <div className="space-y-2 mb-1.5">
                  {parsedAttachments.map((att, idx) => {
                    const isImage = att.type === "IMAGE" || att.mimeType?.startsWith("image/")
                    const isPdf = att.type === "PDF" || att.mimeType === "application/pdf" || att.name?.toLowerCase().endsWith(".pdf")

                    if (isImage) {
                      return (
                        <div
                          key={att.id || idx}
                          className="group/img relative overflow-hidden rounded-[var(--radius-sketch-sm)] border border-line bg-paper-dark cursor-zoom-in max-w-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onPreviewImage?.(att.url, att.name || "Image")
                          }}
                        >
                          <img
                            src={att.url}
                            alt={att.name || "Attachment"}
                            className="max-h-72 w-auto max-w-full rounded-[var(--radius-sketch-sm)] object-contain transition-transform duration-200 group-hover/img:scale-[1.01]"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-ink/0 group-hover/img:bg-ink/20 transition-colors flex items-end justify-end p-2 opacity-0 group-hover/img:opacity-100">
                            <span className="rounded-[var(--radius-sketch-sm)] bg-ink/80 px-2 py-1 text-[10px] text-paper font-medium flex items-center gap-1">
                              <IconPhoto size={12} />
                              Expand
                            </span>
                          </div>
                        </div>
                      )
                    }

                    if (isPdf) {
                      return (
                        <div
                          key={att.id || idx}
                          className="flex items-center gap-2.5 rounded-[var(--radius-sketch-sm)] border border-line bg-paper p-2.5 max-w-sm shadow-2xs transition hover:bg-surface-hover"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sketch-sm)] bg-[var(--pencil-coral-soft)] text-[var(--pencil-coral)] border border-[var(--pencil-coral)]/30">
                            <IconFileTypePdf size={22} stroke={1.8} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-semibold text-ink" title={att.name}>
                              {att.name || "Document.pdf"}
                            </div>
                            <div className="text-[10px] text-ink-muted font-mono">
                              {formatFileSize(att.size)} • PDF
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-[var(--radius-sketch-sm)] text-ink-muted hover:text-ink hover:bg-surface-hover transition"
                              title="Open in new tab"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <IconExternalLink size={15} />
                            </a>
                            <a
                              href={att.url}
                              download={att.name || "document.pdf"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-[var(--radius-sketch-sm)] text-ink-muted hover:text-ink hover:bg-surface-hover transition"
                              title="Download PDF"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <IconDownload size={15} />
                            </a>
                          </div>
                        </div>
                      )
                    }

                    return null
                  })}
                </div>
              )}

              {/* Message text */}
              {message?.trim() ? (
                <div className="break-words [overflow-wrap:anywhere] whitespace-pre-wrap selection:bg-[var(--pencil-teal-soft)]">
                  {message}
                </div>
              ) : parsedAttachments.length === 0 ? (
                <div className="break-words [overflow-wrap:anywhere] whitespace-pre-wrap selection:bg-[var(--pencil-teal-soft)]">
                  {fallbackMessage}
                </div>
              ) : null}

              {/* Timestamp & Delivery Status at bottom right inside the bubble */}
              <div className="mt-1 flex items-center justify-end gap-1.5 select-none">
                {status === "failed" ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--pencil-coral)] animate-in fade-in duration-150">
                    <IconAlertCircle size={13} className="shrink-0 text-[var(--pencil-coral)]" />
                    <span>Not sent</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-ink-subtle shrink-0">
                    {timestamp}
                  </span>
                )}
              </div>
            </div>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-48 rounded-[var(--radius-sketch-sm)] shadow-lg border border-line bg-paper p-1.5 z-50">
          <ContextMenuItem onSelect={onReply} className="gap-2.5 cursor-pointer py-1.5 text-xs font-medium">
            <IconMessageReply size={15} className="text-[var(--pencil-teal)]" />
            <span>Reply</span>
          </ContextMenuItem>
          <ContextMenuItem onSelect={handleCopy} className="gap-2.5 cursor-pointer py-1.5 text-xs font-medium">
            <IconCopy size={15} className="text-ink-muted" />
            <span>Copy text</span>
          </ContextMenuItem>
          {canDelete && (
            <>
              <ContextMenuSeparator className="my-1" />
              <ContextMenuItem
                onSelect={onDelete}
                className="gap-2.5 text-[var(--pencil-coral)] focus:text-[var(--pencil-coral)] focus:bg-[var(--pencil-coral-soft)] cursor-pointer py-1.5 text-xs font-medium"
              >
                <IconTrash size={15} />
                <span>Delete message</span>
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    </div>
  )
}

function DialogEditRoom({ room }: { room: RoomRecord }) {
  const user = useAppStore((s) => s.user)
  const isOwner = Boolean(
    user?.id &&
    (room.creatorId === user.id ||
      room.members.find((m) => m.userId === user.id)?.role === "OWNER")
  )
  const { updateRoom: updateRoomRequest, deleteRoom: deleteRoomRequest } =
    useRooms()
  const [open, setOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<1 | 2>(1)

  const [name, setName] = useState(room.name)
  const [description, setDescription] = useState(room.description ?? "")
  const [isPrivate, setIsPrivate] = useState(Boolean(room.isPrivate))
  const [avatarUrl, setAvatarUrl] = useState<string | null>(room.avatarUrl ?? null)
  const [selectedTopics, setSelectedTopics] = useState<string[]>(room.topics ?? [])
  const [topicInput, setTopicInput] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setStep(1)
    setName(room.name)
    setDescription(room.description ?? "")
    setIsPrivate(Boolean(room.isPrivate))
    setAvatarUrl(room.avatarUrl ?? null)
    setSelectedTopics(room.topics ?? [])
    setTopicInput("")
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [room.id, room.name, room.description, room.isPrivate, room.avatarUrl, room.topics, open])

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

  async function handleUpdateRoom() {
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

    setIsSubmitting(true)
    setError(null)

    try {
      const payload: EditRoomRequest["body"] = {
        name: name.trim(),
        description: description.trim() || undefined,
        avatarUrl,
        topics: selectedTopics,
        isPrivate,
      }
      const updatedRoom = await updateRoomRequest(room.id, payload)

      useAppStore.getState().upsertRoom(updatedRoom)
      setOpen(false)
      toast.success("Channel updated", toastOptions)
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.error ??
          err.response?.data?.message ??
          "Unable to update channel")
        : "Unable to update channel"

      setError(message)
      toast.error(message, toastOptions)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleOpenDeleteConfirmation() {
    setOpen(false)
    window.requestAnimationFrame(() => {
      setConfirmDeleteOpen(true)
    })
  }

  async function handleDeleteRoom() {
    if (isDeleting) {
      return
    }

    setIsDeleting(true)

    try {
      await deleteRoomRequest(room.id)
      const { clearMessages, removeRoom } = useAppStore.getState()

      clearMessages(room.id)
      removeRoom(room.id)
      setConfirmDeleteOpen(false)
      toast.success("Channel deleted", toastOptions)
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ??
          error.response?.data?.message ??
          "Unable to delete channel")
        : "Unable to delete channel"

      toast.error(message, toastOptions)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(val) => {
          setOpen(val)
          if (!val) {
            setStep(1)
            setName(room.name)
            setDescription(room.description ?? "")
            setIsPrivate(Boolean(room.isPrivate))
            setAvatarUrl(room.avatarUrl ?? null)
            setSelectedTopics(room.topics ?? [])
            setTopicInput("")
            setError(null)
            if (fileInputRef.current) {
              fileInputRef.current.value = ""
            }
          }
        }}
      >
        <DialogTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-center rounded-[var(--radius-sketch-sm)] p-1.5 text-ink-muted transition-all duration-150 hover:bg-surface-hover hover:text-ink active:scale-95 cursor-pointer"
            aria-label="Edit channel"
          >
            <IconDotsVertical size={18} stroke={2} />
          </button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden rounded-[var(--radius-sketch-md)]">
          <DialogHeader className="px-5 pt-3.5 pb-2.5 border-b border-line shrink-0 pr-12">
            <DialogTitle className="font-display text-base font-semibold">
              Edit Channel
            </DialogTitle>
            <DialogDescription className="sr-only">
              Edit channel details
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 py-3.5 space-y-3.5 scrollbar-thin">
            {step === 1 ? (
              <>
                {/* Avatar Section */}
                <div className="flex flex-col items-center justify-center gap-1.5 pb-0.5">
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
                    className="group relative cursor-pointer rounded-full outline-none focus:ring-2 focus:ring-[var(--pencil-teal)] transition-all"
                    title="Click to choose channel image"
                  >
                    <Avatar className="h-14 w-14 border-2 border-line group-hover:border-[var(--pencil-teal)] shadow-sm transition-colors">
                      <AvatarImage src={avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-paper-dark text-base font-bold text-ink-muted group-hover:text-ink transition-colors">
                        <IconPhoto size={24} />
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity">
                      <IconPhoto size={20} className="text-white drop-shadow" />
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
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      if (error) setError(null)
                    }}
                    placeholder="channel-name"
                    className="h-8.5 w-full rounded-[var(--radius-sketch-sm)] border border-line bg-paper px-3 text-xs text-ink placeholder:text-ink-subtle outline-none focus:border-[var(--pencil-teal)] focus:ring-1 focus:ring-[var(--pencil-teal-soft)] transition-all"
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
                    placeholder="What this channel is for"
                    className="h-8.5 w-full rounded-[var(--radius-sketch-sm)] border border-line bg-paper px-3 text-xs text-ink placeholder:text-ink-subtle outline-none focus:border-[var(--pencil-teal)] focus:ring-1 focus:ring-[var(--pencil-teal-soft)] transition-all"
                  />
                </div>

                {/* Visibility */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink font-display">
                    Channel Visibility
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs font-medium text-ink cursor-pointer">
                      <input
                        type="radio"
                        name="edit-room-visibility"
                        checked={!isPrivate}
                        onChange={() => setIsPrivate(false)}
                        className="accent-[var(--pencil-teal)] cursor-pointer"
                      />
                      Public
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-ink cursor-pointer">
                      <input
                        type="radio"
                        name="edit-room-visibility"
                        checked={isPrivate}
                        onChange={() => setIsPrivate(true)}
                        className="accent-[var(--pencil-teal)] cursor-pointer"
                      />
                      Private
                    </label>
                  </div>
                </div>

                {/* Topics Preview & Edit Topics Button */}
                <div className="space-y-1.5 rounded-[var(--radius-sketch-sm)] border border-line bg-paper-subtle/30 p-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-ink font-display flex items-center gap-1.5">
                      <IconHash size={14} className="text-[var(--pencil-teal)]" />
                      <span>Channel Topics</span>
                      <span className="text-[var(--pencil-coral)] text-xs">*</span>
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!name.trim()) {
                          setError("Channel name is required")
                          return
                        }
                        setError(null)
                        setStep(2)
                      }}
                      className="h-6 px-2.5 text-[11px] font-medium border-line text-ink hover:border-[var(--pencil-teal)] hover:text-[var(--pencil-teal)] rounded-[var(--radius-sketch-sm)] cursor-pointer"
                    >
                      Edit Topics
                    </Button>
                  </div>

                  {selectedTopics.length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto scrollbar-ultra-thin">
                      {selectedTopics.map((topic) => (
                        <span
                          key={topic}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-sketch-sm)] text-[10px] font-semibold bg-[var(--pencil-teal)] text-white shadow-2xs"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[var(--pencil-coral)] font-medium">
                      No topics selected. Minimum 1 topic is required.
                    </p>
                  )}
                </div>

                {error && (
                  <p className="text-xs text-[var(--pencil-coral)] font-medium">
                    {error}
                  </p>
                )}

                {/* Actions on Step 1 */}
                <div className="space-y-2 pt-1">
                  <Button
                    type="button"
                    disabled={isSubmitting || !name.trim() || selectedTopics.length === 0}
                    onClick={() => void handleUpdateRoom()}
                    className="w-full h-8.5 rounded-[var(--radius-sketch-sm)] bg-[var(--pencil-teal)] hover:bg-[var(--pencil-teal)]/90 text-white font-semibold text-xs shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? "Saving..." : "Save"}
                  </Button>
                  {selectedTopics.length === 0 && (
                    <p className="text-[10px] text-center text-[var(--pencil-coral)] font-medium">
                      At least one topic is required before saving. Click "Edit Topics" above.
                    </p>
                  )}
                  {isOwner && (
                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full h-8 text-xs rounded-[var(--radius-sketch-sm)] cursor-pointer"
                      onClick={handleOpenDeleteConfirmation}
                    >
                      Delete channel
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Step 2: Topics Update */}
                <div className="space-y-3">
                  {/* Selected Topics List */}
                  {selectedTopics.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-ink-subtle block">
                        Selected topics ({selectedTopics.length})
                      </span>
                      <div className="flex flex-wrap gap-1 p-1.5 rounded-[var(--radius-sketch-sm)] border border-line/60 bg-paper max-h-24 overflow-y-auto scrollbar-ultra-thin">
                        {selectedTopics.map((topic) => (
                          <span
                            key={topic}
                            className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-[var(--radius-sketch-sm)] text-[11px] font-semibold bg-[var(--pencil-teal)] text-white shadow-2xs"
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
                        placeholder="Type topic name (e.g. dev, design)..."
                        className="h-8 flex-1 px-3 rounded-[var(--radius-sketch-sm)] border border-line bg-paper text-xs text-ink placeholder:text-ink-subtle outline-none focus:border-[var(--pencil-teal)] focus:ring-1 focus:ring-[var(--pencil-teal-soft)] transition-all"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddTopic()}
                        disabled={!topicInput.trim()}
                        className="h-8 px-3 text-xs font-medium border-line text-ink hover:border-[var(--pencil-teal)] hover:text-[var(--pencil-teal)] rounded-[var(--radius-sketch-sm)] cursor-pointer disabled:opacity-40 shrink-0"
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
                              ? "bg-[var(--pencil-teal)] text-white shadow-2xs font-semibold"
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
                    className="flex-1 h-8.5 rounded-[var(--radius-sketch-sm)] border-line text-xs font-semibold cursor-pointer"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleUpdateRoom()}
                    disabled={isSubmitting || selectedTopics.length === 0 || !name.trim()}
                    className="flex-1 h-8.5 rounded-[var(--radius-sketch-sm)] bg-[var(--pencil-teal)] hover:bg-[var(--pencil-teal)]/90 text-white font-semibold text-xs shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? "Saving..." : "Save"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-md rounded-[var(--radius-sketch-md)]">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-ink">Delete Channel?</DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              This will permanently delete #{room.name} and its messages. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-[var(--radius-sketch-sm)] text-xs"
              onClick={() => setConfirmDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1 rounded-[var(--radius-sketch-sm)] text-xs font-semibold"
              onClick={() => void handleDeleteRoom()}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Confirm delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function RoomMembersPanel({
  room,
  currentUserId,
  canManageRoom,
  onShowChat,
}: {
  room: RoomRecord
  currentUserId: string | null
  canManageRoom: boolean
  onShowChat: () => void
}) {
  const isMember = currentUserId
    ? room.members.some((member) => member.userId === currentUserId)
    : false

  const {
    addMembers: addMembersRequest,
    removeMember: removeMemberRequest,
    getPendingJoinRequests: getPendingJoinRequestsRequest,
    respondJoinRequest: respondJoinRequestRequest,
    leaveRoom: leaveRoomRequest,
    updateMemberRole: updateMemberRoleRequest,
  } = useRooms()

  const pendingRequests = useAppStore(
    (s) => s.joinRequests[room.id] ?? EMPTY_JOIN_REQUESTS
  )
  const setStoreJoinRequests = useAppStore((s) => s.setJoinRequests)
  const removeStoreJoinRequest = useAppStore((s) => s.removeJoinRequest)

  const [addMembersOpen, setAddMembersOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<RoomMemberRecord | null>(
    null
  )
  const [transferTarget, setTransferTarget] = useState<RoomMemberRecord | null>(
    null
  )
  const [isTransferring, setIsTransferring] = useState(false)
  const [updatingRoleMemberId, setUpdatingRoleMemberId] = useState<string | null>(
    null
  )
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [isLoadingPending, setIsLoadingPending] = useState(false)
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(
    null
  )
  const [usernamesInput, setUsernamesInput] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  const currentMember = room.members.find((m) => m.userId === currentUserId)
  const isActorSuperAdmin = Boolean(
    currentUserId &&
    (currentMember?.role === "OWNER" || room.creatorId === currentUserId)
  )
  const isActorAdmin = Boolean(
    currentUserId && currentMember?.role === "ADMIN"
  )
  const otherMembers = room.members.filter((m) => m.userId !== currentUserId)
  const cannotLeaveAsSuperAdmin = isActorSuperAdmin && otherMembers.length > 0

  async function handleUpdateMemberRole(
    member: RoomMemberRecord,
    newRole: "ADMIN" | "MEMBER"
  ) {
    if (updatingRoleMemberId) return
    setUpdatingRoleMemberId(member.id)
    try {
      const updatedRoom = await updateMemberRoleRequest(room.id, member.id, newRole)
      if (updatedRoom) {
        useAppStore.getState().upsertRoom(updatedRoom)
      }
      const displayName = member.user?.username ?? "user"
      toast.success(
        newRole === "ADMIN"
          ? `Assigned @${displayName} as admin`
          : `Demoted @${displayName} to member`,
        toastOptions
      )
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.error ?? err.response?.data?.message ?? "Unable to update member role")
        : "Unable to update member role"
      toast.error(msg, toastOptions)
    } finally {
      setUpdatingRoleMemberId(null)
    }
  }

  async function handleTransferSuperAdmin() {
    if (!transferTarget || isTransferring) return
    setIsTransferring(true)
    try {
      const updatedRoom = await updateMemberRoleRequest(room.id, transferTarget.id, "OWNER")
      if (updatedRoom) {
        useAppStore.getState().upsertRoom(updatedRoom)
      }
      const displayName = transferTarget.user?.username ?? "user"
      toast.success(`Transferred Super Admin to @${displayName}`, toastOptions)
      setTransferTarget(null)
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.error ?? err.response?.data?.message ?? "Unable to transfer ownership")
        : "Unable to transfer ownership"
      toast.error(msg, toastOptions)
    } finally {
      setIsTransferring(false)
    }
  }

  useEffect(() => {
    if (!canManageRoom || !currentUserId) {
      return
    }

    let isCancelled = false

    const fetchPendingRequests = async () => {
      setIsLoadingPending(true)

      try {
        const requests = await getPendingJoinRequestsRequest(
          room.id,
          currentUserId
        )

        if (!isCancelled) {
          setStoreJoinRequests(room.id, requests)
        }
      } catch (error) {
        if (!isCancelled) {
          const message = axios.isAxiosError(error)
            ? (error.response?.data?.error ??
              error.response?.data?.message ??
              "Unable to load join requests")
            : "Unable to load join requests"

          toast.error(message, toastOptions)
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingPending(false)
        }
      }
    }

    void fetchPendingRequests()

    return () => {
      isCancelled = true
    }
  }, [canManageRoom, currentUserId, getPendingJoinRequestsRequest, room.id, setStoreJoinRequests])

  async function handleAddMembers() {
    const usernames = usernamesInput
      .split(/[,\n\s]+/)
      .map((username) => username.trim().replace(/^@+/, ""))
      .filter(Boolean)
    const uniqueUsernames = [...new Set(usernames)]

    if (!uniqueUsernames.length || isAdding) {
      return
    }

    setIsAdding(true)

    try {
      const payload: AddRoomMembersRequest["body"]["usernames"] =
        uniqueUsernames
      const { room: updatedRoom, addedCount } = await addMembersRequest(
        room.id,
        payload
      )

      useAppStore.getState().upsertRoom(updatedRoom)
      setUsernamesInput("")
      setAddMembersOpen(false)
      toast.success(
        addedCount > 0
          ? `${addedCount} member(s) added`
          : "Members already exist",
        toastOptions
      )
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ??
          error.response?.data?.message ??
          "Unable to add members")
        : "Unable to add members"

      toast.error(message, toastOptions)
    } finally {
      setIsAdding(false)
    }
  }

  async function handleRemoveMember() {
    if (!removeTarget || isRemoving) {
      return
    }

    setIsRemoving(true)

    try {
      const { room: updatedRoom } = await removeMemberRequest(
        room.id,
        removeTarget.id
      )
      useAppStore.getState().upsertRoom(updatedRoom)
      setRemoveTarget(null)
      toast.success("Member removed", toastOptions)
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ??
          error.response?.data?.message ??
          "Unable to remove member")
        : "Unable to remove member"

      toast.error(message, toastOptions)
    } finally {
      setIsRemoving(false)
    }
  }

  async function handleRespondJoinRequest(requestId: string, approve: boolean) {
    if (!currentUserId || processingRequestId) {
      return
    }

    setProcessingRequestId(requestId)

    try {
      const result = await respondJoinRequestRequest(room.id, requestId, {
        actorUserId: currentUserId,
        approve,
      })

      if (result.room) {
        useAppStore.getState().upsertRoom(result.room)
      }

      removeStoreJoinRequest(room.id, requestId)
      toast.success(
        approve ? "Join request approved" : "Join request rejected",
        toastOptions
      )
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ??
          error.response?.data?.message ??
          "Unable to process join request")
        : "Unable to process join request"

      toast.error(message, toastOptions)
    } finally {
      setProcessingRequestId(null)
    }
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="shrink-0 flex items-center justify-between border-b border-line px-3 py-2 sm:px-4 bg-paper-subtle">
          <div className="font-display flex items-center gap-2 text-sm font-semibold text-ink">
            <IconUsers size={16} />
            Members ({room.members.length})
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onShowChat}
              className="rounded-[var(--radius-sketch-sm)] text-xs h-7.5"
            >
              Show chat
            </Button>
            {canManageRoom && (
              <Button
                type="button"
                size="sm"
                className="h-7.5 rounded-[var(--radius-sketch-sm)] text-xs"
                onClick={() => setAddMembersOpen(true)}
              >
                <IconUserPlus size={14} className="mr-1" />
                Add member
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-full w-full min-h-0 flex-1">
          <div className="space-y-2 px-3 py-2 sm:px-4">
            {canManageRoom && (
              <div className="rounded-[var(--radius-sketch-sm)] border border-line bg-paper-subtle p-2">
                <div className="font-display mb-2 text-xs font-semibold text-ink-muted">
                  Pending join requests
                </div>

                {isLoadingPending && (
                  <div className="text-xs text-ink-muted">
                    Loading requests...
                  </div>
                )}

                {!isLoadingPending && pendingRequests.length === 0 && (
                  <div className="text-xs text-ink-muted">
                    No pending requests
                  </div>
                )}

                {!isLoadingPending &&
                  pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="mb-2 flex items-center justify-between rounded-[var(--radius-sketch-sm)] border border-line bg-paper px-2 py-1.5 last:mb-0"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={request.user?.avatarUrl ?? undefined}
                            alt={request.user?.username ?? "User"}
                          />
                          <AvatarFallback className="text-xs font-semibold">
                            {request.user?.username?.[0] ?? "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="truncate text-xs text-ink font-medium">
                          {request.user?.username ?? "Unknown user"}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs rounded-[var(--radius-sketch-sm)]"
                          disabled={processingRequestId === request.id}
                          onClick={() =>
                            void handleRespondJoinRequest(request.id, false)
                          }
                        >
                          Reject
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 px-2 text-xs rounded-[var(--radius-sketch-sm)] font-semibold"
                          disabled={processingRequestId === request.id}
                          onClick={() =>
                            void handleRespondJoinRequest(request.id, true)
                          }
                        >
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {room.members.map((member) => {
              const displayName = member.user?.username ?? member.user?.name ?? "Unknown user"
              const isSelf = member.userId === currentUserId
              const isTargetSuperAdmin =
                member.role === "OWNER" || room.creatorId === member.userId
              const isTargetAdmin = !isTargetSuperAdmin && member.role === "ADMIN"
              const isTargetMember = !isTargetSuperAdmin && !isTargetAdmin

              const canMakeAdmin =
                (isActorSuperAdmin || isActorAdmin) && isTargetMember && !isSelf
              const canDemoteAdmin =
                isActorSuperAdmin && isTargetAdmin && !isSelf
              const canTransferSuperAdmin =
                isActorSuperAdmin && !isTargetSuperAdmin && !isSelf
              const canRemove =
                !isSelf &&
                !isTargetSuperAdmin &&
                (isActorSuperAdmin || (isActorAdmin && isTargetMember))

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-[var(--radius-sketch-sm)] border border-line bg-paper px-2.5 py-1.5 gap-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage
                        src={member.user?.avatarUrl ?? undefined}
                        alt={displayName}
                      />
                      <AvatarFallback className="text-xs font-semibold">
                        {displayName[0] ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-semibold text-ink">
                          {displayName}
                        </span>
                        {isSelf && (
                          <span className="text-[10px] text-ink-subtle font-normal">
                            (you)
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5">
                        {isTargetSuperAdmin ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-[var(--pencil-yellow-soft)] text-[var(--pencil-yellow)] border border-[var(--pencil-yellow)]/40">
                            <IconCrown size={10} stroke={2.5} />
                            <span>Super Admin</span>
                          </span>
                        ) : isTargetAdmin ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-[var(--pencil-blue-soft)] text-[var(--pencil-blue)] border border-[var(--pencil-blue)]/40">
                            <IconShieldCheck size={10} stroke={2.5} />
                            <span>Admin</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-ink-muted">Member</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {canMakeAdmin && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-6 px-1.5 text-[10px] font-medium rounded-[var(--radius-sketch-sm)] border border-[var(--pencil-teal)]/40 bg-paper hover:bg-[var(--pencil-teal-soft)] text-[var(--pencil-teal)] hover:border-[var(--pencil-teal)] cursor-pointer"
                        title="Make Admin"
                        disabled={updatingRoleMemberId === member.id}
                        onClick={() => void handleUpdateMemberRole(member, "ADMIN")}
                      >
                        <IconShieldCheck size={12} className="mr-1" />
                        <span>{updatingRoleMemberId === member.id ? "..." : "Make Admin"}</span>
                      </Button>
                    )}

                    {canDemoteAdmin && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-6 px-1.5 text-[10px] font-medium rounded-[var(--radius-sketch-sm)] border border-line text-ink-muted hover:text-ink hover:bg-surface-hover cursor-pointer"
                        title="Demote to Member"
                        disabled={updatingRoleMemberId === member.id}
                        onClick={() => void handleUpdateMemberRole(member, "MEMBER")}
                      >
                        <IconArrowDown size={12} className="mr-0.5" />
                        <span>{updatingRoleMemberId === member.id ? "..." : "Demote"}</span>
                      </Button>
                    )}

                    {canTransferSuperAdmin && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-6 px-1.5 text-[10px] font-medium rounded-[var(--radius-sketch-sm)] border border-[var(--pencil-yellow)]/50 bg-[var(--pencil-yellow-soft)]/20 hover:bg-[var(--pencil-yellow-soft)] text-[var(--pencil-yellow)] cursor-pointer"
                        title="Transfer Super Admin ownership"
                        onClick={() => setTransferTarget(member)}
                      >
                        <IconCrown size={11} className="mr-1" stroke={2.5} />
                        <span>Make Super Admin</span>
                      </Button>
                    )}

                    {canRemove && (
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        className="text-[var(--pencil-coral)] hover:text-[var(--pencil-coral)] hover:bg-[var(--pencil-coral-soft)] cursor-pointer"
                        title="Remove member"
                        onClick={() => setRemoveTarget(member)}
                      >
                        <IconUserMinus size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}

            {isMember && (
              <div className="pt-3 pb-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full rounded-[var(--radius-sketch-sm)] text-[var(--pencil-coral)] hover:text-[var(--pencil-coral)] hover:bg-[var(--pencil-coral-soft)] border-[var(--pencil-coral)]/30 cursor-pointer"
                  onClick={() => setConfirmLeaveOpen(true)}
                >
                  <IconLogout size={14} className="mr-2" />
                  Leave Channel
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <DialogAddMembers
        room={room}
        open={addMembersOpen}
        onOpenChange={setAddMembersOpen}
      />

      <Dialog
        open={Boolean(transferTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setTransferTarget(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-[var(--radius-sketch-md)]">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-ink">
              Transfer Super Admin?
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-muted leading-relaxed">
              Are you sure you want to make @{transferTarget?.user?.username ?? "this member"} the Super Admin of #{room.name}? You will automatically become an Admin. Each room must always have exactly one Super Admin.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-[var(--radius-sketch-sm)] text-xs"
              onClick={() => setTransferTarget(null)}
              disabled={isTransferring}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1 rounded-[var(--radius-sketch-sm)] text-xs font-semibold bg-[var(--pencil-yellow)] hover:bg-[var(--pencil-yellow)]/90 text-white shadow-2xs"
              disabled={isTransferring}
              onClick={() => void handleTransferSuperAdmin()}
            >
              {isTransferring ? "Transferring..." : "Confirm Transfer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmLeaveOpen}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmLeaveOpen(false)
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-[var(--radius-sketch-md)]">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-ink">Leave Channel?</DialogTitle>
            {cannotLeaveAsSuperAdmin ? (
              <div className="rounded-[var(--radius-sketch-sm)] border border-[var(--pencil-coral)]/40 bg-[var(--pencil-coral-soft)]/30 p-2.5 text-xs text-[var(--pencil-coral)] leading-relaxed">
                You are the Super Admin of this channel. You cannot leave without assigning another Super Admin first, or you must delete the channel.
              </div>
            ) : (
              <DialogDescription className="text-xs text-ink-muted">
                Are you sure you want to leave #{room.name}? You will need to rejoin to access messages if it is private.
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-[var(--radius-sketch-sm)] text-xs"
              onClick={() => setConfirmLeaveOpen(false)}
              disabled={isLeaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1 rounded-[var(--radius-sketch-sm)] text-xs font-semibold"
              disabled={isLeaving || cannotLeaveAsSuperAdmin}
              onClick={async () => {
                if (isLeaving || cannotLeaveAsSuperAdmin) return
                setIsLeaving(true)
                try {
                  await leaveRoomRequest(room.id, currentUserId ?? undefined)
                  wsClient.leaveRoom(room.id)
                  useAppStore.getState().clearMessages(room.id)
                  useAppStore.getState().removeRoom(room.id)
                  useAppStore.getState().setActiveRoom(null)
                  setConfirmLeaveOpen(false)
                  onShowChat()
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
              }}
            >
              {isLeaving ? "Leaving..." : "Confirm leave"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveTarget(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-[var(--radius-sketch-md)]">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-ink">Remove member?</DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              Remove {removeTarget?.user?.username ?? "this member"} from this
              channel?
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-[var(--radius-sketch-sm)] text-xs"
              onClick={() => setRemoveTarget(null)}
              disabled={isRemoving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1 rounded-[var(--radius-sketch-sm)] text-xs font-semibold"
              onClick={() => void handleRemoveMember()}
              disabled={isRemoving}
            >
              {isRemoving ? "Removing..." : "Confirm remove"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
