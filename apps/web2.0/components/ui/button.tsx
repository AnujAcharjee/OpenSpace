"use client"

import * as React from "react"
import { Slot } from "radix-ui"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-xs font-semibold tracking-tight transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 active:translate-y-[1px]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-[var(--pencil-teal)] to-[color-mix(in_srgb,var(--pencil-teal)_80%,#152636)] text-white hover:brightness-105 border border-[var(--pencil-teal)]/60 shadow-[0_2px_8px_-2px_rgba(109,148,197,0.35)] dark:shadow-[0_2px_10px_-2px_rgba(69,128,180,0.35)] active:translate-y-[1px]",
        coral:
          "bg-gradient-to-br from-[var(--pencil-coral)] to-[color-mix(in_srgb,var(--pencil-coral)_80%,#802a20)] text-white hover:brightness-105 border border-[var(--pencil-coral)]/60 shadow-[0_2px_8px_-2px_rgba(200,92,80,0.35)] active:translate-y-[1px]",
        destructive:
          "bg-gradient-to-br from-[var(--pencil-coral)] to-[color-mix(in_srgb,var(--pencil-coral)_80%,#802a20)] text-white hover:brightness-105 border border-[var(--pencil-coral)]/60 shadow-[0_2px_8px_-2px_rgba(200,92,80,0.35)] active:translate-y-[1px]",
        outline:
          "border-1.5 border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-hover)] hover:border-[var(--ink-muted)] shadow-2xs",
        secondary:
          "bg-gradient-to-br from-[var(--paper-subtle)] to-[var(--paper-dark)] text-[var(--ink)] border border-[var(--line)] hover:brightness-95 dark:hover:brightness-110",
        ghost:
          "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-dark)] rounded-md",
        link:
          "text-[var(--pencil-blue)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 rounded-[10px_8px_11px_9px]",
        sm: "h-7.5 px-3 rounded-[8px_6px_9px_7px] text-[11px]",
        lg: "h-11 px-6 rounded-[14px_11px_15px_12px] text-sm",
        icon: "h-9 w-9 rounded-[10px_8px_11px_9px]",
        "icon-sm": "h-7.5 w-7.5 rounded-[8px_6px_9px_7px]",
        "icon-xs": "h-6 w-6 rounded-[6px] p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot.Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
