"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AppIcon } from "@/components/AppIcon"
import type { UserRecord } from "@repo/validation"

interface ChatOnboardingProps {
  user: UserRecord | null
}

interface OnboardingStep {
  title: string
  description: string
  buttonText: string
}

export function ChatOnboarding({ user }: ChatOnboardingProps) {
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (!user) return

    const storageKey = `openspace_onboarding_completed_${user.id}`
    const hasCompleted = localStorage.getItem(storageKey)

    if (!hasCompleted) {
      const timer = setTimeout(() => {
        setOpen(true)
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [user])

  function handleComplete() {
    if (user) {
      localStorage.setItem(`openspace_onboarding_completed_${user.id}`, "true")
    }
    setOpen(false)
  }

  function handleSkip() {
    handleComplete()
  }

  const STEPS: OnboardingStep[] = [
    {
      title: "Welcome to OpenSpace",
      description:
        "OpenSpace is where people come together around the things they care about. Find a channel that catches your interest or start one of your own, and talk about it with your people.",
      buttonText: "Next",
    },
    {
      title: "Explore Channels",
      description:
        "Click Explore in the sidebar to browse channels by topic tags like Dev, Design, and Tech, or search directly for conversations that interest you.",
      buttonText: "Next",
    },
    {
      title: "Create Channels",
      description:
        "Start your own channel anytime using the Create button in the sidebar. Set topic tags, customize visibility, and invite others to collaborate.",
      buttonText: "Next",
    },
    {
      title: "Real-Time Messaging",
      description:
        "Send instant messages with optimistic caching, react with emojis, reply in threads, and see active members in real time.",
      buttonText: "Get Started",
    },
  ]

  function handleNext() {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      handleComplete()
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  if (!user) return null

  const step = STEPS[currentStep]
  const isLastStep = currentStep === STEPS.length - 1

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleComplete() }}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md h-[320px] p-0 overflow-hidden border border-line bg-paper shadow-xl rounded-[var(--radius-sketch-lg)] flex flex-col justify-between">
        {/* Top Header with small app icon and name */}
        <div className="pt-6 px-6 flex flex-col items-center text-center">
          <div className="mb-2.5">
            <AppIcon size="sm" />
          </div>
          <DialogTitle className="font-display text-xl sm:text-2xl font-bold tracking-tight text-ink">
            {step.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {step.description}
          </DialogDescription>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-xs sm:text-sm text-ink/80 leading-relaxed max-w-sm font-sans">
            {step.description}
          </p>

          {/* Subtle Indicator Dots */}
          <div className="flex items-center justify-center gap-1.5 pt-4">
            {STEPS.map((_, idx) => (
              <div
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                  idx === currentStep
                    ? "w-5 bg-[var(--pencil-teal)]"
                    : "w-1.5 bg-line-strong hover:bg-ink-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="h-14 px-5 bg-paper-subtle border-t border-line flex items-center justify-between">
          <div>
            {!isLastStep ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-xs text-ink-muted hover:text-ink cursor-pointer h-8 px-2.5"
              >
                Skip
              </Button>
            ) : (
              <div className="w-12" />
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBack}
                className="h-8 px-3 text-xs cursor-pointer rounded-[var(--radius-sketch-sm)]"
              >
                Back
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={handleNext}
              className="h-8 min-w-[96px] px-3.5 text-xs font-semibold shadow-2xs cursor-pointer rounded-[var(--radius-sketch-sm)]"
            >
              {step.buttonText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


