"use client"

import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import useAppStore, {
  getRoomDisplayName,
  getRoomDisplayAvatar,
  getOtherParticipant,
} from "@/stores/app-store"
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
  IconChevronLeft,
  IconMessageReply,
  IconTrash,
  IconUserMinus,
  IconUserPlus,
  IconUsers,
  IconX,
  IconPhoto,
  IconCopy,
  IconLogout,
  IconBolt,
  IconShieldCheck,
  IconMessageCircle,
  IconFileTypePdf,
  IconDownload,
  IconExternalLink,
  IconLoader2,
  IconSettings,
  IconCamera,
  IconInfoCircle,
} from "@tabler/icons-react"
import { uploadToCloudinary, type ChatAttachment } from "@/utils/cloudinary"
import { optimizeImage } from "@/utils/image"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import type {
  EditRoomRequest,
  RoomMemberRecord,
  RoomRecord,
} from "@repo/validation"
import axios from "axios"
import type { RoomMessage } from "@/stores/app-store"
import { useRooms } from "@/hooks/useRooms"
import { useChatSection, formatMessageTime } from "@/hooks/useChatSection"
import { DialogAddMembers } from "@/components/DialogAddMembers"
import { EmojiPicker } from "@/components/EmojiPicker"
import { AppIcon } from "@/components/AppIcon"

type MessageBubbleParent = {
  id: string
  username: string
  message?: string
  isDeleted?: boolean
}

const toastOptions = { position: "top-center" as const }

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface ChatSectionProps {
  room: RoomRecord | null
  onShowSidebar?: () => void
}

