import { useEffect, useRef, useState, useCallback } from "react"
import useAppStore from "@/stores/app-store"
import { useMessage, type ChatHistoryMessage } from "@/hooks/useMessage"
import { useRooms } from "@/hooks/useRooms"
import type {
  AddRoomMembersRequest,
  EditRoomRequest,
  RoomMemberRecord,
  RoomRecord,
} from "@repo/validation"
import type { RoomMessage } from "@/stores/app-store"
import { toast } from "sonner"
import axios from "axios"
import { wsClient } from "@/ws"
import { uploadChatAttachment } from "@/utils/cloudinary"

export interface StagedAttachment {
  file: File
  previewUrl: string
  type: "IMAGE" | "PDF" | "FILE"
  name: string
  size: number
}

const EMPTY_ROOM_MESSAGES: RoomMessage[] = []
const toastOptions = { position: "top-center" as const }

// ─── Mappers ────────────────────────────────────────────────────────────────

export function toRoomMessage(message: ChatHistoryMessage): RoomMessage {
  return {
    id: message.id,
    type: (message.type as RoomMessage["type"]) ?? "TEXT",
    sender: message.userId,
    roomId: message.roomId,
    text: message.text,
    attachments: message.attachments,
    parentId: message.parentId,
    parent: message.parent,
    createdAt: message.createdAt,
    senderUsername: message.senderUsername,
    senderAvatarUrl: message.senderAvatarUrl,
    isDeleted: message.isDeleted,
  }
}

export function toRoomPreviewMessage(message: ChatHistoryMessage | RoomMessage): RoomMessage {
  return {
    id: message.id,
    type: (message.type as RoomMessage["type"]) ?? "TEXT",
    sender: "userId" in message ? (message as ChatHistoryMessage).userId : (message as RoomMessage).sender,
    roomId: message.roomId,
    text: message.text,
    attachments: message.attachments,
    parentId: message.parentId,
    parent: message.parent,
    createdAt: message.createdAt,
    senderUsername: message.senderUsername,
    senderAvatarUrl: message.senderAvatarUrl,
    status: "status" in message ? message.status : undefined,
  }
}

export function formatMessageTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

import { useRoomPermissions } from "./useRoomPermissions"
export { useRoomPermissions }

// ─── useMessages ────────────────────────────────────────────────────────────

function useMessages(room: RoomRecord | null, userId: string | undefined) {
  const roomId = room?.id ?? null
  const setMessages = useAppStore((s) => s.setMessages)
  const roomMessages = useAppStore((s) =>
    roomId ? (s.messages[roomId] ?? EMPTY_ROOM_MESSAGES) : EMPTY_ROOM_MESSAGES
  )
  const { fetchMessages } = useMessage()
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!roomId) return
    wsClient.joinRoom(roomId)
    let isCancelled = false

    const load = async () => {
      const cached = useAppStore.getState().messages[roomId]
      if (!cached || cached.length === 0) {
        setIsLoading(true)
      }
      try {
        const history = await fetchMessages(roomId, userId || "")
        if (!isCancelled) {
          setMessages(roomId, history.map(toRoomMessage))
        }
      } catch (error) {
        if (!isCancelled) {
          const message = axios.isAxiosError(error)
            ? (error.response?.data?.error ??
              error.response?.data?.message ??
              "Unable to load messages")
            : "Unable to load messages"
          toast.error(message, toastOptions)
        }
      } finally {
        if (!isCancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      isCancelled = true
    }
  }, [roomId, userId, fetchMessages, setMessages])

  return { roomMessages, isLoading, messagesEndRef }
}

// ─── useReply ───────────────────────────────────────────────────────────────

function useReply(roomMessages: RoomMessage[]) {
  const [replyingTo, setReplyingTo] = useState<RoomMessage | null>(null)

  const clearReply = useCallback(() => {
    setReplyingTo(null)
  }, [])

  return { replyingTo, setReplyingTo, clearReply }
}

