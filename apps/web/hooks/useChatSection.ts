import { useEffect, useRef, useState } from "react"
import useAppStore from "@/stores/app-store"
import { useMessage, type ChatHistoryMessage } from "@/hooks/useMessage"
import { useRooms } from "@/hooks/useRooms"
import type {
  AddRoomMembersRequest,
  CreateMessageInput,
  EditRoomRequest,
  RoomJoinRequestRecord,
  RoomMemberRecord,
  RoomRecord,
} from "@repo/validation"
import type { RoomMessage } from "@/stores/app-store"
import { toast } from "sonner"
import axios from "axios"
import { wsClient } from "@/ws"

const EMPTY_ROOM_MESSAGES: RoomMessage[] = []
const toastOptions = { position: "top-center" as const }

// ─── Mappers ────────────────────────────────────────────────────────────────

export function toRoomMessage(message: ChatHistoryMessage): RoomMessage {
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

export function toRoomPreviewMessage(message: ChatHistoryMessage): RoomMessage {
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

export function formatMessageTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

// ─── useRoomPermissions ──────────────────────────────────────────────────────

function useRoomPermissions(
  room: RoomRecord | null,
  userId: string | undefined
) {
  const currentRoomMember = room?.members.find((m) => m.userId === userId)
  const canManageRoom = Boolean(
    userId &&
    (currentRoomMember?.role === "ADMIN" ||
      currentRoomMember?.role === "OWNER" ||
      room?.creatorId === userId)
  )
  return { canManageRoom }
}

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
    if (!roomId || !userId) return
    wsClient.joinRoom(roomId)
    let isCancelled = false

    const load = async () => {
      setIsLoading(true)
      try {
        const messages = (await fetchMessages(roomId, userId)).map(
          toRoomMessage
        )
        if (!isCancelled) setMessages(roomId, messages)
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
  }, [fetchMessages, roomId, setMessages, userId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [roomId, roomMessages])

  return { roomMessages, isLoading, messagesEndRef }
}

// ─── useReply ────────────────────────────────────────────────────────────────

function useReply(roomMessages: RoomMessage[]) {
  const [replyingTo, setReplyingTo] = useState<RoomMessage | null>(null)

  useEffect(() => {
    if (replyingTo && !roomMessages.some((m) => m.id === replyingTo.id)) {
      setReplyingTo(null)
    }
  }, [replyingTo, roomMessages])

  return {
    replyingTo,
    setReplyingTo,
    clearReply: () => setReplyingTo(null),
  }
}

// ─── useMembersPanel ─────────────────────────────────────────────────────────

function useMembersPanel(roomId: string | null) {
  const [showMembersPanel, setShowMembersPanel] = useState(false)

  useEffect(() => {
    setShowMembersPanel(false)
  }, [roomId])

  return {
    showMembersPanel,
    toggleMembersPanel: () => setShowMembersPanel((c) => !c),
    closeMembersPanel: () => setShowMembersPanel(false),
  }
}

// ─── useSendMessage ──────────────────────────────────────────────────────────

function useSendMessage(
  room: RoomRecord,
  userId: string,
  replyingTo: RoomMessage | null,
  onSent: () => void
) {
  const addMessage = useAppStore((s) => s.addMessage)
  const updateRoomLastMessage = useAppStore((s) => s.updateRoomLastMessage)
  const { createMessage } = useMessage()
  const [draft, setDraft] = useState("")
  const [isSending, setIsSending] = useState(false)

  async function sendMessage() {
    const text = draft.trim()
    if (!text || isSending || !userId) return
    setIsSending(true)

    try {
      const payload: CreateMessageInput["body"] = {
        sender: userId,
        roomId: room.id,
        text,
        parentId: replyingTo?.id,
      }
      const message = await createMessage(payload)
      addMessage(room.id, toRoomMessage(message))
      updateRoomLastMessage(room.id, toRoomPreviewMessage(message))
      setDraft("")
      onSent()
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ??
          error.response?.data?.message ??
          "Unable to send message")
        : "Unable to send message"
      toast.error(message, toastOptions)
    } finally {
      setIsSending(false)
    }
  }

  return { draft, setDraft, isSending, sendMessage }
}

// ─── useDeleteMessage ────────────────────────────────────────────────────────

function useDeleteMessage(
  roomId: string,
  userId: string,
  replyingTo: RoomMessage | null,
  onClearReply: () => void
) {
  const setMessages = useAppStore((s) => s.setMessages)
  const updateRoomLastMessage = useAppStore((s) => s.updateRoomLastMessage)
  const { deleteMessage, fetchMessages } = useMessage()
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(
    null
  )

  async function handleDeleteMessage(messageId: string) {
    if (deletingMessageId) return
    setDeletingMessageId(messageId)

    try {
      await deleteMessage(messageId)
      const refreshed = (await fetchMessages(roomId, userId)).map(toRoomMessage)
      setMessages(roomId, refreshed)
      const last = refreshed[refreshed.length - 1]
      if (last) updateRoomLastMessage(roomId, last)
      if (replyingTo?.id === messageId) onClearReply()
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
  }

  return { deletingMessageId, handleDeleteMessage }
}

// ─── useMessageMeta ──────────────────────────────────────────────────────────

function useMessageMeta(
  room: RoomRecord | null,
  userId: string | undefined,
  username: string | undefined,
  avatarUrl: string | null | undefined
) {
  function getAuthorName(message: RoomMessage) {
    return message.sender === userId
      ? (username ?? "You")
      : (message.senderUsername ?? room?.creator?.username ?? "Room member")
  }

  function getAuthorAvatar(message: RoomMessage) {
    return message.sender === userId
      ? (avatarUrl ?? undefined)
      : (message.senderAvatarUrl ?? room?.creator?.avatarUrl ?? undefined)
  }

  function getMessageBody(
    message?: Pick<RoomMessage, "text" | "isDeleted"> | null
  ) {
    if (!message) return "Original message unavailable"
    if (message.isDeleted) return "Message deleted"
    return message.text?.trim() ? message.text : "Attachment"
  }

  return { getAuthorName, getAuthorAvatar, getMessageBody }
}

// ─── useRoomMembers ───────────────────────────────────────────────────────────

export function useRoomMembers(
  room: RoomRecord,
  currentUserId: string | null,
  canManageRoom: boolean
) {
  const {
    addMembers,
    removeMember,
    getPendingJoinRequests,
    respondJoinRequest,
  } = useRooms()

  const [addMembersOpen, setAddMembersOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<RoomMemberRecord | null>(
    null
  )
  const [pendingRequests, setPendingRequests] = useState<
    RoomJoinRequestRecord[]
  >([])
  const [isLoadingPending, setIsLoadingPending] = useState(false)
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(
    null
  )
  const [usernamesInput, setUsernamesInput] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    if (!canManageRoom || !currentUserId) {
      setPendingRequests([])
      return
    }

    let isCancelled = false

    const fetchPending = async () => {
      setIsLoadingPending(true)
      try {
        const requests = await getPendingJoinRequests(room.id, currentUserId)
        if (!isCancelled) setPendingRequests(requests)
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
        if (!isCancelled) setIsLoadingPending(false)
      }
    }

    void fetchPending()
    return () => {
      isCancelled = true
    }
  }, [canManageRoom, currentUserId, getPendingJoinRequests, room.id])

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

  async function handleRespondJoinRequest(requestId: string, approve: boolean) {
    if (!currentUserId || processingRequestId) return
    setProcessingRequestId(requestId)

    try {
      const result = await respondJoinRequest(room.id, requestId, {
        actorUserId: currentUserId,
        approve,
      })
      if (result.room) useAppStore.getState().upsertRoom(result.room)
      setPendingRequests((curr) => curr.filter((r) => r.id !== requestId))
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

  return {
    addMembersOpen,
    setAddMembersOpen,
    removeTarget,
    setRemoveTarget,
    pendingRequests,
    isLoadingPending,
    processingRequestId,
    usernamesInput,
    setUsernamesInput,
    isAdding,
    isRemoving,
    handleAddMembers,
    handleRemoveMember,
    handleRespondJoinRequest,
  }
}

// ─── useEditRoom ─────────────────────────────────────────────────────────────

export function useEditRoom(room: RoomRecord) {
  const { updateRoom, deleteRoom } = useRooms()
  const [open, setOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleUpdateRoom(data: {
    name: string
    description: string
    isPrivate: "true" | "false"
  }) {
    try {
      const payload: EditRoomRequest["body"] = {
        name: data.name,
        description: data.description,
        isPrivate: data.isPrivate === "true",
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

  const { canManageRoom } = useRoomPermissions(room, user?.id)
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

  const { draft, setDraft, isSending, sendMessage } = useSendMessage(
    room!,
    user?.id ?? "",
    replyingTo,
    clearReply
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
    sendMessage,
    getAuthorName,
    getAuthorAvatar,
    getMessageBody,
  }
}
