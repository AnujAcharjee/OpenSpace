"use client"

import { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { IconSearch, IconX, IconUserPlus, IconCheck } from "@tabler/icons-react"
import { toast } from "sonner"
import axios from "axios"
import { usersApiUrl } from "@/constants/apiUrls"
import { useRooms } from "@/hooks/useRooms"
import useAppStore from "@/stores/app-store"
import type { RoomRecord, UserRecord } from "@repo/validation"

const toastOptions = { position: "top-center" as const }

interface DialogAddMembersProps {
  room: RoomRecord
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DialogAddMembers({
  room,
  open,
  onOpenChange,
}: DialogAddMembersProps) {
  const { addMembers } = useRooms()
  const [query, setQuery] = useState("")
  const [selectedUsernames, setSelectedUsernames] = useState<string[]>([])
  const [searchResults, setSearchResults] = useState<UserRecord[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const existingMemberUsernames = new Set(
    room.members.map((m) => m.user?.username?.toLowerCase()).filter(Boolean)
  )

  useEffect(() => {
    if (!open) {
      setQuery("")
      setSelectedUsernames([])
      setSearchResults([])
    }
  }, [open])

  useEffect(() => {
    const trimmed = query.trim().replace(/^@+/, "")
    if (!trimmed) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await axios.get<{ data?: { users?: UserRecord[] } }>(
          `${usersApiUrl}/search`,
          {
            params: { q: trimmed },
            withCredentials: true,
          }
        )
        setSearchResults(res.data.data?.users ?? [])
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [query])

  function toggleSelectUsername(username: string) {
    setSelectedUsernames((current) =>
      current.includes(username)
        ? current.filter((u) => u !== username)
        : [...current, username]
    )
  }

  function handleManualAdd() {
    const raw = query.trim().replace(/^@+/, "")
    if (raw && !selectedUsernames.includes(raw)) {
      setSelectedUsernames((prev) => [...prev, raw])
      setQuery("")
    }
  }

  async function handleSubmit() {
    const usernames = [...new Set(selectedUsernames)].filter(Boolean)
    if (!usernames.length || isSubmitting) return

    setIsSubmitting(true)
    try {
      const { room: updatedRoom, addedCount } = await addMembers(room.id, usernames)
      useAppStore.getState().upsertRoom(updatedRoom)
      setSelectedUsernames([])
      setQuery("")
      onOpenChange(false)
      toast.success(
        addedCount > 0
          ? `${addedCount} member(s) added to #${room.name}`
          : "Members already in channel",
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
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-5 rounded-[var(--radius-sketch-md)]">
        <DialogHeader className="space-y-1">
          <DialogTitle className="font-display text-base font-semibold flex items-center gap-2 text-ink">
            <IconUserPlus size={18} className="text-[var(--pencil-teal)]" />
            Add members to #{room.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-ink-muted">
            Search users by username or name to invite them directly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Selected Chips */}
          {selectedUsernames.length > 0 && (
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 rounded-[var(--radius-sketch-sm)] bg-paper-subtle border border-line">
              {selectedUsernames.map((uname) => (
                <span
                  key={uname}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--pencil-teal-soft)] text-[var(--pencil-teal)] border border-[var(--pencil-teal)]/30 animate-in fade-in-50 zoom-in-95"
                >
                  @{uname}
                  <button
                    type="button"
                    onClick={() => toggleSelectUsername(uname)}
                    className="hover:text-[var(--pencil-coral)] transition-colors ml-0.5 cursor-pointer"
                    aria-label={`Remove ${uname}`}
                  >
                    <IconX size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search Input */}
          <div className="relative flex items-center">
            <IconSearch
              size={15}
              className="absolute left-3 text-ink-muted pointer-events-none"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleManualAdd()
                }
              }}
              placeholder="Search @username or name..."
              className="w-full h-10 pl-9 pr-20 rounded-[var(--radius-sketch-sm)] border border-line bg-paper text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-[var(--pencil-teal)] focus:ring-1 focus:ring-[var(--pencil-teal)] transition"
            />
            {query.trim() && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleManualAdd}
                className="absolute right-1.5 h-7 px-2 text-xs font-semibold text-[var(--pencil-teal)] hover:bg-[var(--pencil-teal-soft)] rounded-[var(--radius-sketch-sm)] cursor-pointer"
              >
                + Add
              </Button>
            )}
          </div>

          {/* Search Results / Suggestions */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {isSearching && (
              <div className="text-center py-4 text-xs text-ink-muted">
                Searching users...
              </div>
            )}

            {!isSearching && query.trim() && searchResults.length === 0 && (
              <div className="text-center py-3 text-xs text-ink-muted">
                No user matches found. Press <strong>+ Add</strong> to invite @{query.trim().replace(/^@+/, "")} directly.
              </div>
            )}

            {!isSearching &&
              searchResults.map((user) => {
                const isAlreadyMember = existingMemberUsernames.has(
                  user.username.toLowerCase()
                )
                const isSelected = selectedUsernames.includes(user.username)

                return (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-2 rounded-[var(--radius-sketch-sm)] border transition cursor-pointer ${
                      isSelected
                        ? "border-[var(--pencil-teal)] bg-[var(--pencil-teal-soft)]/40"
                        : "border-line bg-paper-subtle hover:bg-surface-hover"
                    }`}
                    onClick={() => {
                      if (!isAlreadyMember) {
                        toggleSelectUsername(user.username)
                      }
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage src={user.avatarUrl ?? undefined} alt={user.username} />
                        <AvatarFallback className="text-[11px] font-semibold">
                          {user.username[0]?.toUpperCase() ?? "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate text-ink flex items-center gap-1.5">
                          {user.name || user.username}
                          {user.name && (
                            <span className="text-[10px] text-ink-muted font-normal">
                              @{user.username}
                            </span>
                          )}
                        </div>
                        {user.bio && (
                          <div className="text-[10px] text-ink-muted truncate max-w-[200px]">
                            {user.bio}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      {isAlreadyMember ? (
                        <span className="text-[10px] font-medium text-ink-muted px-2 py-0.5 rounded-[var(--radius-sketch-sm)] bg-paper-dark">
                          Joined
                        </span>
                      ) : isSelected ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--pencil-teal)] px-2 py-0.5 rounded-[var(--radius-sketch-sm)] bg-[var(--pencil-teal-soft)]">
                          <IconCheck size={12} /> Selected
                        </span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[11px] rounded-[var(--radius-sketch-sm)] cursor-pointer"
                        >
                          + Select
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>

          {/* Action Footer */}
          <div className="flex items-center gap-2 pt-2 border-t border-line">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-9 rounded-[var(--radius-sketch-sm)] text-xs"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1 h-9 rounded-[var(--radius-sketch-sm)] text-xs font-semibold shadow-2xs cursor-pointer"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting || selectedUsernames.length === 0}
            >
              {isSubmitting
                ? "Adding..."
                : selectedUsernames.length > 0
                  ? `Add (${selectedUsernames.length})`
                  : "Add Members"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