// ─── useMembersPanel ────────────────────────────────────────────────────────

function useMembersPanel(roomId: string | null) {
  const [showMembersPanel, setShowMembersPanel] = useState(false)

  useEffect(() => {
    setShowMembersPanel(false)
  }, [roomId])

  const toggleMembersPanel = useCallback(() => {
    setShowMembersPanel((prev) => !prev)
  }, [])

  const closeMembersPanel = useCallback(() => {
    setShowMembersPanel(false)
  }, [])

  return { showMembersPanel, toggleMembersPanel, closeMembersPanel }
}

// ─── useDeleteMessage ───────────────────────────────────────────────────────

function useDeleteMessage(
  roomId: string,
  userId: string,
  replyingTo: RoomMessage | null,
  clearReply: () => void
) {
  const { deleteMessage: deleteMessageApi } = useMessage()
  const removeMessage = useAppStore((s) => s.removeMessage)
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null)

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!roomId || deletingMessageId) return
      setDeletingMessageId(messageId)

      try {
        await deleteMessageApi(messageId)
        removeMessage(roomId, messageId)
        if (replyingTo?.id === messageId) clearReply()
        toast.success("Message deleted", toastOptions)
      } catch (error) {
        const message = axios.isAxiosError(error)
          ? (error.response?.data?.error ??
            error.response?.data?.message ??
            "Unable to delete message")
          : "Unable to delete message"
        toast.error(message, toastOptions)
      } finally {
        setDeletingMessageId(null)
      }
    },
    [roomId, deletingMessageId, deleteMessageApi, removeMessage, replyingTo, clearReply]
  )

  return { deletingMessageId, handleDeleteMessage }
}

// ─── useSendMessage ─────────────────────────────────────────────────────────

