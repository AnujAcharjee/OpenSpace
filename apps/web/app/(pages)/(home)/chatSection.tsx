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
  CreateMessageInput,
  EditRoomRequest,
  RoomJoinRequestRecord,
  RoomMemberRecord,
  RoomRecord,
} from "@repo/validation"
import axios from "axios"
import type { RoomMessage } from "@/stores/app-store"
import { useRooms } from "@/hooks/useRooms"
import { type ChatHistoryMessage } from "@/hooks/useMessage"
import { z } from "zod"
import { useChatSection } from "@/hooks/useChatSection"
import { DialogAddMembers } from "@/components/DialogAddMembers"
import { EmojiPicker } from "@/components/EmojiPicker"

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

const EMPTY_ROOM_MESSAGES: RoomMessage[] = []
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
      el.classList.add("ring-2", "ring-primary/60", "bg-primary/10", "rounded-xl")
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-primary/60", "bg-primary/10", "rounded-xl")
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

  if (!room) {
    if (!user) {
      return (
        <div className="h-full w-full p-1.5">
          <Card className="flex h-full w-full flex-col items-center justify-center border border-border/40 bg-card/40 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] p-6 text-center">
            <div className="flex flex-col items-center max-w-md space-y-6">
              <div className="relative flex items-center justify-center py-4">
                <div className="pointer-events-none absolute -inset-6 rounded-full bg-[radial-gradient(circle,rgba(244,208,63,0.15)_0%,rgba(212,175,55,0.05)_55%,transparent_70%)] blur-2xl" />
                <AppIcon size="lg" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Welcome to OpenSpace
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Discover conversations, join public communities, and connect through real-time text, voice, and video.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-11 px-8 rounded-xl font-semibold shadow-[0_0_20px_rgba(244,187,68,0.25)] hover:shadow-[0_0_25px_rgba(244,187,68,0.45)] cursor-pointer"
                  onClick={() => router.push("/signin")}
                >
                  Sign in
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-3 w-full pt-4 border-t border-border/40 text-center">
                <div className="flex flex-col items-center space-y-1">
                  <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                    <IconBolt size={14} className="text-[#d4af37]" />
                    <span>Real-time</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">Instant messaging</div>
                </div>
                <div className="flex flex-col items-center space-y-1">
                  <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                    <IconShieldCheck size={14} className="text-[#d4af37]" />
                    <span>Protected</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">Pramaan Auth</div>
                </div>
                <div className="flex flex-col items-center space-y-1">
                  <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                    <IconHash size={14} className="text-[#d4af37]" />
                    <span>Channels</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">Public & Private</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )
    }

    return (
      <div className="h-full w-full p-1.5">
        <Card className="flex h-full w-full flex-col items-center justify-center border border-border/40 bg-card/40 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] p-6 text-center">
          <div className="flex flex-col items-center max-w-sm space-y-4">
            <div className="relative flex items-center justify-center py-2">
              <div className="pointer-events-none absolute -inset-6 rounded-full bg-[radial-gradient(circle,rgba(244,208,63,0.10)_0%,rgba(212,175,55,0.03)_55%,transparent_70%)] blur-xl" />
              <AppIcon size="lg" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Welcome to OpenSpace{user?.name ? `, ${user.name}` : user?.username ? `, ${user.username}` : ""}!
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Select a channel from the sidebar or search above to start collaborating.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 w-full pt-4 border-t border-border/40 text-left">
              <div className="flex items-start gap-2.5 rounded-xl border border-border/50 bg-muted/40 p-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                  <IconSearch size={14} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">Discover Channels</div>
                  <div className="text-[10px] text-muted-foreground">Search and join conversations</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-border/50 bg-muted/40 p-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                  <IconPlus size={14} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">Create Channel</div>
                  <div className="text-[10px] text-muted-foreground">Start your own community</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 pt-1 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <IconMessageCircle size={13} className="text-[#d4af37]" /> Text Chat
              </span>
              <span className="flex items-center gap-1">
                <IconMicrophone size={13} className="text-[#d4af37]" /> Voice Rooms
              </span>
              <span className="flex items-center gap-1">
                <IconVideo size={13} className="text-[#d4af37]" /> Video Calls
              </span>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-full w-full p-1.5">
      <Card className="flex h-full w-full flex-col gap-0 border border-border/70 dark:border-border/40 bg-white/95 dark:bg-card/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-md rounded-2xl p-0 overflow-hidden">
        <CardHeader className="shrink-0 flex items-center gap-2 border-b border-border/60 dark:border-border/50 bg-white/80 dark:bg-card/40 px-3 py-3 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setActiveRoom(null)}
            className="group flex items-center justify-center rounded-lg p-1 text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground active:scale-95 cursor-pointer"
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
            className="rounded-lg transition hover:bg-muted/60 cursor-pointer"
            aria-label="View channel members"
          >
            <Avatar className="h-8 w-8 shrink-0 border border-border">
              <AvatarImage src={room.avatarUrl ?? undefined} alt={room.name} />
              <AvatarFallback className="text-xs font-semibold">
                {room.name[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>

          <button
            type="button"
            onClick={toggleMembersPanel}
            className="min-w-0 flex-1 rounded-lg px-1 py-0.5 text-left transition hover:bg-muted/60 cursor-pointer"
            aria-label="View channel members"
          >
            <div className="text-md truncate tracking-wide text-foreground">
              {room.name}
            </div>
            {room.description?.trim() && (
              <div className="truncate text-xs text-muted-foreground">
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
              className="h-7 px-2.5 text-xs font-semibold text-primary border-primary/40 bg-primary/10 hover:bg-primary/20 rounded-lg cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span>
                {pendingRequests.length} {pendingRequests.length === 1 ? "Request" : "Requests"}
              </span>
            </Button>
          )}

          {canManageRoom && <DialogEditRoom key={room.id} room={room} />}
        </CardHeader>

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
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-2xl bg-background/85 backdrop-blur-xs border-2 border-dashed border-primary animate-in fade-in duration-150">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 text-primary shadow-lg animate-bounce">
                    <IconPhoto size={30} stroke={2} />
                  </div>
                  <div className="mt-3 text-sm font-semibold text-foreground">Drop file to attach</div>
                  <div className="text-xs text-muted-foreground">Supports all images and PDF documents</div>
                </div>
              )}

              {canManageRoom && pendingRequests.length > 0 && (
                <div className="shrink-0 mx-3 mt-2 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-foreground backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center gap-2">
                    <IconUsers size={14} className="text-primary shrink-0" />
                    <span className="font-medium text-[11px] sm:text-xs">
                      {pendingRequests.length} pending join {pendingRequests.length === 1 ? "request" : "requests"}
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs font-semibold text-primary hover:bg-primary/20 cursor-pointer"
                    onClick={toggleMembersPanel}
                  >
                    Review requests
                  </Button>
                </div>
              )}

              <ScrollArea className="h-full w-full min-h-0 flex-1">
                <div className="space-y-2 px-3 py-2 sm:px-4">
                  {isLoading && (
                    <div className="text-center text-sm text-muted-foreground py-4">
                      Loading messages...
                    </div>
                  )}
                  {!isLoading && roomMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center select-none space-y-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 border border-border/40 text-muted-foreground mb-1">
                        <IconMessageReply size={22} className="opacity-70" />
                      </div>
                      <div className="text-sm font-semibold text-foreground">No messages yet</div>
                      <div className="text-xs text-muted-foreground max-w-xs">Be the first to start the conversation.</div>
                    </div>
                  )}
                {roomMessages.map((message) => {
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

        {!showMembersPanel && (
          <CardFooter className="shrink-0 flex gap-2 px-3 py-3 border-t border-border/60 dark:border-border/40 bg-white/80 dark:bg-card/40 backdrop-blur-sm">
            {!user ? (
              <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/40 px-4 py-2.5">
                <span className="text-xs text-muted-foreground">
                  Access unavailable. You need to sign in to use chat.
                </span>
                <Button
                  size="sm"
                  className="h-8 shrink-0 rounded-lg px-3 text-xs font-semibold cursor-pointer"
                  onClick={() => router.push("/signin")}
                >
                  Sign In
                </Button>
              </div>
            ) : user && !room.members.some((m) => m.userId === user.id) ? (
              <div className="flex w-full max-w-xl mx-auto items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                <IconAlertCircle size={16} className="shrink-0" />
                <span>You have been removed from this channel. You can no longer send messages.</span>
              </div>
            ) : (
              <form
                className="flex w-full max-w-xl mx-auto items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  void sendMessage()
                }}
              >
                <div className="relative flex flex-1 flex-col gap-1.5">
                  <EmojiPicker
                    isOpen={showEmojiPicker}
                    onClose={() => setShowEmojiPicker(false)}
                    onSelectEmoji={(emoji) => {
                      setDraft((prev) => prev + emoji)
                    }}
                  />

                  {/* Staged Attachment Preview Bar */}
                  {stagedAttachment && (
                    <div className="relative flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-card/95 dark:bg-card/90 shadow-md backdrop-blur-md px-3 py-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {stagedAttachment.type === "IMAGE" ? (
                          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted/40 shadow-xs">
                            <img
                              src={stagedAttachment.previewUrl}
                              alt={stagedAttachment.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20 shadow-xs">
                            <IconFileTypePdf size={22} stroke={1.8} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-xs font-semibold text-foreground">
                              {stagedAttachment.name}
                            </span>
                            <span className="shrink-0 rounded bg-muted/80 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                              {formatFileSize(stagedAttachment.size)}
                            </span>
                          </div>
                          {isSending ? (
                            <div className="mt-1 space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-primary font-medium">
                                <span>Uploading attachment...</span>
                                <span>{uploadProgress}%</span>
                              </div>
                              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full bg-primary transition-all duration-200"
                                  style={{ width: `${uploadProgress}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="text-[11px] text-muted-foreground">
                              Ready to send — add caption or click send
                            </div>
                          )}
                        </div>
                      </div>
                      {!isSending && (
                        <button
                          type="button"
                          onClick={clearStagedAttachment}
                          className="rounded-lg p-1.5 text-muted-foreground transition-all duration-150 hover:bg-muted/80 hover:text-foreground hover:rotate-90 active:scale-95 cursor-pointer shrink-0"
                          title="Remove attachment"
                          aria-label="Remove attachment"
                        >
                          <IconX size={15} />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Modern Glassmorphic Reply Banner */}
                  {replyingTo && (
                    <div className="flex items-center justify-between gap-2.5 rounded-xl border border-primary/40 bg-card/95 dark:bg-card/90 shadow-md backdrop-blur-md px-3 py-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-xs">
                          <IconMessageReply size={14} stroke={2.5} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                            <span>Replying to</span>
                            <span className="truncate">@{getAuthorName(replyingTo)}</span>
                          </div>
                          <div className="line-clamp-1 text-[11px] text-muted-foreground/90 font-normal">
                            {getMessageBody(replyingTo)}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearReply}
                        className="rounded-lg p-1.5 text-muted-foreground transition-all duration-150 hover:bg-muted/80 hover:text-foreground hover:rotate-90 active:scale-95 cursor-pointer shrink-0"
                        title="Cancel reply (Esc)"
                        aria-label="Cancel reply"
                      >
                        <IconX size={15} />
                      </button>
                    </div>
                  )}

                  <InputGroup className="h-9.5 w-full border border-primary/40 bg-background/90 shadow-xs backdrop-blur-sm rounded-xl">
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
                      onPaste={handlePaste}
                      placeholder={
                        !user
                          ? "Sign in to send messages"
                          : !room.members.some((m) => m.userId === user.id)
                            ? "You cannot send messages to this channel"
                            : replyingTo
                              ? `Reply to @${getAuthorName(replyingTo)}...`
                              : stagedAttachment
                                ? "Add a caption..."
                                : `Message ${room.name}`
                      }
                      disabled={!user || !room.members.some((m) => m.userId === user.id) || isSending}
                    />
                    <InputGroupAddon>
                      <button
                        type="button"
                        onClick={() => chatFileInputRef.current?.click()}
                        disabled={!user || !room.members.some((m) => m.userId === user.id) || isSending}
                        className="rounded p-0.5 text-muted-foreground transition-all hover:text-foreground active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                        title="Attach image or PDF"
                        aria-label="Attach file"
                      >
                        <IconPaperclip
                          stroke={2}
                          height={19}
                          width={19}
                          className={
                            stagedAttachment
                              ? "text-primary"
                              : "text-muted-foreground hover:text-foreground"
                          }
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker((prev) => !prev)}
                        disabled={!user || !room.members.some((m) => m.userId === user.id) || isSending}
                        className="rounded p-0.5 text-muted-foreground transition-all hover:text-foreground active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                        title="Add emoji"
                        aria-label="Add emoji"
                      >
                        <IconMoodSmile
                          stroke={2}
                          height={20}
                          width={20}
                          className={
                            showEmojiPicker
                              ? "text-primary"
                              : "text-muted-foreground hover:text-foreground"
                          }
                        />
                      </button>
                    </InputGroupAddon>
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="submit"
                        variant="ghost"
                        size="icon-sm"
                        disabled={
                          !user ||
                          !room.members.some((m) => m.userId === user.id) ||
                          (!draft.trim() && !stagedAttachment) ||
                          isSending
                        }
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {isSending ? (
                          <IconLoader2 stroke={2} height={18} width={18} className="animate-spin text-primary" />
                        ) : (
                          <IconBrandTelegram stroke={2} height={18} width={18} />
                        )}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </div>

                <div className="rounded-full border border-border/50 bg-muted/30 p-1">
                  <IconMicrophone
                    stroke={2}
                    height={20}
                    width={20}
                    className="cursor-not-allowed text-muted-foreground/60"
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
          <DialogContent className="max-w-4xl p-0 bg-background/95 backdrop-blur-xl border border-border/60 rounded-2xl overflow-hidden shadow-2xl">
            <DialogHeader className="px-4 py-3 flex flex-row items-center justify-between border-b border-border/40">
              <DialogTitle className="text-sm font-semibold truncate max-w-md text-foreground">
                {lightboxMedia.name}
              </DialogTitle>
              <div className="flex items-center gap-2 pr-6">
                <a
                  href={lightboxMedia.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={lightboxMedia.name}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition cursor-pointer"
                >
                  <IconDownload size={14} />
                  <span>Download</span>
                </a>
              </div>
            </DialogHeader>
            <div className="flex items-center justify-center p-3 sm:p-6 max-h-[80vh] overflow-hidden bg-black/10 dark:bg-black/30">
              <img
                src={lightboxMedia.url}
                alt={lightboxMedia.name}
                className="max-h-[72vh] w-auto max-w-full rounded-xl object-contain shadow-xl"
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
  return (
    <div className="flex w-full items-center justify-center my-2 select-none">
      <div className="flex items-center gap-1.5 px-2 py-0.5 text-center">
        <span className="text-[11px] sm:text-xs font-medium text-muted-foreground/80 break-words leading-relaxed">
          {message?.trim() || "System notification"}
        </span>
        {timestamp && (
          <span className="text-[10px] text-muted-foreground/50 shrink-0">
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
      className={`group relative flex w-full items-end gap-2 px-1 py-0.5 transition-all duration-300 animate-in fade-in-50 slide-in-from-bottom-1 duration-200 ${
        isOwn ? "justify-end" : "justify-start"
      }`}
    >
      {/* Avatar only shown for other users' messages on the left (WhatsApp style) */}
      {!isOwn && (
        <Avatar className="h-7 w-7 shrink-0 border border-border/80 shadow-xs mb-1">
          <AvatarImage src={avatar} alt={username} />
          <AvatarFallback className="text-[11px] font-semibold bg-muted text-muted-foreground">
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
              className={`absolute -top-3.5 opacity-0 group-hover:opacity-100 transition-all duration-150 z-10 flex items-center gap-0.5 bg-card/95 backdrop-blur-md border border-border/60 rounded-lg p-0.5 shadow-md ${
                isOwn ? "left-0" : "right-0"
              }`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onReply()
                }}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition cursor-pointer"
                title="Reply"
                aria-label="Reply"
              >
                <IconMessageReply size={13} stroke={2} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopy()
                }}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition cursor-pointer"
                title="Copy text"
                aria-label="Copy text"
              >
                <IconCopy size={13} stroke={2} />
              </button>
              {canDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                  }}
                  className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                  title="Delete"
                  aria-label="Delete"
                >
                  <IconTrash size={13} stroke={2} />
                </button>
              )}
            </div>

            {/* Bubble Box */}
            <div
              className={`min-w-0 rounded-2xl px-3.5 py-2 text-xs leading-relaxed sm:text-sm text-foreground backdrop-blur-sm transition-all duration-150 ${
                isOwn
                  ? "rounded-br-xs border border-[#d4af37] dark:border-[#f5d061] bg-amber-500/10 dark:bg-muted/80 shadow-[0_2px_12px_rgba(244,187,68,0.14)]"
                  : "rounded-bl-xs border border-blue-500/50 dark:border-blue-400/70 bg-blue-500/8 dark:bg-muted/80 shadow-[0_2px_12px_rgba(59,130,246,0.08)]"
              }`}
            >
              {/* Sender Name for other users inside the bubble (WhatsApp group chat style) */}
              {!isOwn && (
                <div className="mb-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 truncate">
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
                  className={`group/reply mb-2 min-w-0 rounded-xl border-l-[3px] bg-white/70 hover:bg-white/90 dark:bg-background/40 dark:hover:bg-background/70 px-2.5 py-1.5 text-[11px] sm:text-xs transition-all duration-150 cursor-pointer shadow-2xs select-none active:scale-[0.99] ${
                    isOwn
                      ? "border-[#d4af37] text-foreground"
                      : "border-blue-500 text-foreground"
                  }`}
                >
                  <div
                    className={`mb-0.5 flex items-center justify-between gap-1.5 font-semibold text-[11px] ${
                      isOwn
                        ? "text-[#d4af37] dark:text-[#f5d061]"
                        : "text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <IconMessageReply size={11} stroke={2.5} className="shrink-0" />
                      <span className="truncate">{parentMessage.username}</span>
                    </div>
                    <span className="text-[9px] opacity-0 group-hover/reply:opacity-80 transition-opacity shrink-0">Jump</span>
                  </div>
                  <div className="line-clamp-2 leading-relaxed break-words [overflow-wrap:anywhere] font-normal text-muted-foreground">
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
                          className="group/img relative overflow-hidden rounded-xl border border-border/40 bg-black/5 dark:bg-white/5 cursor-zoom-in max-w-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onPreviewImage?.(att.url, att.name || "Image")
                          }}
                        >
                          <img
                            src={att.url}
                            alt={att.name || "Attachment"}
                            className="max-h-72 w-auto max-w-full rounded-xl object-contain transition-transform duration-200 group-hover/img:scale-[1.01]"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-end justify-end p-2 opacity-0 group-hover/img:opacity-100">
                            <span className="rounded-lg bg-black/70 backdrop-blur-xs px-2 py-1 text-[10px] text-white font-medium flex items-center gap-1">
                              <IconPhoto size={12} />
                              Click to expand
                            </span>
                          </div>
                        </div>
                      )
                    }

                    if (isPdf) {
                      return (
                        <div
                          key={att.id || idx}
                          className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/85 dark:bg-card/60 p-2.5 max-w-sm shadow-2xs backdrop-blur-xs transition hover:bg-card/95"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20">
                            <IconFileTypePdf size={22} stroke={1.8} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-semibold text-foreground" title={att.name}>
                              {att.name || "Document.pdf"}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {formatFileSize(att.size)} • PDF
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition"
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
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition"
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
                <div className="break-words [overflow-wrap:anywhere] whitespace-pre-wrap selection:bg-primary/20">
                  {message}
                </div>
              ) : parsedAttachments.length === 0 ? (
                <div className="break-words [overflow-wrap:anywhere] whitespace-pre-wrap selection:bg-primary/20">
                  {fallbackMessage}
                </div>
              ) : null}

              {/* Timestamp at bottom right inside the bubble */}
              <div className="mt-1 flex items-center justify-end gap-1 select-none">
                <span className="text-[10px] text-muted-foreground/80 shrink-0">
                  {timestamp}
                </span>
              </div>
            </div>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-48 rounded-xl shadow-xl border border-border/60 bg-popover/95 backdrop-blur-md p-1.5 z-50">
          <ContextMenuItem onSelect={onReply} className="gap-2.5 cursor-pointer py-1.5 text-xs font-medium">
            <IconMessageReply size={15} className="text-primary" />
            <span>Reply</span>
          </ContextMenuItem>
          <ContextMenuItem onSelect={handleCopy} className="gap-2.5 cursor-pointer py-1.5 text-xs font-medium">
            <IconCopy size={15} className="text-muted-foreground" />
            <span>Copy text</span>
          </ContextMenuItem>
          {canDelete && (
            <>
              <ContextMenuSeparator className="my-1 opacity-50" />
              <ContextMenuItem
                onSelect={onDelete}
                className="gap-2.5 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer py-1.5 text-xs font-medium"
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
  const { updateRoom: updateRoomRequest, deleteRoom: deleteRoomRequest } =
    useRooms()
  const [open, setOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(room.avatarUrl ?? null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setAvatarUrl(room.avatarUrl ?? null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [room.id, room.avatarUrl, open])

  const defaultValues: EditRoomFormInput = {
    name: room.name,
    description: room.description ?? "",
    isPrivate: room.isPrivate ? "true" : "false",
  }

  const roomFields: FieldConfig<EditRoomFormInput>[] = [
    {
      name: "name",
      label: "Channel Name",
      placeholder: "channel-name",
      autoComplete: "off",
    },
    {
      name: "description",
      label: "Description",
      placeholder: "What this channel is for",
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

  async function handleUpdateRoom(data: EditRoomFormInput) {
    try {
      const payload: EditRoomRequest["body"] = {
        name: data.name,
        description: data.description,
        avatarUrl,
        isPrivate: data.isPrivate === "true",
      }
      const updatedRoom = await updateRoomRequest(room.id, payload)

      useAppStore.getState().upsertRoom(updatedRoom)
      setOpen(false)
      toast.success("Channel updated", toastOptions)
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ??
          error.response?.data?.message ??
          "Unable to update channel")
        : "Unable to update channel"

      toast.error(message, toastOptions)
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
          setAvatarUrl(room.avatarUrl ?? null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ""
          }
        }}
      >
        <DialogTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground active:scale-95"
            aria-label="Edit channel"
          >
            <IconDotsVertical size={18} stroke={2} />
          </button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Channel</DialogTitle>
            <DialogDescription>
              Update the channel name, description, avatar, or visibility.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex flex-col items-center justify-center gap-2 pt-1 pb-1">
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
                  Change Channel Icon
                </Button>
                {avatarUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive cursor-pointer"
                    onClick={() => {
                      setAvatarUrl(null)
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ""
                      }
                    }}
                  >
                    <IconTrash size={14} className="mr-1" /> Remove
                  </Button>
                )}
              </div>
            </div>

            <AppForm
              key={`${room.id}-${room.updatedAt}-${open}`}
              formId={`edit-room-form-${room.id}`}
              schema={editRoomFormSchema}
              defaultValues={{
                name: room.name,
                description: room.description ?? "",
                isPrivate: room.isPrivate ? ("true" as const) : ("false" as const),
              }}
              fields={roomFields}
              onSubmit={async (data) => {
                await handleUpdateRoom(data as EditRoomFormInput)
              }}
              submitLabel="Save changes"
              pendingLabel="Saving changes..."
            />

            <Button
              type="button"
              variant="destructive"
              className="w-full"
              onClick={handleOpenDeleteConfirmation}
            >
              Delete channel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Channel?</DialogTitle>
            <DialogDescription>
              This will permanently delete {room.name} and its messages. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
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
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [isLoadingPending, setIsLoadingPending] = useState(false)
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(
    null
  )
  const [usernamesInput, setUsernamesInput] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

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
        <div className="shrink-0 flex items-center justify-between border-b border-border/50 px-3 py-2 sm:px-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <IconUsers size={16} />
            Members ({room.members.length})
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onShowChat}
            >
              Show chat
            </Button>
            {canManageRoom && (
              <Button
                type="button"
                size="sm"
                className="h-8"
                onClick={() => setAddMembersOpen(true)}
              >
                <IconUserPlus size={14} />
                Add member
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-full w-full min-h-0 flex-1">
          <div className="space-y-2 px-3 py-2 sm:px-4">
            {canManageRoom && (
              <div className="rounded-lg border border-border/40 bg-card/40 p-2">
                <div className="mb-2 text-xs font-medium text-muted-foreground">
                  Pending join requests
                </div>

                {isLoadingPending && (
                  <div className="text-xs text-muted-foreground">
                    Loading requests...
                  </div>
                )}

                {!isLoadingPending && pendingRequests.length === 0 && (
                  <div className="text-xs text-muted-foreground">
                    No pending requests
                  </div>
                )}

                {!isLoadingPending &&
                  pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="mb-2 flex items-center justify-between rounded-md border border-border/40 px-2 py-1.5 last:mb-0"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar className="h-6 w-6 border border-border">
                          <AvatarImage
                            src={request.user?.avatarUrl ?? undefined}
                            alt={request.user?.username ?? "User"}
                          />
                          <AvatarFallback className="text-xs">
                            {request.user?.username?.[0] ?? "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="truncate text-[13px]">
                          {request.user?.username ?? "Unknown user"}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
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
                          className="h-7 px-2 text-xs"
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
              const displayName = member.user?.username ?? "Unknown user"
              const canRemove =
                canManageRoom &&
                member.role !== "OWNER" &&
                member.userId !== currentUserId

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border border-border/40 bg-card/60 px-2.5 py-1.5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar className="h-7 w-7 border border-border">
                      <AvatarImage
                        src={member.user?.avatarUrl ?? undefined}
                        alt={displayName}
                      />
                      <AvatarFallback className="text-xs">
                        {displayName[0] ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate text-[13px]">{displayName}</div>
                      <div className="text-xs text-muted-foreground">
                        {member.role}
                      </div>
                    </div>
                  </div>

                  {canRemove && (
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setRemoveTarget(member)}
                    >
                      <IconUserMinus size={14} />
                    </Button>
                  )}
                </div>
              )
            })}

            {isMember && (
              <div className="pt-3 pb-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
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
        open={confirmLeaveOpen}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmLeaveOpen(false)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Leave Channel?</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave {room.name}? You will need to rejoin to access messages if it is private.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmLeaveOpen(false)}
              disabled={isLeaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
              onClick={async () => {
                if (isLeaving) return
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
              disabled={isLeaving}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove member?</DialogTitle>
            <DialogDescription>
              Remove {removeTarget?.user?.username ?? "this member"} from this
              channel?
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setRemoveTarget(null)}
              disabled={isRemoving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
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

function toRoomMessage(message: ChatHistoryMessage): RoomMessage {
  return {
    id: message.id,
    sender: message.userId,
    roomId: message.roomId,
    text: message.text,
    attachments: message.attachments,
    parentId: message.parentId,
    createdAt: message.createdAt,
    senderUsername: message.senderUsername,
    senderAvatarUrl: message.senderAvatarUrl,
    isDeleted: message.isDeleted,
  }
}

function toRoomPreviewMessage(message: ChatHistoryMessage): RoomMessage {
  return {
    id: message.id,
    sender: message.userId,
    roomId: message.roomId,
    text: message.text,
    attachments: message.attachments,
    parentId: message.parentId,
    createdAt: message.createdAt,
  }
}

function formatMessageTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ""
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}
