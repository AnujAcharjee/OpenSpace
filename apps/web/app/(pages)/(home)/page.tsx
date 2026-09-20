"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppIcon } from "@/components/AppIcon"
import { ThemeToggleButton } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import useAppStore from "@/stores/app-store"
import { useShallow } from "zustand/react/shallow"
import { useHydrate } from "@/hooks/useHydrate"
import {
  IconBolt,
  IconShieldCheck,
  IconUsers,
  IconArrowRight,
  IconBrandGithub,
  IconMessageDots,
  IconSparkles,
  IconLock,
  IconCheck,
} from "@tabler/icons-react"

const features = [
  {
    icon: IconBolt,
    title: "Instant WebSockets",
    description:
      "Ultra low-latency message delivery and live presence updates that feel genuinely live.",
  },
  {
    icon: IconShieldCheck,
    title: "Pramaan Identity",
    description:
      "Cryptographically verified identity protocol ensuring secure, reliable authentication.",
  },
  {
    icon: IconUsers,
    title: "Public & Private Rooms",
    description:
      "Discover open community channels or create private, invite-only spaces for your team.",
  },
  {
    icon: IconSparkles,
    title: "Modern Glassmorphism",
    description:
      "Tailored light and dark aesthetic engineered with smooth transitions and micro-animations.",
  },
]

