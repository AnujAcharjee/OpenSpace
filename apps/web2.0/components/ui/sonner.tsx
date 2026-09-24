"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  IconCircleCheck,
  IconInfoCircle,
  IconAlertTriangle,
  IconAlertOctagon,
  IconLoader,
} from "@tabler/icons-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <IconCircleCheck className="size-4 text-[var(--pencil-green)]" />,
        info: <IconInfoCircle className="size-4 text-[var(--pencil-blue)]" />,
        warning: <IconAlertTriangle className="size-4 text-[var(--pencil-yellow)]" />,
        error: <IconAlertOctagon className="size-4 text-[var(--pencil-coral)]" />,
        loading: <IconLoader className="size-4 animate-spin text-[var(--pencil-teal)]" />,
      }}
      style={
        {
          "--normal-bg": "var(--paper)",
          "--normal-text": "var(--ink)",
          "--normal-border": "var(--line)",
          "--border-radius": "12px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast font-sans border border-line shadow-md rounded-[var(--radius-sketch-md)] bg-paper text-ink",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
