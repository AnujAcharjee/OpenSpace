"use client"

import { useEffect, useState } from "react"
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
} from "@tabler/icons-react"
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
import { type ChatHistoryMessage } from "@/hooks/useMessage"
import { useRooms } from "@/hooks/useRooms"
import { z } from "zod"
import { useChatSection } from "@/hooks/useChatSection"

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
const roomBodySchema = createRoomSchema.shape.body

const editRoomFormSchema = z.object({
  name: roomBodySchema.shape.name,
  description: roomBodySchema.shape.description,
  isPrivate: z.enum(["false", "true"]),
})

export default function ChatSection({ room }: { room: RoomRecord | null }) {
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
    sendMessage,
    getAuthorName,
    getAuthorAvatar,
    getMessageBody,
  } = useChatSection(room)

  if (!room) {
    return (
      <div className="h-full w-full p-1.5">
        <Card className="flex h-full w-full flex-col items-center justify-center border border-border/40 bg-card/40 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] p-6 text-center">
          <div className="flex flex-col items-center max-w-sm space-y-4">
            <div className="relative flex items-center justify-center py-2">
              <div className="pointer-events-none absolute -inset-6 rounded-full bg-[radial-gradient(circle,rgba(244,208,63,0.10)_0%,rgba(212,175,55,0.03)_55%,transparent_70%)] blur-xl" />
              <AppIcon size="lg" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                Welcome to Collab
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Select a channel from the sidebar or search to start collaborating.
              </p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-full w-full p-1.5">
      <Card className="flex h-full w-full flex-col gap-0 border border-border/40 bg-card/50 shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-md rounded-2xl p-0 overflow-hidden">
        <CardHeader className="flex items-center gap-2 border-b border-border/50 bg-card/40 px-2 pt-3 pb-3 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setActiveRoom(null)}
            className="group flex items-center justify-center rounded-lg p-1 text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground active:scale-95"
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
            className="rounded-lg transition hover:bg-muted/60"
            aria-label="View room members"
          >
            <Avatar className="h-8 w-8 shrink-0 border border-border">
              <AvatarImage src={room.name} alt={room.name} />
              <AvatarFallback className="text-xs">
                {room.name[0]}
              </AvatarFallback>
            </Avatar>
          </button>

          <button
            type="button"
            onClick={toggleMembersPanel}
            className="min-w-0 flex-1 rounded-lg px-1 py-0.5 text-left transition hover:bg-muted/60"
            aria-label="View room members"
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

          {canManageRoom && <DialogEditRoom room={room} />}
        </CardHeader>

        <CardContent className="min-h-0 flex-1 px-0 py-0 sm:px-1">
          {showMembersPanel ? (
            <RoomMembersPanel
              room={room}
              currentUserId={user?.id ?? null}
              canManageRoom={canManageRoom}
              onShowChat={closeMembersPanel}
            />
          ) : (
            <ScrollArea className="h-full p-0">
              <div className="space-y-2 px-3 py-2 sm:px-4">
                {isLoading && (
                  <div className="text-center text-sm text-muted-foreground">
                    Loading messages...
                  </div>
                )}
                {!isLoading && roomMessages.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground">
                    No messages yet. Start the conversation.
                  </div>
                )}
                {roomMessages.map((message) => {
                  const isOwn = message.sender === user?.id
                  const username = getAuthorName(message)
                  const avatar = getAuthorAvatar(message)
                  const parentMessage = message.parentId
                    ? roomMessagesById.get(message.parentId)
                    : undefined
                  const parentUsername = parentMessage
                    ? getAuthorName(parentMessage)
                    : undefined

                  return (
                    <MessageBubble
                      key={message.id}
                      username={username}
                      avatar={avatar}
                      parentId={message.parentId}
                      parentMessage={
                        message.parentId
                          ? {
                              id: parentMessage?.id ?? message.parentId,
                              username: parentUsername ?? "Original message",
                              message: parentMessage?.text,
                              isDeleted: parentMessage?.isDeleted,
                            }
                          : undefined
                      }
                      message={
                        message.isDeleted ? "Message deleted" : message.text
                      }
                      timestamp={formatMessageTime(message.createdAt)}
                      isOwn={isOwn}
                      canDelete={
                        isOwn &&
                        !message.isDeleted &&
                        deletingMessageId !== message.id
                      }
                      onReply={() => setReplyingTo(message)}
                      onDelete={() => void handleDeleteMessage(message.id)}
                    />
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          )}
        </CardContent>

        {!showMembersPanel && (
          <CardFooter className="flex gap-2 px-3 py-3">
            <form
              className="flex w-full items-end gap-1.5"
              onSubmit={(e) => {
                e.preventDefault()
                void sendMessage()
              }}
            >
              <div className="flex flex-1 flex-col gap-1.5">
                {replyingTo && (
                  <div className="flex items-start justify-between rounded-xl border border-primary/40 bg-muted/30 px-2.5 py-1.5">
                    <div className="min-w-0 border-l-2 border-primary/70 pl-3">
                      <div className="text-xs font-medium text-primary">
                        Replying to {getAuthorName(replyingTo)}
                      </div>
                      <div className="line-clamp-2 text-xs text-muted-foreground">
                        {getMessageBody(replyingTo)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearReply}
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                      aria-label="Cancel reply"
                    >
                      <IconX size={16} />
                    </button>
                  </div>
                )}

                <InputGroup className="h-9 w-full border border-primary/50">
                  <InputGroupInput
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={`Message ${room.name}`}
                    disabled={!user || isSending}
                  />
                  <InputGroupAddon>
                    <IconPaperclip
                      stroke={2}
                      height={20}
                      width={20}
                      className="cursor-not-allowed text-muted-foreground/60"
                    />
                    <IconMoodSmile
                      stroke={2}
                      height={20}
                      width={20}
                      className="cursor-not-allowed text-muted-foreground/60"
                    />
                  </InputGroupAddon>
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      type="submit"
                      variant="ghost"
                      size="icon-sm"
                      disabled={!user || !draft.trim() || isSending}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <IconBrandTelegram stroke={2} height={18} width={18} />
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
          </CardFooter>
        )}
      </Card>
    </div>
  )
}

function MessageBubble({
  username,
  avatar,
  parentId,
  parentMessage,
  message,
  timestamp,
  isOwn = false,
  canDelete = false,
  onReply,
  onDelete,
}: {
  username: string
  avatar?: string
  parentId?: string
  parentMessage?: MessageBubbleParent
  message?: string
  timestamp: string
  isOwn?: boolean
  canDelete?: boolean
  onReply: () => void
  onDelete: () => void
}) {
  const fallbackMessage = message?.trim() ? message : "Attachment"
  const fallbackParentMessage = parentMessage?.isDeleted
    ? "Message deleted"
    : parentMessage?.message?.trim()
      ? parentMessage.message
      : parentId
        ? "Original message unavailable"
        : ""

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={`flex items-end gap-1.5 ${isOwn ? "flex-row-reverse" : ""}`}
        >
          <Avatar className="h-6 w-6 shrink-0 border border-border">
            <AvatarImage src={avatar} alt={username} />
            <AvatarFallback className="text-xs">{username[0]}</AvatarFallback>
          </Avatar>

          <div
            className={`flex max-w-[70%] flex-col gap-1 ${isOwn ? "items-end" : "items-start"}`}
          >
            <div
              className={`rounded-[18px] px-3 py-1.5 text-xs leading-relaxed sm:text-sm ${
                isOwn
                  ? "rounded-br-4 bg-primary/80 text-primary-foreground"
                  : "rounded-bl-4 bg-muted text-foreground"
              }`}
            >
              {parentId && parentMessage && (
                <div
                  className={`mb-2 rounded-2xl border px-2.5 py-2 text-[11px] shadow-sm sm:text-xs ${
                    isOwn
                      ? "border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground ring-1 ring-primary-foreground/15"
                      : "border-border/60 bg-background/80 text-muted-foreground"
                  }`}
                >
                  <div
                    className={`mb-1 flex items-center gap-1.5 ${
                      isOwn ? "text-primary-foreground/90" : "text-primary"
                    }`}
                  >
                    <IconMessageReply size={12} />
                    <span className="font-semibold">
                      Replying to {parentMessage.username}
                    </span>
                  </div>
                  <div className="line-clamp-2 leading-relaxed break-words">
                    {fallbackParentMessage}
                  </div>
                </div>
              )}
              <div className="break-words whitespace-pre-wrap font-bold">
                {fallbackMessage}
              </div>
            </div>
            <div>
              {!isOwn && (
                <span className="px-1 text-[11px] text-muted-foreground">
                  {username}
                </span>
              )}
              <span className="px-1 text-[10px] text-muted-foreground">
                {timestamp}
              </span>
            </div>
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-44">
        <ContextMenuItem onSelect={onReply}>
          <IconMessageReply />
          Reply
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={onDelete}
          disabled={!canDelete}
          className="text-destructive focus:text-destructive"
        >
          <IconTrash />
          Delete
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem disabled={true}>
          <IconPinned />
          Pin
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

function DialogEditRoom({ room }: { room: RoomRecord }) {
  const { updateRoom: updateRoomRequest, deleteRoom: deleteRoomRequest } =
    useRooms()
  const [open, setOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const defaultValues: EditRoomFormInput = {
    name: room.name,
    description: room.description ?? "",
    isPrivate: room.isPrivate ? "true" : "false",
  }

  const roomFields: FieldConfig<EditRoomFormInput>[] = [
    {
      name: "name",
      label: "Room Name",
      placeholder: "my room",
      autoComplete: "off",
    },
    {
      name: "description",
      label: "Description",
      placeholder: "What this room is for",
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

  async function handleUpdateRoom(data: EditRoomFormInput) {
    try {
      const payload: EditRoomRequest["body"] = {
        name: data.name,
        description: data.description,
        isPrivate: data.isPrivate === "true",
      }
      const updatedRoom = await updateRoomRequest(room.id, payload)

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

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground active:scale-95"
            aria-label="Edit room"
          >
            <IconDotsVertical size={18} stroke={2} />
          </button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Room</DialogTitle>
            <DialogDescription>
              Update the room name, description, or visibility.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <AppForm
              key={`${room.id}-${room.updatedAt}`}
              formId={`edit-room-form-${room.id}`}
              schema={editRoomFormSchema}
              defaultValues={defaultValues}
              fields={roomFields}
              onSubmit={async (data) => {
                await handleUpdateRoom(data)
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
              Delete room
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Room?</DialogTitle>
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
  const {
    addMembers: addMembersRequest,
    removeMember: removeMemberRequest,
    getPendingJoinRequests: getPendingJoinRequestsRequest,
    respondJoinRequest: respondJoinRequestRequest,
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

    const fetchPendingRequests = async () => {
      setIsLoadingPending(true)

      try {
        const requests = await getPendingJoinRequestsRequest(
          room.id,
          currentUserId
        )

        if (!isCancelled) {
          setPendingRequests(requests)
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
  }, [canManageRoom, currentUserId, getPendingJoinRequestsRequest, room.id])

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

      setPendingRequests((current) =>
        current.filter((request) => request.id !== requestId)
      )
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
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border/50 px-3 py-2 sm:px-4">
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

        <ScrollArea className="h-full">
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
          </div>
        </ScrollArea>
      </div>

      <Dialog open={addMembersOpen} onOpenChange={setAddMembersOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add members</DialogTitle>
            <DialogDescription>
              Add one or more usernames. Use @username and separate multiple
              users with comma or space.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <input
              value={usernamesInput}
              onChange={(event) => setUsernamesInput(event.target.value)}
              placeholder="@alice, @bob"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none"
            />
            <Button
              type="button"
              className="w-full"
              onClick={() => void handleAddMembers()}
              disabled={isAdding || !usernamesInput.trim()}
            >
              {isAdding ? "Adding..." : "Add member"}
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
              room?
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