export default function HomePage() {
  const router = useRouter()
  const { user, hasHydrated } = useAppStore(
    useShallow((state) => ({
      user: state.user,
      hasHydrated: state.hasHydrated,
    }))
  )
  const { fetch } = useHydrate(user?.id ?? "")

  useEffect(() => {
    if (!hasHydrated) return
    void fetch()
  }, [fetch, hasHydrated])

  const workspaceHref = user?.username ? `/@${user.username}` : "/auth"

  return (
    <div className="flex min-h-svh w-full flex-col overflow-x-hidden bg-background bg-[radial-gradient(circle_at_top,rgba(244,187,68,0.12),transparent_40%),radial-gradient(circle_at_bottom,rgba(125,80,20,0.06),transparent_50%)] font-sans text-foreground dark:bg-[radial-gradient(circle_at_top,rgba(244,187,68,0.08),transparent_40%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.02),transparent_50%)]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-border/50 bg-background/70 px-6 backdrop-blur-md sm:px-12">
        <div className="flex items-center gap-3">
          <AppIcon size="md" />
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com/AnujAcharjee/collab"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-border/50 bg-card/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <IconBrandGithub size={15} />
            <span className="hidden sm:inline">GitHub</span>
          </a>

          <ThemeToggleButton className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground" />

          {user?.username ? (
            <Button
              size="sm"
              className="h-8 rounded-full px-4 text-xs font-semibold shadow-[0_0_12px_rgba(244,187,68,0.3)] hover:shadow-[0_0_16px_rgba(244,187,68,0.5)]"
              onClick={() => router.push(`/@${user.username}`)}
            >
              Open Workspace (@{user.username})
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-8 rounded-full px-4 text-xs font-semibold shadow-[0_0_12px_rgba(244,187,68,0.3)] hover:shadow-[0_0_16px_rgba(244,187,68,0.5)]"
              onClick={() => router.push("/auth")}
            >
              Sign In
            </Button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center sm:px-12 sm:py-24">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-primary uppercase shadow-sm">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          Real-Time Team Collaboration
        </div>

        {/* Heading */}
        <h1 className="mb-6 max-w-4xl text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl sm:leading-[1.15]">
          Where conversations move at{" "}
          <span className="bg-gradient-to-r from-[#F5C842] via-[#e8a825] to-[#C8860A] bg-clip-text text-transparent">
            lightning speed.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mb-10 max-w-2xl text-base text-muted-foreground sm:text-lg sm:leading-relaxed">
          High-performance chat workspace with instant WebSocket synchronization,
          persistent channels, and verified identity with Pramaan.
        </p>

        {/* Actions */}
        <div className="mb-16 flex flex-col items-center gap-3 sm:flex-row">
          <Button
            size="lg"
            className="h-12 w-full sm:w-auto rounded-xl px-8 text-sm font-semibold shadow-[0_0_20px_rgba(244,187,68,0.3)] hover:shadow-[0_0_28px_rgba(244,187,68,0.5)] transition-all cursor-pointer"
            onClick={() => router.push(workspaceHref)}
          >
            {user?.username ? (
              <>
                Go to Workspace (@{user.username})
                <IconArrowRight className="ml-2 size-4" />
              </>
            ) : (
              <>
                Get Started with Pramaan
                <IconArrowRight className="ml-2 size-4" />
              </>
            )}
          </Button>

          {!user && (
            <Button
              variant="outline"
              size="lg"
              className="h-12 w-full sm:w-auto rounded-xl px-6 text-sm font-semibold border-border/60 hover:bg-muted cursor-pointer"
              onClick={() => router.push("/@guest")}
            >
              Explore Public Channels
            </Button>
          )}
        </div>

        {/* Interactive Workspace Preview Mockup */}
        <div className="relative mb-20 w-full max-w-4xl rounded-2xl border border-border/60 bg-card/60 p-2 shadow-2xl backdrop-blur-xl dark:bg-card/40">
          <div className="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/20 via-transparent to-primary/20 blur-xl opacity-50" />
          
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-background/90 text-left">
            {/* Window Top Bar */}
            <div className="flex h-10 items-center justify-between border-b border-border/40 bg-muted/40 px-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500/80" />
                <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <span className="h-3 w-3 rounded-full bg-green-500/80" />
                <span className="ml-2 text-xs font-medium text-muted-foreground">
                  collab.anujacharjee.com{user?.username ? `/@${user.username}` : "/@general"}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-emerald-500 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Connected
              </div>
            </div>

            {/* Mockup Workspace UI */}
            <div className="grid grid-cols-12 min-h-[280px]">
              {/* Sidebar Preview */}
              <div className="col-span-4 border-r border-border/40 bg-card/30 p-3 space-y-2 hidden sm:block">
                <div className="flex items-center justify-between pb-2 border-b border-border/30">
                  <span className="text-xs font-bold text-foreground">Channels</span>
                  <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Live</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 rounded-lg bg-primary/15 px-2.5 py-1.5 text-xs font-semibold text-foreground border border-primary/30">
                    <span>#</span> general
                  </div>
                  <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/40">
                    <span>#</span> engineering
                  </div>
                  <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/40">
                    <IconLock size={12} /> product-team
                  </div>
                </div>
              </div>

              {/* Chat Area Preview */}
              <div className="col-span-12 sm:col-span-8 p-4 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-xs">
                      A
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">Anuj</span>
                        <span className="text-[10px] text-muted-foreground">Just now</span>
                      </div>
                      <div className="rounded-xl bg-muted px-3 py-1.5 text-xs text-foreground max-w-sm">
                        Welcome to Collab! Real-time messaging with instant WebSocket synchronization 🚀
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 flex-row-reverse">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-600 font-bold text-white text-xs">
                      C
                    </div>
                    <div className="space-y-1 items-end flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">Just now</span>
                        <span className="text-xs font-semibold text-foreground">You</span>
                      </div>
                      <div className="rounded-xl bg-primary px-3 py-1.5 text-xs text-primary-foreground max-w-sm">
                        The interface is clean and super fast. Let's collaborate!
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
                  <IconMessageDots size={16} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Message #general...</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <section className="w-full max-w-5xl pt-8 border-t border-border/50">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Engineered for seamless communication
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Built on a resilient microservice architecture for zero downtime and low latency.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, idx) => {
              const Icon = feature.icon
              return (
                <div
                  key={idx}
                  className="group relative flex flex-col items-start rounded-2xl border border-border/50 bg-card/40 p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:bg-card/70 hover:shadow-lg"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon size={20} />
                  </div>
                  <h3 className="mb-1 text-sm font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="flex h-14 shrink-0 items-center justify-between border-t border-border/50 bg-background/60 px-6 sm:px-12 text-xs text-muted-foreground">
        <div>© 2026 Collab. All rights reserved.</div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/AnujAcharjee/collab"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}