function useSendMessage(
  room: RoomRecord | null,
  userId: string,
  replyingTo: RoomMessage | null,
  clearReply: () => void,
  user: any
) {
  const roomId = room?.id ?? ""
  const { createMessage } = useMessage()
  const addMessage = useAppStore((s) => s.addMessage)
  const replaceMessage = useAppStore((s) => s.replaceMessage)
  const updateRoomLastMessage = useAppStore((s) => s.updateRoomLastMessage)

  const draft = useAppStore((s) => (roomId ? (s.drafts[roomId] ?? "") : ""))
  const setDraft = useCallback(
    (text: string) => {
      if (roomId) useAppStore.getState().setRoomDraft(roomId, text)
    },
    [roomId]
  )

  const [isSending, setIsSending] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [stagedAttachment, setStagedAttachment] = useState<StagedAttachment | null>(null)

  const stageAttachment = useCallback((file: File) => {
    let type: StagedAttachment["type"] = "FILE"
    if (file.type.startsWith("image/")) {
      type = "IMAGE"
    } else if (file.type === "application/pdf") {
      type = "PDF"
    }
    const previewUrl = URL.createObjectURL(file)
    setStagedAttachment({ file, previewUrl, type, name: file.name, size: file.size })
  }, [])

  const clearStagedAttachment = useCallback(() => {
    if (stagedAttachment?.previewUrl) {
      URL.revokeObjectURL(stagedAttachment.previewUrl)
    }
    setStagedAttachment(null)
    setUploadProgress(0)
  }, [stagedAttachment])

  const sendMessage = useCallback(
    async (textToSend?: string) => {
      const text = (textToSend ?? draft).trim()
      if (!roomId || (!text && !stagedAttachment) || isSending) return

      const clientMessageId = crypto.randomUUID()
      const timestamp = new Date().toISOString()
      let attachmentsString: string | undefined

      setIsSending(true)

      try {
        if (stagedAttachment) {
          const uploaded = await uploadChatAttachment(
            stagedAttachment.file,
            (progress) => setUploadProgress(progress)
          )
          attachmentsString = JSON.stringify([uploaded])
        }

        const optimisticMessage: RoomMessage = {
          id: clientMessageId,
          type: "TEXT",
          sender: userId,
          roomId,
          text: text || undefined,
          attachments: attachmentsString,
          parentId: replyingTo?.id,
          parent: replyingTo
            ? {
                id: replyingTo.id,
                text: replyingTo.text,
                senderUsername: replyingTo.senderUsername || "user",
                isDeleted: replyingTo.isDeleted,
              }
            : undefined,
          createdAt: timestamp,
          senderUsername: user?.username,
          senderAvatarUrl: user?.avatarUrl,
          status: "sending",
        }

        addMessage(roomId, optimisticMessage)
        updateRoomLastMessage(roomId, toRoomPreviewMessage(optimisticMessage))
        setDraft("")
        clearStagedAttachment()
        clearReply()

        const confirmedMessage = await createMessage({
          roomId,
          sender: userId,
          type: "TEXT",
          parentId: replyingTo?.id,
          text: text || undefined,
          attachments: attachmentsString,
        })

        replaceMessage(roomId, clientMessageId, toRoomMessage(confirmedMessage))
        updateRoomLastMessage(roomId, toRoomPreviewMessage(confirmedMessage))
      } catch (error) {
        replaceMessage(roomId, clientMessageId, {
          id: clientMessageId,
          type: "TEXT",
          sender: userId,
          roomId,
          text: text || undefined,
          attachments: attachmentsString,
          parentId: replyingTo?.id,
          createdAt: timestamp,
          senderUsername: user?.username,
          senderAvatarUrl: user?.avatarUrl,
          status: "failed",
        })

        const message = axios.isAxiosError(error)
          ? (error.response?.data?.error ??
            error.response?.data?.message ??
            "Unable to send message")
          : "Unable to send message"
        toast.error(message, toastOptions)
      } finally {
        setIsSending(false)
        setUploadProgress(0)
      }
    },
    [
      roomId,
      draft,
      stagedAttachment,
      isSending,
      userId,
      replyingTo,
      user?.username,
      user?.avatarUrl,
      addMessage,
      updateRoomLastMessage,
      setDraft,
      clearStagedAttachment,
      clearReply,
      createMessage,
      replaceMessage,
    ]
  )

  return {
    draft,
    setDraft,
    isSending,
    uploadProgress,
    stagedAttachment,
    stageAttachment,
    clearStagedAttachment,
    sendMessage,
  }
}

// ─── useMessageMeta ─────────────────────────────────────────────────────────

function useMessageMeta(
  room: RoomRecord | null,
  currentUserId?: string,
  currentUsername?: string,
  currentUserAvatarUrl?: string | null
) {
  function getAuthorName(msg: RoomMessage) {
    if (msg.sender === currentUserId) return "You"
    if (msg.senderUsername) return msg.senderUsername
    const member = room?.members.find((m) => m.userId === msg.sender)
    return member?.user?.name || member?.user?.username || "Unknown"
  }

  function getAuthorAvatar(msg: RoomMessage): string | null | undefined {
    if (msg.sender === currentUserId) return currentUserAvatarUrl
    if (msg.senderAvatarUrl) return msg.senderAvatarUrl
    const member = room?.members.find((m) => m.userId === msg.sender)
    return member?.user?.avatarUrl
  }

  function getMessageBody(msg: RoomMessage): string {
    if (msg.isDeleted) return "This message was deleted"
    return msg.text || ""
  }

  return { getAuthorName, getAuthorAvatar, getMessageBody }
}

// ─── useRoomMembers ───────────────────────────────────────────────────────────

