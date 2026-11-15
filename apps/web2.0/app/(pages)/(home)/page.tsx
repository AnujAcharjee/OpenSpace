"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useHydrate } from "@/hooks/useHydrate"
import { AppIcon } from "@/components/AppIcon"
import { ThemeToggleButton } from "@/components/theme-toggle"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  IconPlus,
  IconMessageCircle,
  IconUsers,
  IconSearch,
  IconPaperclip,
  IconShieldCheck,
  IconBolt,
  IconSettings,
} from "@tabler/icons-react"

export default function HomePage() {
  const { user, hasHydrated, fetch } = useHydrate()

  useEffect(() => {
    if (hasHydrated) {
      void fetch()
    }
  }, [fetch, hasHydrated])

  const appUrl = user?.username ? `/@${encodeURIComponent(user.username)}` : "/signin"

  return (
    <div className="flex min-h-svh w-full flex-col overflow-x-clip bg-paper font-sans text-ink">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex h-16 w-full items-center justify-between border-b border-line bg-paper/90 px-6 backdrop-blur-md shadow-2xs sm:px-12">
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <AppIcon size="md" />
        </Link>

        <div className="hidden md:flex items-center gap-8 text-xs font-medium text-ink-muted">
          <a href="#features" className="hover:text-ink transition-colors">
            Features
          </a>
          <a href="#about" className="hover:text-ink transition-colors">
            Design
          </a>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggleButton className="h-8 w-8 text-ink-muted hover:bg-surface-hover hover:text-ink rounded-[var(--radius-sketch-sm)]" />

          <Link
            href={appUrl}
            className="inline-flex h-8 items-center justify-center rounded-[var(--radius-sketch-sm)] bg-[var(--pencil-teal)] px-4 text-xs font-semibold text-paper shadow-2xs transition-all duration-150 hover:bg-[var(--pencil-teal)]/90 active:scale-95 cursor-pointer"
          >
            {user ? "Open Chats" : "Sign In"}
          </Link>
        </div>
      </nav>

      <div className="h-16 shrink-0 w-full" aria-hidden="true" />

      {/* Hero Section */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 pt-16 pb-24 text-center sm:px-12 sm:pt-24 sm:pb-32">
        <h1 className="hero-pop-text mb-6 max-w-3xl font-display text-4xl font-bold tracking-tight text-ink sm:text-6xl sm:leading-[1.15] cursor-default">
          Simple, private messaging.
          <br />
          <span className="font-serif italic text-[var(--pencil-teal)]">
            Drawn on fine paper.
          </span>
        </h1>

        <p className="mb-10 max-w-xl text-base text-ink-muted sm:text-lg sm:leading-relaxed">
          OpenSpace is a distraction-free real-time chat application for 1-to-1 direct messaging and group chats, crafted with warm stationery aesthetics.
        </p>

        <div className="mb-16 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={appUrl}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-sketch-md)] bg-[var(--pencil-teal)] px-8 text-sm font-semibold text-paper shadow-md transition-all duration-150 hover:bg-[var(--pencil-teal)]/90 active:scale-95 sm:w-auto cursor-pointer"
          >
            {user ? "Go to Chats" : "Start Chatting"}
          </Link>
        </div>

        {/* Feature Grid */}
        <section id="features" className="w-full max-w-4xl py-12 border-t border-line text-left">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-[var(--radius-sketch-md)] border border-line bg-paper p-6 shadow-2xs">
              <div className="size-10 rounded-[var(--radius-sketch-sm)] bg-[var(--pencil-teal-soft)] text-[var(--pencil-teal)] flex items-center justify-center mb-4">
                <IconMessageCircle size={22} />
              </div>
              <h3 className="font-display text-base font-bold text-ink mb-1">
                1-to-1 Direct Messages
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Connect directly with any user by username. Send text, reply in threads, and share attachments instantly.
              </p>
            </div>

            <div className="rounded-[var(--radius-sketch-md)] border border-line bg-paper p-6 shadow-2xs">
              <div className="size-10 rounded-[var(--radius-sketch-sm)] bg-[var(--pencil-yellow-soft)] text-[var(--pencil-yellow)] flex items-center justify-center mb-4">
                <IconUsers size={22} />
              </div>
              <h3 className="font-display text-base font-bold text-ink mb-1">
                Collaborative Group Chats
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Create focused groups with multiple members, designated admins, and simple group management.
              </p>
            </div>

            <div className="rounded-[var(--radius-sketch-md)] border border-line bg-paper p-6 shadow-2xs">
              <div className="size-10 rounded-[var(--radius-sketch-sm)] bg-[var(--pencil-coral-soft)] text-[var(--pencil-coral)] flex items-center justify-center mb-4">
                <IconBolt size={22} />
              </div>
              <h3 className="font-display text-base font-bold text-ink mb-1">
                Real-Time & Reliable
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Powered by WebSockets, Redis pub/sub streams, and offline-first optimistic delivery.
              </p>
            </div>
          </div>
        </section>

        {/* Design System Statement */}
        <section id="about" className="w-full max-w-3xl py-12 text-center">
          <div className="rounded-[var(--radius-sketch-lg)] border border-line bg-paper-subtle p-8 sm:p-10 shadow-xs">
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl mb-3">
              Stationery & Colored-Pencil Design
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed max-w-lg mx-auto mb-6">
              No neon AI gradients or sterile blue dashboard cards. OpenSpace is styled like physical artist sketchbooks with tactile ivory paper, ink line work, and muted pencil accents.
            </p>
            <Link
              href={appUrl}
              className="inline-flex h-10 items-center justify-center rounded-[var(--radius-sketch-sm)] bg-[var(--pencil-teal)] px-6 text-xs font-semibold text-paper hover:bg-[var(--pencil-teal)]/90 transition"
            >
              Open Application
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="flex h-16 shrink-0 items-center justify-between border-t border-line bg-paper px-6 sm:px-12 text-xs text-ink-muted">
        <div>© 2026 OpenSpace. Simple 1-to-1 and group messaging.</div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/AnujAcharjee/collab"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ink transition-colors"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}
