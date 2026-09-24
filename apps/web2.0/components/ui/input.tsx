import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          "h-9 w-full min-w-0 rounded-[var(--radius-sketch-sm)] border border-line bg-paper px-3 py-1 text-sm text-ink shadow-2xs transition-[border-color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ink placeholder:text-ink-subtle focus-visible:border-[var(--pencil-teal)] focus-visible:ring-3 focus-visible:ring-[var(--pencil-teal-soft)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[var(--pencil-coral)] aria-invalid:ring-3 aria-invalid:ring-[var(--pencil-coral-soft)] md:text-sm",
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
