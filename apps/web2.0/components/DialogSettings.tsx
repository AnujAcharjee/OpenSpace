"use client"

import { useState, useRef } from "react"
import { IconSettings, IconCamera, IconPencil, IconArrowLeft } from "@tabler/icons-react"
import { useTheme } from "next-themes"
import { editUserBodySchema } from "@repo/validation"
import useAppStore from "@/stores/app-store"
import { useShallow } from "zustand/react/shallow"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { optimizeImage } from "@/utils/image"
import { uploadToCloudinary } from "@/utils/cloudinary"
import { usersApiUrl } from "@/constants/apiUrls"
import axios from "axios"
import AppForm, { type FieldConfig } from "@/components/AppForm"

const toastOptions = {
  position: "top-center" as const,
}

export function DialogSettings() {
  const { user, setUser } = useAppStore(
    useShallow((state) => ({
      user: state.user,
      setUser: state.setUser,
    }))
  )
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"profile" | "appearance">("profile")
  const [isEditing, setIsEditing] = useState(false)
  const { theme, setTheme } = useTheme()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!user) return null

  const userId = user.id

  const defaultProfileValues = {
    name: user.name || "",
    username: user.username || "",
    bio: user.bio || "",
  }

  const profileFields: FieldConfig<any>[] = [
    {
      name: "name",
      label: "Full Name",
      placeholder: "e.g. John Doe",
      autoComplete: "name",
    },
    {
      name: "username",
      label: "Username",
      placeholder: "e.g. johndoe",
      autoComplete: "username",
    },
    {
      name: "bio",
      label: "Bio",
      placeholder: "Tell us a bit about yourself",
      autoComplete: "off",
    },
  ]

  async function handleEditProfile(data: any) {
    try {
      setIsUploading(true)
      let finalAvatarUrl: string | null = user?.avatarUrl || null

      if (removePhoto) {
        finalAvatarUrl = null
      } else if (selectedFile) {
        const optimizedBlob = await optimizeImage(selectedFile)
        finalAvatarUrl = await uploadToCloudinary(optimizedBlob)
      }

      const cleanUsername = data.username ? String(data.username).trim().replace(/^@+/, "") : ""
      const currentCleanUsername = user?.username ? String(user.username).trim().replace(/^@+/, "") : ""

      const payload: Record<string, any> = {
        name: data.name?.trim() || null,
        bio: data.bio?.trim() || null,
        avatarUrl: finalAvatarUrl,
      }

      // Only send username if it actually changed to avoid redundant uniqueness conflicts
      if (cleanUsername && cleanUsername.toLowerCase() !== currentCleanUsername.toLowerCase()) {
        payload.username = cleanUsername
      }

      const res = await axios.patch(`${usersApiUrl}/${userId}`, payload, {
        withCredentials: true,
      })

      setUser(res.data.data.user)
      toast.success("Profile updated successfully", toastOptions)
      setIsEditing(false)

      setSelectedFile(null)
      setPreviewUrl(null)
      setRemovePhoto(false)
    } catch (error: any) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.response?.data?.message ?? "Failed to update profile")
        : (error.message || "Failed to update profile")
      toast.error(message, toastOptions)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val)
        if (!val) {
          setIsEditing(false)
          setSelectedFile(null)
          setPreviewUrl(null)
          setRemovePhoto(false)
        }
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Settings"
              className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sketch-sm)] text-ink-muted transition-all hover:bg-surface-hover hover:text-ink"
            >
              <IconSettings size={18} />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Settings</p>
        </TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-semibold">Settings</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 border-b border-line pb-2">
          <Button
            type="button"
            variant="ghost"
            className={`px-3 py-1 text-xs font-semibold rounded-[var(--radius-sketch-sm)] cursor-pointer ${
              activeTab === "profile" ? "bg-surface-hover text-ink border border-line" : "text-ink-muted hover:bg-surface-hover/50"
            }`}
            onClick={() => setActiveTab("profile")}
          >
            Profile
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={`px-3 py-1 text-xs font-semibold rounded-[var(--radius-sketch-sm)] cursor-pointer ${
              activeTab === "appearance" ? "bg-surface-hover text-ink border border-line" : "text-ink-muted hover:bg-surface-hover/50"
            }`}
            onClick={() => setActiveTab("appearance")}
          >
            Appearance
          </Button>
        </div>

        <div className="mt-4 min-h-[300px]">
          {activeTab === "profile" && (
            <div className="space-y-4">
              {!isEditing ? (
                /* Profile Display View */
                <div className="flex flex-col items-center gap-3 py-1">
                  {/* User Avatar */}
                  <div className="size-24 overflow-hidden rounded-[var(--radius-sketch-md)] border-2 border-line bg-paper-dark shadow-sm">
                    <img
                      src={
                        user.avatarUrl ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || user.username)}`
                      }
                      alt={user.name || user.username}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Edit Button with Icon directly under user avatar */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 rounded-[var(--radius-sketch-sm)] text-xs font-semibold hover:border-[var(--pencil-teal)] cursor-pointer"
                  >
                    <IconPencil size={13} stroke={2} />
                    <span>Edit Profile</span>
                  </Button>

                  {/* User Profile Information */}
                  <div className="w-full space-y-3 pt-2">
                    <div className="flex flex-col items-center text-center">
                      <h3 className="font-display text-lg font-bold text-ink">
                        {user.name || user.username}
                      </h3>
                      <span className="text-xs text-ink-muted font-mono">
                        @{user.username}
                      </span>
                    </div>

                    {user.bio?.trim() ? (
                      <div className="rounded-[var(--radius-sketch-sm)] border border-line bg-paper-subtle p-3 text-center">
                        <p className="text-xs text-ink italic leading-relaxed">
                          &ldquo;{user.bio.trim()}&rdquo;
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-[var(--radius-sketch-sm)] border border-dashed border-line p-3 text-center">
                        <p className="text-xs text-ink-subtle italic">No bio added yet</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1 text-left">
                      <div className="rounded-[var(--radius-sketch-sm)] border border-line bg-paper-subtle p-2.5">
                        <div className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider">
                          Username
                        </div>
                        <div className="text-xs font-semibold text-ink truncate mt-0.5">
                          {user.username}
                        </div>
                      </div>
                      <div className="rounded-[var(--radius-sketch-sm)] border border-line bg-paper-subtle p-2.5">
                        <div className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider">
                          Status
                        </div>
                        <div className="text-xs font-semibold text-ink truncate mt-0.5 flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-[var(--pencil-green)]" />
                          <span>Active Member</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Edit Profile Form View */
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false)
                        setSelectedFile(null)
                        setPreviewUrl(null)
                        setRemovePhoto(false)
                      }}
                      className="flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink cursor-pointer p-0"
                    >
                      <IconArrowLeft size={14} />
                      <span>Back to Profile</span>
                    </Button>
                  </div>

                  {/* Profile Avatar Upload */}
                  <div className="flex flex-col items-center gap-3">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="group relative size-24 cursor-pointer overflow-hidden rounded-[var(--radius-sketch-md)] border-2 border-line bg-paper-dark shadow-sm transition-all hover:border-[var(--pencil-teal)]"
                    >
                      <img
                        src={
                          removePhoto
                            ? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || user.username)}`
                            : previewUrl || user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || user.username)}`
                        }
                        alt="Profile preview"
                        className="h-full w-full object-cover"
                      />

                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <IconCamera className="size-6 text-paper" />
                        <span className="mt-1 text-[10px] font-semibold text-paper">Upload</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs font-semibold rounded-[var(--radius-sketch-sm)] cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Change photo
                      </Button>

                      {(!removePhoto && (previewUrl || user.avatarUrl)) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs font-semibold rounded-[var(--radius-sketch-sm)] text-[var(--pencil-coral)] hover:bg-[var(--pencil-coral-soft)] cursor-pointer"
                          onClick={() => {
                            setSelectedFile(null)
                            setPreviewUrl(null)
                            setRemovePhoto(true)
                          }}
                        >
                          Remove photo
                        </Button>
                      )}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setSelectedFile(file)
                          const objectUrl = URL.createObjectURL(file)
                          setPreviewUrl(objectUrl)
                          setRemovePhoto(false)
                        }
                      }}
                    />
                  </div>

                  {/* Edit Profile Text Form */}
                  <AppForm
                    formId="edit-profile-form"
                    schema={editUserBodySchema}
                    defaultValues={defaultProfileValues}
                    fields={profileFields}
                    onSubmit={handleEditProfile}
                    submitLabel={isUploading ? "Uploading & saving..." : "Save changes"}
                    pendingLabel="Saving changes..."
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <span className="font-display text-sm font-semibold text-ink">Select Theme</span>
                <span className="text-xs text-ink-muted">
                  Customize OpenSpace&apos;s stationery aesthetic to your taste.
                </span>
                <div className="flex gap-2 mt-2">
                  {(["light", "dark", "system"] as const).map((t) => (
                    <Button
                      key={t}
                      type="button"
                      variant={theme === t ? "default" : "outline"}
                      className="px-4 py-2 capitalize font-semibold rounded-[var(--radius-sketch-sm)]"
                      onClick={() => setTheme(t)}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
