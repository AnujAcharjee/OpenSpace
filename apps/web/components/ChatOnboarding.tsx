"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  IconSearch,
  IconPlus,
  IconMessageCircle,
  IconSparkles,
  IconArrowRight,
  IconArrowLeft,
  IconCheck,
  IconMicrophone,
  IconVideo,
  IconCompass,
} from "@tabler/icons-react"
import type { UserRecord } from "@repo/validation"

interface ChatOnboardingProps {
  user: UserRecord | null
}

interface OnboardingStep {
  title: string
  subtitle: string
  description: string
  icon: React.ElementType
  badge: string
  buttonText: string
  customContent?: React.ReactNode
}

export function ChatOnboarding({ user }: ChatOnboardingProps) {
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (!user) return

    const storageKey = `openspace_onboarding_completed_${user.id}`
    const hasCompleted = localStorage.getItem(storageKey)

    if (!hasCompleted) {
      // Show onboarding for new users on their first visit
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
      subtitle: "Where conversations happen",
      description:
        "OpenSpace is where conversations happen. Discover channels, join discussions, and connect with people around the world.",
      icon: IconSparkles,
      badge: "Step 1 of 4",
      buttonText: "Let's explore",
    },
    {
      title: "Discover & Join Channels",
      subtitle: "Find your interests",
      description:
        "Search for channels around topics you're interested in and join the conversations already happening.",
      icon: IconSearch,
      badge: "Step 2 of 4",
      buttonText: "Next",
      customContent: (
        <div className="grid grid-cols-2 gap-2 pt-1">
          {[
            { initial: "F", name: "Football", desc: "Live match discussions & banter" },
            { initial: "A", name: "AI Chat", desc: "LLMs, models & tech insights" },
            { initial: "W", name: "World Chat", desc: "Global general community lounge" },
            { initial: "T", name: "Technology", desc: "Devs, hardware & future trends" },
          ].map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-muted/40 p-2 text-left"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-card text-xs font-semibold text-foreground">
                {item.initial}
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-foreground">
                  {item.name}
                </div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {item.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "Create Your Own Channel",
      subtitle: "Bring people together",
      description:
        "Can't find the conversation you're looking for? Create your own channel and bring people together around a topic.",
      icon: IconPlus,
      badge: "Step 3 of 4",
      buttonText: "Next",
      customContent: (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-sm">
              +
            </span>
            <span className="text-xs font-semibold text-foreground">
              Click the '+' icon in the sidebar
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Set up custom visibility, upload a channel avatar, and invite friends or colleagues instantly.
          </p>
        </div>
      ),
    },
    {
      title: "Start Chatting",
      subtitle: "Text, voice & video",
      description:
        "Send messages, join voice conversations, or start a video call — all from your channels.",
      icon: IconMessageCircle,
      badge: "Step 4 of 4",
      buttonText: "Start Exploring",
      customContent: (
        <div className="flex items-center justify-around gap-2 rounded-xl border border-border/50 bg-muted/30 p-2.5">
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card border border-border/60 text-foreground">
              <IconMessageCircle size={16} />
            </div>
            <span className="text-[11px] font-medium text-foreground">Text</span>
          </div>
          <div className="h-6 w-px bg-border/40" />
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card border border-border/60 text-foreground">
              <IconMicrophone size={16} />
            </div>
            <span className="text-[11px] font-medium text-foreground">Voice</span>
          </div>
          <div className="h-6 w-px bg-border/40" />
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card border border-border/60 text-foreground">
              <IconVideo size={16} />
            </div>
            <span className="text-[11px] font-medium text-foreground">Video</span>
          </div>
        </div>
      ),
    },
    {
      title: "You're ready for OpenSpace",
      subtitle: "Find your community",
      description:
        "Find a channel, join a conversation, or create something of your own.",
      icon: IconCompass,
      badge: "Ready",
      buttonText: "Explore Channels",
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
  const IconComponent = step.icon
  const isLastStep = currentStep === STEPS.length - 1

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleComplete() }}>
      {/* showCloseButton defaults to true in DialogContent, providing single clean X button */}
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border border-border/60 bg-card/95 shadow-2xl backdrop-blur-xl rounded-2xl">
        {/* Header Visual Banner */}
        <div className="relative flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,rgba(244,187,68,0.18)_0%,transparent_70%)] dark:bg-none border-b border-border/40">
          <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/25 shadow-md">
            <IconComponent size={28} className="text-primary animate-in zoom-in-50 duration-200" />
          </div>

          <span className="text-[11px] font-semibold text-primary uppercase tracking-wider mb-1">
            {step.badge}
          </span>
          <DialogTitle className="text-lg font-bold text-foreground text-center">
            {step.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground text-center mt-0.5">
            {step.subtitle}
          </DialogDescription>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-3.5">
          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed text-center">
            {step.description}
          </p>

          {step.customContent}

          {/* Step Indicator Dots */}
          <div className="flex items-center justify-center gap-1.5 pt-2">
            {STEPS.map((_, idx) => (
              <div
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                  idx === currentStep
                    ? "w-6 bg-primary"
                    : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-2 p-4 bg-muted/30 border-t border-border/40">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {isLastStep ? "Close" : "Skip Tour"}
          </Button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && !isLastStep && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBack}
                className="h-8 px-3 text-xs cursor-pointer"
              >
                <IconArrowLeft size={14} className="mr-1" />
                Back
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={handleNext}
              className="h-8 px-4 text-xs font-semibold shadow-xs cursor-pointer"
            >
              <span>{step.buttonText}</span>
              {isLastStep ? (
                <IconCheck size={14} className="ml-1.5" />
              ) : (
                <IconArrowRight size={14} className="ml-1.5" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
