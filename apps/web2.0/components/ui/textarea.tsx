import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-[var(--radius-sketch-sm)] border border-line bg-paper px-3 py-2 text-sm text-ink shadow-2xs transition-[border-color,box-shadow] outline-none placeholder:text-ink-subtle focus-visible:border-[var(--pencil-teal)] focus-visible:ring-3 focus-visible:ring-[var(--pencil-teal-soft)] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[var(--pencil-coral)] aria-invalid:ring-3 aria-invalid:ring-[var(--pencil-coral-soft)] md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