export function useRoomMembers(
  room: RoomRecord,
  currentUserId: string | null,
  canManageRoom: boolean
) {
  const { addMembers, removeMember } = useRooms()

  const [addMembersOpen, setAddMembersOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<RoomMemberRecord | null>(null)
  const [usernamesInput, setUsernamesInput] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  async function handleAddMembers() {
    const usernames = usernamesInput
      .split(/[,\n\s]+/)
      .map((u) => u.trim().replace(/^@+/, ""))
      .filter(Boolean)
    const unique = [...new Set(usernames)]
    if (!unique.length || isAdding) return

    setIsAdding(true)
    try {
      const payload: AddRoomMembersRequest["body"]["usernames"] = unique
      const { room: updatedRoom, addedCount } = await addMembers(
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
    if (!removeTarget || isRemoving) return
    setIsRemoving(true)

    try {
      const { room: updatedRoom } = await removeMember(room.id, removeTarget.id)
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

  return {
    addMembersOpen,
    setAddMembersOpen,
    removeTarget,
    setRemoveTarget,
    usernamesInput,
    setUsernamesInput,
    isAdding,
    isRemoving,
    handleAddMembers,
    handleRemoveMember,
  }
}

// ─── useEditRoom ─────────────────────────────────────────────────────────────

export function useEditRoom(room: RoomRecord) {
  const { updateRoom, deleteRoom } = useRooms()
  const [open, setOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleUpdateRoom(data: {
    name?: string
    description?: string
    avatarUrl?: string | null
  }) {
    try {
      const payload: EditRoomRequest["body"] = {
        name: data.name,
        description: data.description,
        avatarUrl: data.avatarUrl,
      }
      const updatedRoom = await updateRoom(room.id, payload)
      useAppStore.getState().upsertRoom(updatedRoom)
      setOpen(false)
      toast.success("Room updated", toastOptions)
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ??
          error.response?.data?.message ??
          "Unable to update room")
        : "Unable to update room"
      toast.error(message, toastOptions)
    }
  }

  function handleOpenDeleteConfirmation() {
    setOpen(false)
    window.requestAnimationFrame(() => setConfirmDeleteOpen(true))
  }

  async function handleDeleteRoom() {
    if (isDeleting) return
    setIsDeleting(true)

    try {
      await deleteRoom(room.id)
      const { clearMessages, removeRoom } = useAppStore.getState()
      clearMessages(room.id)
      removeRoom(room.id)
      setConfirmDeleteOpen(false)
      toast.success("Room deleted", toastOptions)
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ??
          error.response?.data?.message ??
          "Unable to delete room")
        : "Unable to delete room"
      toast.error(message, toastOptions)
    } finally {
      setIsDeleting(false)
    }
  }

  return {
    open,
    setOpen,
    confirmDeleteOpen,
    setConfirmDeleteOpen,
    isDeleting,
    handleUpdateRoom,
    handleOpenDeleteConfirmation,
    handleDeleteRoom,
  }
}

// ─── useChatSection (root export) ────────────────────────────────────────────

export function useChatSection(room: RoomRecord | null) {
  const user = useAppStore((s) => s.user)
  const setActiveRoom = useAppStore((s) => s.setActiveRoom)

  const { isOwner, isAdmin, isMember, canManageRoom } = useRoomPermissions(
    room,
    user?.id
  )
  const { roomMessages, isLoading, messagesEndRef } = useMessages(
    room,
    user?.id
  )
  const { replyingTo, setReplyingTo, clearReply } = useReply(roomMessages)
  const { showMembersPanel, toggleMembersPanel, closeMembersPanel } =
    useMembersPanel(room?.id ?? null)

  const { deletingMessageId, handleDeleteMessage } = useDeleteMessage(
    room?.id ?? "",
    user?.id ?? "",
    replyingTo,
    clearReply
  )

  const {
    draft,
    setDraft,
    isSending,
    uploadProgress,
    stagedAttachment,
    stageAttachment,
    clearStagedAttachment,
    sendMessage,
  } = useSendMessage(
    room,
    user?.id ?? "",
    replyingTo,
    clearReply,
    user
  )

  const { getAuthorName, getAuthorAvatar, getMessageBody } = useMessageMeta(
    room,
    user?.id,
    user?.username,
    user?.avatarUrl
  )

  const roomMessagesById = new Map(roomMessages.map((m) => [m.id, m]))

  return {
    user,
    setActiveRoom,
    isOwner,
    isAdmin,
    isMember,
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
  }
}
