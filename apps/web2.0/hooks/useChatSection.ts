import { useEffect, useRef, useState, useCallback } from "react"
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
import { uploadChatAttachment, type ChatAttachment } from "@/utils/cloudinary"

export interface StagedAttachment {
  file: File
  previewUrl: string
  type: "IMAGE" | "PDF" | "FILE"
  name: string
  size: number
}

const EMPTY_ROOM_MESSAGES: RoomMessage[] = []
const EMPTY_JOIN_REQUESTS: RoomJoinRequestRecord[] = []
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
    if (!roomId) return
    wsClient.joinRoom(roomId)
    let isCancelled = false

    const load = async () => {
      const cached = useAppStore.getState().messages[roomId]
      if (!cached || cached.length === 0) {
        setIsLoading(true)
      }

      try {
        const messages = (await fetchMessages(roomId, userId ?? "")).map(
          toRoomMessage
        )
        if (!isCancelled) setMessages(roomId, messages)
      } catch (error) {
        console.warn("Unable to load messages:", error)
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
  }, [roomId, roomMessages.length])

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

// ─── useSendMessage with Browser Draft Caching ──────────────────────────────

function useSendMessage(
  room: RoomRecord | null,
  userId: string,
  replyingTo: RoomMessage | null,
  onSent: () => void,
  currentUser?: { username?: string; avatarUrl?: string | null } | null
) {
  const addMessage = useAppStore((s) => s.addMessage)
  const replaceMessage = useAppStore((s) => s.replaceMessage)
  const updateMessageStatus = useAppStore((s) => s.updateMessageStatus)
  const updateRoomLastMessage = useAppStore((s) => s.updateRoomLastMessage)
  const storeDraft = useAppStore((s) => (room ? s.drafts[room.id] ?? "" : ""))
  const setRoomDraft = useAppStore((s) => s.setRoomDraft)
  const { createMessage } = useMessage()

  const [draft, setDraftState] = useState(storeDraft)
  const [isSending, setIsSending] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [stagedAttachment, setStagedAttachment] = useState<StagedAttachment | null>(null)

  // Sync draft when room switches
  useEffect(() => {
    if (room) {
      setDraftState(useAppStore.getState().drafts[room.id] ?? "")
    } else {
      setDraftState("")
    }
  }, [room?.id])

  const setDraft = useCallback((value: string) => {
    setDraftState(value)
    if (room) {
      setRoomDraft(room.id, value)
    }
  }, [room, setRoomDraft])

  const clearStagedAttachment = () => {
    if (stagedAttachment?.previewUrl) {
      URL.revokeObjectURL(stagedAttachment.previewUrl)
    }
    setStagedAttachment(null)
    setUploadProgress(0)
  }

  const stageAttachment = (file: File) => {
    const isImage = file.type.startsWith("image/")
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")

    if (!isImage && !isPdf) {
      toast.error("Only images and PDFs are supported", toastOptions)
      return
    }

    const MAX_SIZE_BYTES = 25 * 1024 * 1024 // 25 MB
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("File size exceeds 25 MB limit", toastOptions)
      return
    }

    if (stagedAttachment?.previewUrl) {
      URL.revokeObjectURL(stagedAttachment.previewUrl)
    }

    const previewUrl = isImage ? URL.createObjectURL(file) : ""
    setStagedAttachment({
      file,
      previewUrl,
      type: isImage ? "IMAGE" : isPdf ? "PDF" : "FILE",
      name: file.name,
      size: file.size,
    })
    setUploadProgress(0)
  }

  async function sendMessage(textOverride?: string) {
    if (!room) return
    const text = (textOverride !== undefined ? textOverride : draft).trim()
    if ((!text && !stagedAttachment) || !userId) return

    const pendingAttachment = stagedAttachment
    const replyTarget = replyingTo
    const optimisticId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    // Create optimistic message to display immediately in the UI (0ms instant feel)
    const optimisticMessage: RoomMessage = {
      id: optimisticId,
      sender: userId,
      roomId: room.id,
      text: text.length > 0 ? text : undefined,
      attachments: pendingAttachment
        ? JSON.stringify([
            {
              id: `temp-att-${Date.now()}`,
              url: pendingAttachment.previewUrl || "",
              name: pendingAttachment.name,
              size: pendingAttachment.size,
              mimeType: pendingAttachment.file.type,
              type: pendingAttachment.type,
            },
          ])
        : undefined,
      type: pendingAttachment
        ? pendingAttachment.type === "IMAGE"
          ? "IMAGE"
          : "FILE"
        : "TEXT",
      parentId: replyTarget?.id,
      parent: replyTarget
        ? {
            id: replyTarget.id,
            text: replyTarget.text,
            senderUsername: replyTarget.senderUsername,
            isDeleted: replyTarget.isDeleted,
          }
        : undefined,
      senderUsername: currentUser?.username || "You",
      senderAvatarUrl: currentUser?.avatarUrl,
      createdAt: new Date().toISOString(),
      isDeleted: false,
      status: "sending",
    }

    // Instantly add message to UI & clear inputs
    addMessage(room.id, optimisticMessage)
    updateRoomLastMessage(room.id, toRoomPreviewMessage(optimisticMessage))
    setDraft("")
    setStagedAttachment(null)
    onSent()
    if (pendingAttachment) {
      setIsSending(true)
    }

    try {
      let uploadedAttachment: ChatAttachment | null = null

      if (pendingAttachment) {
        uploadedAttachment = await uploadChatAttachment(
          pendingAttachment.file,
          (progress) => setUploadProgress(progress)
        )
      }

      const payload: CreateMessageInput["body"] = {
        sender: userId,
        roomId: room.id,
        text: text.length > 0 ? text : undefined,
        attachments: uploadedAttachment ? JSON.stringify([uploadedAttachment]) : undefined,
        type: uploadedAttachment
          ? uploadedAttachment.type === "IMAGE"
            ? "IMAGE"
            : "FILE"
          : "TEXT",
        parentId: replyTarget?.id,
      }

      const message = await createMessage(payload)
      if (pendingAttachment?.previewUrl) {
        URL.revokeObjectURL(pendingAttachment.previewUrl)
      }

      // Replace optimistic message with confirmed server message
      replaceMessage(room.id, optimisticId, {
        ...toRoomMessage(message),
        status: "sent",
      })
      updateRoomLastMessage(room.id, toRoomPreviewMessage(message))
    } catch (error) {
      console.warn("Send message failed:", error)
      // Mark as failed in UI so "Not sent" in red is shown under message
      updateMessageStatus(room.id, optimisticId, "failed")
    } finally {
      if (pendingAttachment) {
        setIsSending(false)
        setUploadProgress(0)
      }
    }
  }

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

