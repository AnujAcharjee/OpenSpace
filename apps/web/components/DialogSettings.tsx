"use client"

import { useState, useRef } from "react"
import { IconSettings, IconCamera } from "@tabler/icons-react"
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
        toast.info("Optimizing profile photo...", toastOptions)
        const optimizedBlob = await optimizeImage(selectedFile)

        toast.info("Uploading photo to Cloudinary...", toastOptions)
        finalAvatarUrl = await uploadToCloudinary(optimizedBlob)
      }

      const payload = {
        name: data.name?.trim() || null,
        username: data.username.trim(),
        bio: data.bio?.trim() || null,
        avatarUrl: finalAvatarUrl,
      }

      const res = await axios.patch(`${usersApiUrl}/${userId}`, payload, {
        withCredentials: true,
      })

      setUser(res.data.data.user)
      toast.success("Profile updated successfully", toastOptions)
      setOpen(false)

      setSelectedFile(null)
      setPreviewUrl(null)
      setRemovePhoto(false)
    } catch (error: any) {
      console.error(error)
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.response?.data?.message ?? "Failed to update profile")
        : (error.message || "Failed to update profile")
      toast.error(message, toastOptions)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Settings"
              className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
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
          <DialogTitle className="text-2xl font-bold">Settings</DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 border-b border-border/40 pb-2">
          <Button
            type="button"
            variant="ghost"
            className={`px-3 py-1 text-sm font-semibold rounded-lg ${
              activeTab === "profile" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/40"
            }`}
            onClick={() => setActiveTab("profile")}
          >
            Edit Profile
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={`px-3 py-1 text-sm font-semibold rounded-lg ${
              activeTab === "appearance" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/40"
            }`}
            onClick={() => setActiveTab("appearance")}
          >
            Appearance
          </Button>
        </div>

        <div className="mt-4 min-h-[300px]">
          {activeTab === "profile" && (
            <div className="space-y-6">
              {/* Profile Avatar Upload */}
              <div className="flex flex-col items-center gap-3">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative size-24 cursor-pointer overflow-hidden rounded-full border-2 border-border/40 bg-muted shadow-md transition-all hover:border-primary hover:shadow-lg animate-fade-in"
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

                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <IconCamera className="size-6 text-white" />
                    <span className="mt-1 text-[10px] font-semibold text-white">Upload</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs font-semibold rounded-lg cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change photo
                  </Button>

                  {(!removePhoto && (previewUrl || user.avatarUrl)) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs font-semibold rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer"
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

          {activeTab === "appearance" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-foreground">Select Theme</span>
                <span className="text-xs text-muted-foreground">
                  Customize Collab's aesthetic to your taste.
                </span>
                <div className="flex gap-2 mt-2">
                  {(["light", "dark", "system"] as const).map((t) => (
                    <Button
                      key={t}
                      type="button"
                      variant={theme === t ? "default" : "outline"}
                      className="px-4 py-2 capitalize font-semibold rounded-xl"
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