export default function ChatSection({ room, onShowSidebar }: ChatSectionProps) {
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

  const handleSelectEmoji = useCallback(
    (emoji: string) => {
      const input = inputRef.current
      if (input) {
        const start = input.selectionStart ?? draft.length
        const end = input.selectionEnd ?? draft.length
        const newDraft = draft.substring(0, start) + emoji + draft.substring(end)
        setDraft(newDraft)
        const nextPos = start + emoji.length
        setTimeout(() => {
          input.focus()
          input.setSelectionRange(nextPos, nextPos)
        }, 0)
      } else {
        setDraft(draft + emoji)
      }
    },
    [draft, setDraft]
  )

  const handleSendMessage = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault()
      if (isSending || (!draft.trim() && !stagedAttachment)) return
      setShowEmojiPicker(false)
      const textToSend = draft
      if (inputRef.current) inputRef.current.value = ""
      void sendMessage(textToSend)
    },
    [draft, isSending, sendMessage, stagedAttachment]
  )

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [roomMessages.length, messagesEndRef])

  // Drag and drop handlers for attachments
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      stageAttachment(file)
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const file = e.clipboardData.files?.[0]
    if (file) {
      e.preventDefault()
      stageAttachment(file)
    }
  }

  // ─── EMPTY STATE: NO ACTIVE CHAT ───
  if (!room) {
    return (
      <div className="h-full w-full p-1 sm:p-1.5">
        <Card className="flex h-full w-full flex-col items-center justify-center border border-[#d4a03d]/40 dark:border-line bg-paper rounded-[var(--radius-sketch-md)] shadow-xs p-6 text-center">
          <div className="flex flex-col items-center max-w-sm space-y-4">
            <div className="relative flex items-center justify-center py-2 animate-pulse">
              <AppIcon size="lg" />
            </div>

            <div className="space-y-1">
              <h2 className="font-display text-xl font-bold tracking-tight text-ink">
                Welcome to OpenSpace{user?.name ? `, ${user.name}` : ""}
              </h2>
              <p className="text-xs text-ink-muted leading-relaxed">
                A simple, private 1-to-1 and group chat app drawn on tactile stationery.
              </p>
            </div>

            <div className="pt-2 text-xs text-ink-muted">
              Select a conversation from the sidebar or click <span className="font-semibold text-[var(--pencil-teal)]">+</span> to start a new chat.
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Room metadata
  const isDirect = room.type === "DIRECT"
  const displayName = getRoomDisplayName(room, user?.id)
  const displayAvatar = getRoomDisplayAvatar(room, user?.id)
  const otherUser = isDirect ? getOtherParticipant(room, user?.id) : null

  return (
    <div className="h-full w-full p-1 sm:p-1.5">
      <Card className="flex h-full w-full flex-col gap-0 border border-[#d4a03d]/40 dark:border-line bg-paper shadow-xs rounded-[var(--radius-sketch-md)] p-0 overflow-hidden">
        {/* ─── HEADER ─── */}
        <CardHeader className="shrink-0 flex items-center justify-between border-b border-line bg-paper-subtle/80 px-3 py-2.5 backdrop-blur-xs">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Mobile Back Button */}
            <button
              type="button"
              onClick={() => {
                setActiveRoom(null)
                onShowSidebar?.()
              }}
              className="flex items-center justify-center rounded-[var(--radius-sketch-sm)] p-1 text-ink-muted hover:bg-surface-hover hover:text-ink cursor-pointer md:hidden shrink-0"
              aria-label="Back to conversations"
            >
              <IconChevronLeft size={20} />
            </button>

            {/* Avatar */}
            <div className="relative shrink-0">
              <Avatar className="size-9 rounded-[var(--radius-sketch-sm)] border border-line bg-paper">
                {displayAvatar && <AvatarImage src={displayAvatar} alt={displayName} />}
                <AvatarFallback
                  className={`text-xs font-bold ${
                    isDirect
                      ? "bg-[var(--pencil-teal-soft)] text-[var(--pencil-teal)]"
                      : "bg-[var(--pencil-yellow-soft)] text-[var(--pencil-yellow)]"
                  }`}
                >
                  {isDirect ? displayName.slice(0, 2).toUpperCase() : <IconUsers size={16} />}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Title & Subtitle */}
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-sm font-semibold truncate tracking-tight text-ink">
                {displayName}
              </h2>
              <p className="text-[11px] text-ink-muted truncate">
                {isDirect
                  ? otherUser?.username
                    ? `@${otherUser.username}`
                    : "Direct Message"
                  : `${room.members.length} members`}
              </p>
            </div>
          </div>

          {/* Action buttons on RHS */}
          <div className="flex items-center gap-1 shrink-0">
            {!isDirect && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleMembersPanel}
                      className={`size-8 rounded-[var(--radius-sketch-sm)] ${
                        showMembersPanel
                          ? "bg-[var(--pencil-teal-soft)] text-[var(--pencil-teal)]"
                          : "text-ink-muted hover:text-ink"
                      }`}
                    >
                      <IconUsers size={17} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Members & Info</TooltipContent>
                </Tooltip>

                {canManageRoom && <DialogEditGroup room={room} />}
              </>
            )}
          </div>
        </CardHeader>

        {/* ─── CHAT OR MEMBERS PANEL ─── */}
        <CardContent className="min-h-0 flex-1 overflow-hidden px-0 py-0">
          {showMembersPanel && !isDirect ? (
            <GroupMembersPanel
              room={room}
              currentUserId={user?.id ?? null}
              canManageRoom={canManageRoom}
              onClose={closeMembersPanel}
            />
          ) : (
            <div
              className="relative flex h-full min-h-0 flex-col overflow-hidden"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/* Drag & drop overlay */}
              {isDragOver && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-paper/90 border-2 border-dashed border-[var(--pencil-teal)] backdrop-blur-2xs">
                  <div className="flex flex-col items-center gap-2 text-[var(--pencil-teal)] font-display font-semibold text-sm">
                    <IconPhoto size={36} />
                    <span>Drop image or PDF to send</span>
                  </div>
                </div>
              )}

              {/* Message History Stream */}
              <ScrollArea className="flex-1 px-3 py-3">
                <div className="space-y-2">
                  {isLoading && roomMessages.length === 0 ? (
                    <div className="flex items-center justify-center py-12 gap-2 text-ink-muted text-xs font-display">
                      <IconLoader2 className="size-4 animate-spin text-[var(--pencil-teal)]" />
                      <span>Loading messages...</span>
                    </div>
                  ) : roomMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
                      <div className="size-10 rounded-full bg-paper-subtle flex items-center justify-center text-ink-subtle">
                        <IconMessageCircle size={20} />
                      </div>
                      <p className="text-xs font-semibold text-ink">No messages yet</p>
                      <p className="text-[11px] text-ink-muted max-w-xs">
                        {isDirect
                          ? `Send a message to start chatting with ${displayName}.`
                          : "Say hello to start the group conversation!"}
                      </p>
                    </div>
                  ) : (
                    roomMessages.map((msg) => {
                      const isSystem =
                        msg.type?.toUpperCase() === "SYSTEM" ||
                        msg.senderUsername?.toLowerCase() === "system" ||
                        msg.sender?.toLowerCase() === "system"

                      if (isSystem) {
                        return (
                          <SystemMessageNotice
                            key={msg.id}
                            id={msg.id}
                            text={msg.text}
                            timestamp={formatMessageTime(msg.createdAt)}
                          />
                        )
                      }

                      const isOwn = msg.sender === user?.id
                      const parentMsg = msg.parentId ? roomMessagesById.get(msg.parentId) : undefined

                      return (
                        <MessageBubble
                          key={msg.id}
                          id={msg.id}
                          username={getAuthorName(msg)}
                          avatar={getAuthorAvatar(msg) ?? undefined}
                          parentId={msg.parentId}
                          parentMessage={
                            parentMsg
                              ? {
                                  id: parentMsg.id,
                                  username: getAuthorName(parentMsg),
                                  message: getMessageBody(parentMsg),
                                  isDeleted: parentMsg.isDeleted,
                                }
                              : undefined
                          }
                          message={msg.text}
                          attachments={
                            msg.attachments ? JSON.stringify(msg.attachments) : undefined
                          }
                          timestamp={formatMessageTime(msg.createdAt)}
                          isOwn={isOwn}
                          status={msg.status}
                          isDeleted={msg.isDeleted}
                          canDelete={isOwn && !msg.isDeleted}
                          onReply={() => setReplyingTo(msg)}
                          onDelete={() => handleDeleteMessage(msg.id)}
                          onPreviewImage={(url, name) => setLightboxMedia({ url, name })}
                        />
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>

        {/* ─── MESSAGE COMPOSER FOOTER ─── */}
        {!showMembersPanel && (
          <CardFooter className="shrink-0 border-t border-line bg-paper-subtle/80 p-2.5 relative overflow-visible">
            <form
              className="relative flex w-full flex-col gap-1.5"
              onSubmit={handleSendMessage}
            >
              {/* Emoji Picker Popover */}
              <EmojiPicker
                isOpen={showEmojiPicker}
                onClose={() => setShowEmojiPicker(false)}
                onSelectEmoji={handleSelectEmoji}
                align="right"
              />

              {/* Staged Attachment Preview Bar */}
              {stagedAttachment && (
                <div className="flex items-center justify-between gap-3 rounded-[var(--radius-sketch-sm)] border border-[var(--pencil-teal)]/40 bg-paper shadow-2xs px-3 py-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {stagedAttachment.type === "IMAGE" ? (
                      <div className="size-10 shrink-0 overflow-hidden rounded-[var(--radius-sketch-sm)] border border-line bg-paper-dark">
                        <img
                          src={stagedAttachment.previewUrl}
                          alt={stagedAttachment.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="size-10 shrink-0 flex items-center justify-center rounded-[var(--radius-sketch-sm)] bg-[var(--pencil-coral-soft)] text-[var(--pencil-coral)] border border-[var(--pencil-coral)]/30">
                        <IconFileTypePdf size={20} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-ink truncate">
                        {stagedAttachment.name}
                      </p>
                      <p className="text-[10px] text-ink-muted">
                        {formatFileSize(stagedAttachment.size)}
                        {isSending ? ` • Uploading ${uploadProgress}%` : ""}
                      </p>
                    </div>
                  </div>
                  {!isSending && (
                    <button
                      type="button"
                      onClick={clearStagedAttachment}
                      className="p-1 rounded text-ink-muted hover:text-ink hover:bg-paper-subtle cursor-pointer"
                    >
                      <IconX size={14} />
                    </button>
                  )}
                </div>
              )}

              {/* Reply Quote Banner */}
              {replyingTo && (
                <div className="flex items-center justify-between gap-2.5 rounded-[var(--radius-sketch-sm)] border border-[var(--pencil-teal)]/40 bg-paper shadow-2xs px-3 py-1.5">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <IconMessageReply
                      size={14}
                      className="text-[var(--pencil-teal)] shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-semibold text-[var(--pencil-teal)]">
                        Replying to @{getAuthorName(replyingTo)}:
                      </span>{" "}
                      <span className="text-[11px] text-ink-muted truncate">
                        {getMessageBody(replyingTo)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearReply}
                    className="p-1 rounded text-ink-muted hover:text-ink cursor-pointer"
                  >
                    <IconX size={13} />
                  </button>
                </div>
              )}

              {/* Composer Input Bar */}
              <div className="flex items-center gap-1.5">
                <input
                  type="file"
                  ref={chatFileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) stageAttachment(file)
                    e.target.value = ""
                  }}
                  accept="image/*,application/pdf"
                  className="hidden"
                />

                <InputGroup className="h-9.5 flex-1 border border-line bg-paper shadow-2xs rounded-[var(--radius-sketch-sm)] focus-within:border-[var(--pencil-teal)]">
                  <InputGroupAddon align="inline-start">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => chatFileInputRef.current?.click()}
                          className="p-1 text-ink-muted hover:text-ink transition cursor-pointer"
                          aria-label="Attach file"
                        >
                          <IconPaperclip size={18} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Attach image or PDF</TooltipContent>
                    </Tooltip>
                  </InputGroupAddon>

                  <InputGroupInput
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    onPaste={handlePaste}
                    placeholder={
                      replyingTo
                        ? `Reply to @${getAuthorName(replyingTo)}...`
                        : stagedAttachment
                          ? "Add a caption..."
                          : isDirect
                            ? `Message ${displayName}...`
                            : `Message #${displayName}...`
                    }
                    disabled={!user}
                  />

                  <InputGroupAddon align="inline-end">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setShowEmojiPicker((prev) => !prev)
                          }}
                          className={`p-1 transition cursor-pointer rounded-[var(--radius-sketch-sm)] ${
                            showEmojiPicker
                              ? "text-[var(--pencil-yellow)] bg-[var(--pencil-yellow-soft)]"
                              : "text-ink-muted hover:text-ink hover:bg-paper-subtle"
                          }`}
                          aria-label="Add emoji"
                        >
                          <IconMoodSmile size={18} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Add emoji</TooltipContent>
                    </Tooltip>

                    <InputGroupButton
                      type="submit"
                      variant="ghost"
                      size="icon-sm"
                      disabled={!user || (!draft.trim() && !stagedAttachment) || isSending}
                      className="text-[var(--pencil-teal)] hover:text-[var(--pencil-teal)]/80 cursor-pointer disabled:opacity-40"
                    >
                      <IconBrandTelegram size={18} />
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </div>
            </form>
          </CardFooter>
        )}
      </Card>

      {/* Lightbox Modal */}
      {lightboxMedia && (
        <Dialog open={Boolean(lightboxMedia)} onOpenChange={(open) => !open && setLightboxMedia(null)}>
          <DialogContent className="max-w-[92vw] max-h-[92vh] p-0 bg-paper border border-line rounded-[var(--radius-sketch-md)] overflow-hidden shadow-2xl flex flex-col">
            <DialogHeader className="px-4 py-2.5 flex flex-row items-center justify-between border-b border-line shrink-0">
              <DialogTitle className="font-display text-sm font-semibold truncate text-ink">
                {lightboxMedia.name}
              </DialogTitle>
              <div className="flex items-center gap-2 pr-6">
                <a
                  href={lightboxMedia.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={lightboxMedia.name}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-sketch-sm)] text-xs font-medium bg-[var(--pencil-teal-soft)] text-[var(--pencil-teal)] hover:opacity-90"
                >
                  <IconDownload size={13} />
                  <span>Download</span>
                </a>
              </div>
            </DialogHeader>
            <div className="flex items-center justify-center p-3 overflow-hidden bg-paper-subtle max-h-[82vh]">
              <img
                src={lightboxMedia.url}
                alt={lightboxMedia.name}
                className="max-h-[76vh] max-w-[86vw] w-auto h-auto rounded-[var(--radius-sketch-sm)] object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// ─── SYSTEM MESSAGE NOTICE COMPONENT ───

function SystemMessageNotice({
  id,
  text,
  timestamp,
}: {
  id?: string
  text?: string
  timestamp?: string
}) {
  return (
    <div
      id={id}
      className="my-3 flex w-full items-center justify-center gap-2.5 px-3 select-text"
    >
      <div className="h-px flex-1 border-t border-dashed border-line-strong/60" />
      <div className="flex max-w-[85%] items-center gap-1.5 rounded-[var(--radius-sketch-sm)] border border-[var(--pencil-orange)]/40 bg-[var(--pencil-orange-soft)] px-3 py-1 shadow-2xs text-center">
        <IconInfoCircle size={13} className="text-[var(--pencil-orange)] shrink-0" />
        <span className="text-xs font-medium text-[var(--pencil-orange)] leading-relaxed">
          {text || "System notice"}
        </span>
        {timestamp && (
          <span className="shrink-0 text-[10px] font-mono text-[var(--pencil-orange)]/75">
            • {timestamp}
          </span>
        )}
      </div>
      <div className="h-px flex-1 border-t border-dashed border-line-strong/60" />
    </div>
  )
}

// ─── MESSAGE BUBBLE COMPONENT ───

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
  isDeleted = false,
  canDelete = false,
  onReply,
  onDelete,
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
  isDeleted?: boolean
  canDelete?: boolean
  onReply: () => void
  onDelete: () => void
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
      className={`group relative flex w-full items-end gap-2 px-1 py-0.5 ${
        isOwn ? "justify-end" : "justify-start"
      }`}
    >
      {!isOwn && (
        <Avatar className="size-7 shrink-0 mb-1 rounded-[var(--radius-sketch-sm)] border border-line">
          {avatar && <AvatarImage src={avatar} alt={username} />}
          <AvatarFallback className="text-[10px] font-semibold bg-paper-subtle text-ink">
            {username[0]?.toUpperCase() ?? "U"}
          </AvatarFallback>
        </Avatar>
      )}

      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={`relative flex min-w-0 max-w-[85%] sm:max-w-[75%] flex-col select-text ${
              isOwn ? "items-end" : "items-start"
            }`}
          >
            {/* Quick action bar on hover */}
            {!isDeleted && (
              <div
                className={`absolute -top-3.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-0.5 bg-paper border border-line rounded-[var(--radius-sketch-sm)] p-0.5 shadow-xs ${
                  isOwn ? "left-0" : "right-0"
                }`}
              >
                <button
                  type="button"
                  onClick={onReply}
                  className="p-1 rounded text-ink-muted hover:text-ink hover:bg-paper-subtle cursor-pointer"
                  title="Reply"
                >
                  <IconMessageReply size={12} />
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1 rounded text-ink-muted hover:text-ink hover:bg-paper-subtle cursor-pointer"
                  title="Copy"
                >
                  <IconCopy size={12} />
                </button>
                {canDelete && (
                  <button
                    type="button"
                    onClick={onDelete}
                    className="p-1 rounded text-ink-muted hover:text-[var(--pencil-coral)] hover:bg-[var(--pencil-coral-soft)] cursor-pointer"
                    title="Delete"
                  >
                    <IconTrash size={12} />
                  </button>
                )}
              </div>
            )}

            {/* Bubble Container */}
            <div
              className={`px-3 py-2 text-xs leading-relaxed sm:text-sm text-ink transition-all shadow-2xs ${
                isDeleted
                  ? "bg-paper-subtle border border-line italic text-ink-muted rounded-[var(--radius-sketch-sm)]"
                  : isOwn
                    ? "bg-paper border border-[var(--pencil-teal)]/30 rounded-[14px_11px_4px_12px]"
                    : "bg-paper-subtle border border-line-strong rounded-[4px_14px_12px_11px]"
              }`}
            >
              {/* Sender name for group chats */}
              {!isOwn && !isDeleted && (
                <div className="font-semibold text-[11px] text-[var(--pencil-teal)] mb-0.5">
                  {username}
                </div>
              )}

              {/* Reply Quote in bubble */}
              {parentMessage && !isDeleted && (
                <div className="mb-1.5 rounded-[var(--radius-sketch-sm)] border-l-2 border-[var(--pencil-teal)] bg-paper/60 px-2 py-1 text-[11px]">
                  <span className="font-semibold text-[var(--pencil-teal)]">
                    @{parentMessage.username}:
                  </span>{" "}
                  <span className="text-ink-muted truncate">
                    {parentMessage.message || "Original message"}
                  </span>
                </div>
              )}

              {/* Attachments */}
              {parsedAttachments.length > 0 && !isDeleted && (
                <div className="space-y-1.5 my-1">
                  {parsedAttachments.map((att, idx) => (
                    <div key={idx}>
                      {att.type === "IMAGE" ? (
                        <div
                          className="relative max-w-sm rounded-[var(--radius-sketch-sm)] overflow-hidden border border-line cursor-pointer"
                          onClick={() => onPreviewImage?.(att.url, att.name || "image")}
                        >
                          <img
                            src={att.url}
                            alt={att.name || "Image"}
                            className="max-h-60 w-auto object-cover hover:opacity-95"
                          />
                        </div>
                      ) : (
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded-[var(--radius-sketch-sm)] border border-line bg-paper hover:bg-paper-subtle"
                        >
                          <IconFileTypePdf size={20} className="text-[var(--pencil-coral)] shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-ink truncate">{att.name}</p>
                            <p className="text-[10px] text-ink-muted">
                              {att.size ? formatFileSize(att.size) : "PDF document"}
                            </p>
                          </div>
                          <IconExternalLink size={14} className="text-ink-subtle shrink-0" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Text content */}
              {message && <div>{message}</div>}

              {/* Timestamp & Status */}
              <div
                className={`mt-1 flex items-center gap-1 text-[10px] text-ink-subtle ${
                  isOwn ? "justify-end" : "justify-start"
                }`}
              >
                <span>{timestamp}</span>
                {isOwn && (
                  <span>
                    {status === "sending" ? " • sending..." : status === "failed" ? " • failed" : ""}
                  </span>
                )}
              </div>
            </div>
          </div>
        </ContextMenuTrigger>

        {!isDeleted && (
          <ContextMenuContent className="w-36 border border-line bg-paper text-ink rounded-[var(--radius-sketch-sm)]">
            <ContextMenuItem onClick={onReply} className="text-xs cursor-pointer">
              <IconMessageReply size={13} className="mr-2" />
              Reply
            </ContextMenuItem>
            <ContextMenuItem onClick={handleCopy} className="text-xs cursor-pointer">
              <IconCopy size={13} className="mr-2" />
              Copy
            </ContextMenuItem>
            {canDelete && (
              <>
                <ContextMenuSeparator className="bg-line" />
                <ContextMenuItem
                  onClick={onDelete}
                  className="text-xs text-[var(--pencil-coral)] cursor-pointer"
                >
                  <IconTrash size={13} className="mr-2" />
                  Delete
                </ContextMenuItem>
              </>
            )}
          </ContextMenuContent>
        )}
      </ContextMenu>
    </div>
  )
}

// ─── GROUP MEMBERS PANEL ───

function GroupMembersPanel({
  room,
  currentUserId,
  canManageRoom,
  onClose,
}: {
  room: RoomRecord
  currentUserId: string | null
  canManageRoom: boolean
  onClose: () => void
}) {
  const [addMembersOpen, setAddMembersOpen] = useState(false)
  const { removeMember, leaveRoom } = useRooms()
  const upsertRoom = useAppStore((s) => s.upsertRoom)
  const removeRoom = useAppStore((s) => s.removeRoom)

  async function handleRemove(memberId: string) {
    try {
      const res = await removeMember(room.id, memberId)
      upsertRoom(res.room)
      toast.success("Member removed", toastOptions)
    } catch {
      toast.error("Failed to remove member", toastOptions)
    }
  }

  async function handleLeave() {
    if (!currentUserId) return
    try {
      await leaveRoom(room.id, currentUserId)
      removeRoom(room.id)
      onClose()
      toast.success("Left group", toastOptions)
    } catch {
      toast.error("Failed to leave group", toastOptions)
    }
  }

  return (
    <div className="h-full flex flex-col bg-paper p-3 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-line">
        <div>
          <h3 className="font-display text-sm font-bold text-ink">Group Members</h3>
          <p className="text-[11px] text-ink-muted">{room.members.length} participants</p>
        </div>
        <div className="flex items-center gap-1.5">
          {canManageRoom && (
            <Button
              size="sm"
              onClick={() => setAddMembersOpen(true)}
              className="h-7 text-xs bg-[var(--pencil-teal)] text-white hover:bg-[var(--pencil-teal)]/90 rounded-[var(--radius-sketch-sm)]"
            >
              <IconUserPlus size={13} className="mr-1" />
              Add
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-7 text-xs rounded-[var(--radius-sketch-sm)] text-ink-muted hover:text-ink"
          >
            Close
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1">
          {room.members.map((member) => {
            const isSelf = member.userId === currentUserId
            const isOwner = member.role === "OWNER"
            const isAdmin = member.role === "ADMIN"

            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-2 rounded-[var(--radius-sketch-sm)] hover:bg-paper-subtle"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="size-8 rounded-[var(--radius-sketch-sm)] border border-line">
                    {member.user?.avatarUrl && (
                      <AvatarImage src={member.user.avatarUrl} alt={member.user.username} />
                    )}
                    <AvatarFallback className="text-[10px] font-semibold bg-paper-subtle">
                      {(member.user?.name || member.user?.username || "U").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink truncate">
                      {member.user?.name || member.user?.username || "User"}
                      {isSelf && <span className="text-ink-subtle font-normal"> (You)</span>}
                    </p>
                    <p className="text-[10px] text-ink-muted truncate">
                      @{member.user?.username}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      isOwner
                        ? "bg-[var(--pencil-yellow-soft)] text-[var(--pencil-yellow)]"
                        : isAdmin
                          ? "bg-[var(--pencil-teal-soft)] text-[var(--pencil-teal)]"
                          : "bg-paper-subtle text-ink-subtle"
                    }`}
                  >
                    {member.role}
                  </span>

                  {canManageRoom && !isSelf && !isOwner && (
                    <button
                      type="button"
                      onClick={() => handleRemove(member.id)}
                      className="p-1 rounded text-ink-muted hover:text-[var(--pencil-coral)] hover:bg-[var(--pencil-coral-soft)] cursor-pointer"
                      title="Remove member"
                    >
                      <IconUserMinus size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      <div className="pt-2 border-t border-line">
        <Button
          variant="outline"
          size="sm"
          onClick={handleLeave}
          className="w-full h-8 text-xs text-[var(--pencil-coral)] border-[var(--pencil-coral)]/30 hover:bg-[var(--pencil-coral-soft)] rounded-[var(--radius-sketch-sm)]"
        >
          <IconLogout size={14} className="mr-1.5" />
          Leave Group
        </Button>
      </div>

      {canManageRoom && (
        <DialogAddMembers
          room={room}
          open={addMembersOpen}
          onOpenChange={setAddMembersOpen}
        />
      )}
    </div>
  )
}

// ─── EDIT GROUP MODAL ───

function DialogEditGroup({ room }: { room: RoomRecord }) {
  const [open, setOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const [name, setName] = useState(room.name || "")
  const [description, setDescription] = useState(room.description || "")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { updateRoom, deleteRoom } = useRooms()
  const upsertRoom = useAppStore((s) => s.upsertRoom)
  const removeRoom = useAppStore((s) => s.removeRoom)

  useEffect(() => {
    setName(room.name || "")
    setDescription(room.description || "")
    setSelectedFile(null)
    setPreviewUrl(null)
    setRemovePhoto(false)
  }, [room.name, room.description, room.avatarUrl, open])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WebP)", toastOptions)
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file must be under 5MB", toastOptions)
      return
    }
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setRemovePhoto(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || isSubmitting || isUploading) return

    setIsSubmitting(true)
    setIsUploading(true)
    try {
      let finalAvatarUrl: string | null | undefined = undefined

      if (removePhoto) {
        finalAvatarUrl = null
      } else if (selectedFile) {
        const optimizedBlob = await optimizeImage(selectedFile)
        finalAvatarUrl = await uploadToCloudinary(optimizedBlob)
      }

      const payload: EditRoomRequest["body"] = {
        name: name.trim(),
        description: description.trim() || undefined,
        ...(finalAvatarUrl !== undefined ? { avatarUrl: finalAvatarUrl } : {}),
      }
      const updated = await updateRoom(room.id, payload)
      upsertRoom(updated)
      setOpen(false)
      toast.success("Group updated successfully", toastOptions)
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.error ?? err.response?.data?.message ?? "Failed to update group")
        : (err instanceof Error ? err.message : "Failed to update group")
      toast.error(message, toastOptions)
    } finally {
      setIsSubmitting(false)
      setIsUploading(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await deleteRoom(room.id)
      removeRoom(room.id)
      setConfirmDeleteOpen(false)
      setOpen(false)
      toast.success("Group deleted", toastOptions)
    } catch {
      toast.error("Failed to delete group", toastOptions)
    } finally {
      setIsDeleting(false)
    }
  }

  const currentAvatar = removePhoto
    ? null
    : previewUrl || room.avatarUrl || null

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(true)}
              className="size-8 rounded-[var(--radius-sketch-sm)] text-ink-muted hover:text-ink cursor-pointer"
            >
              <IconSettings size={17} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Group Settings</TooltipContent>
        </Tooltip>

        <DialogContent className="max-w-md w-full border border-line bg-paper text-ink p-4 rounded-[var(--radius-sketch-md)] shadow-xl">
          <DialogHeader className="pb-2 border-b border-line">
            <DialogTitle className="font-display text-base font-bold text-ink">
              Group Settings
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              Update group name, description, avatar photo, or delete this group.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-3.5 pt-3">
            {/* Room Avatar Upload */}
            <div className="flex flex-col items-center gap-2.5 py-1">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group relative size-20 cursor-pointer overflow-hidden rounded-[var(--radius-sketch-md)] border-2 border-line bg-paper-dark shadow-xs transition-all hover:border-[var(--pencil-teal)]"
              >
                {currentAvatar ? (
                  <img
                    src={currentAvatar}
                    alt={name || "Room avatar"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[var(--pencil-yellow-soft)] text-[var(--pencil-yellow)]">
                    <IconUsers size={28} />
                  </div>
                )}

                <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <IconCamera className="size-5 text-paper" />
                  <span className="mt-1 text-[9px] font-semibold text-paper">Upload</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs font-semibold rounded-[var(--radius-sketch-sm)] cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <IconCamera size={13} className="mr-1.5" />
                  {currentAvatar ? "Change photo" : "Upload photo"}
                </Button>

                {currentAvatar && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2.5 text-xs font-semibold rounded-[var(--radius-sketch-sm)] text-[var(--pencil-coral)] hover:bg-[var(--pencil-coral-soft)] cursor-pointer"
                    onClick={() => {
                      setSelectedFile(null)
                      setPreviewUrl(null)
                      setRemovePhoto(true)
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">Group Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full h-8.5 px-3 text-xs bg-paper-subtle border border-line rounded-[var(--radius-sketch-sm)] text-ink focus:outline-hidden focus:ring-1 focus:ring-[var(--pencil-teal)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full p-2.5 text-xs bg-paper-subtle border border-line rounded-[var(--radius-sketch-sm)] text-ink focus:outline-hidden focus:ring-1 focus:ring-[var(--pencil-teal)] resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmDeleteOpen(true)}
                className="h-8 text-xs text-[var(--pencil-coral)] border-[var(--pencil-coral)]/30 hover:bg-[var(--pencil-coral-soft)] rounded-[var(--radius-sketch-sm)]"
              >
                <IconTrash size={13} className="mr-1" />
                Delete Group
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="h-8 text-xs rounded-[var(--radius-sketch-sm)] border-line"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!name.trim() || isSubmitting || isUploading}
                  className="h-8 text-xs bg-[var(--pencil-teal)] text-white hover:bg-[var(--pencil-teal)]/90 rounded-[var(--radius-sketch-sm)] cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <IconLoader2 size={13} className="mr-1.5 animate-spin" />
                      Uploading...
                    </>
                  ) : isSubmitting ? (
                    <>
                      <IconLoader2 size={13} className="mr-1.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="max-w-sm rounded-[var(--radius-sketch-md)] bg-paper border border-line p-4">
          <DialogHeader>
            <DialogTitle className="font-display text-sm font-bold text-ink">
              Delete Group?
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              This will permanently delete this group and all its messages. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-3 flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmDeleteOpen(false)}
              disabled={isDeleting}
              className="h-8 text-xs rounded-[var(--radius-sketch-sm)] border-line"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="h-8 text-xs rounded-[var(--radius-sketch-sm)] font-semibold"
            >
              {isDeleting ? "Deleting..." : "Confirm Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