// ─── useDeleteMessage ────────────────────────────────────────────────────────

function useDeleteMessage(
  roomId: string,
  userId: string,
  replyingTo: RoomMessage | null,
  onClearReply: () => void
) {
  const removeMessage = useAppStore((s) => s.removeMessage)
  const setMessages = useAppStore((s) => s.setMessages)
  const { deleteMessage, fetchMessages } = useMessage()
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(
    null
  )

  async function handleDeleteMessage(messageId: string) {
    if (deletingMessageId) return
    setDeletingMessageId(messageId)

    // Instantly remove from local store for 0ms feedback
    removeMessage(roomId, messageId)
    if (replyingTo?.id === messageId) onClearReply()

    try {
      await deleteMessage(messageId)
      toast.success("Message deleted", toastOptions)
    } catch (error) {
      try {
        const refreshed = (await fetchMessages(roomId, userId)).map(toRoomMessage)
        setMessages(roomId, refreshed)
      } catch {}

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
    if (message.sender === userId) {
      return username ?? "You"
    }

    if (message.senderUsername && message.senderUsername !== "Unknown") {
      return message.senderUsername
    }

    const member = room?.members?.find(
      (m) => m.userId === message.sender || m.user?.id === message.sender
    )
    if (member?.user?.username) {
      return member.user.username
    }

    if (room?.creatorId === message.sender && room.creator?.username) {
      return room.creator.username
    }

    return "Room member"
  }

  function getAuthorAvatar(message: RoomMessage) {
    if (message.sender === userId) {
      return avatarUrl ?? undefined
    }

    if (message.senderAvatarUrl) {
      return message.senderAvatarUrl
    }

    const member = room?.members?.find(
      (m) => m.userId === message.sender || m.user?.id === message.sender
    )
    if (member?.user?.avatarUrl) {
      return member.user.avatarUrl
    }

    if (room?.creatorId === message.sender && room.creator?.avatarUrl) {
      return room.creator.avatarUrl
    }

    return undefined
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

  const pendingRequests = useAppStore(
    (s) => s.joinRequests[room.id] ?? EMPTY_JOIN_REQUESTS
  )
  const setStoreJoinRequests = useAppStore((s) => s.setJoinRequests)
  const removeStoreJoinRequest = useAppStore((s) => s.removeJoinRequest)

  const [addMembersOpen, setAddMembersOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<RoomMemberRecord | null>(
    null
  )
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

    const fetchPending = async () => {
      setIsLoadingPending(true)
      try {
        const requests = await getPendingJoinRequests(room.id, currentUserId)
        if (!isCancelled) setStoreJoinRequests(room.id, requests)
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
  }, [canManageRoom, currentUserId, getPendingJoinRequests, room.id, setStoreJoinRequests])

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
