import Link from "next/link"
import { AppIcon } from "@/components/AppIcon"
import { ThemeToggleButton } from "@/components/theme-toggle"
import {
  IconBolt,
  IconShieldCheck,
  IconUsers,
  IconSparkles,
  IconArrowRight,
  IconBrandGithub,
  IconMessageDots,
  IconCheck,
  IconDeviceDesktop,
} from "@tabler/icons-react"

const features = [
  {
    icon: IconBolt,
    title: "Instant WebSockets",
    description:
      "Ultra low-latency messaging architecture with synchronized state across all connected clients.",
  },
  {
    icon: IconShieldCheck,
    title: "Pramaan Cryptographic Identity",
    description:
      "Verified identity protocol ensuring secure token exchange and enterprise-grade session protection.",
  },
  {
    icon: IconUsers,
    title: "Channels & Direct Spaces",
    description:
      "Organized public and private discussion channels designed for high-throughput collaboration.",
  },
  {
    icon: IconSparkles,
    title: "Engineered for Velocity",
    description:
      "Optimized microservice backend with horizontal scalability and persistent message reliability.",
  },
]

export default function HomePage() {
  return (
    <div className="flex min-h-svh w-full flex-col overflow-x-hidden bg-background bg-[radial-gradient(circle_at_top,rgba(244,187,68,0.12),transparent_40%),radial-gradient(circle_at_bottom,rgba(125,80,20,0.05),transparent_50%)] font-sans text-foreground dark:bg-[radial-gradient(circle_at_top,rgba(244,187,68,0.08),transparent_40%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.02),transparent_50%)]">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-border/50 bg-background/80 px-6 backdrop-blur-md sm:px-12">
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <AppIcon size="md" />
        </Link>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com/AnujAcharjee/collab"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-border/50 bg-card/40 px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <IconBrandGithub size={15} />
            <span className="hidden sm:inline">GitHub</span>
          </a>

          <ThemeToggleButton className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground" />

          <Link
            href="/auth"
            className="inline-flex h-8 items-center justify-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-[0_0_12px_rgba(244,187,68,0.3)] transition-all duration-200 hover:shadow-[0_0_16px_rgba(244,187,68,0.5)] hover:brightness-105 active:scale-95"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero & Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center sm:px-12 sm:py-28">
        {/* Headline */}
        <h1 className="mb-6 max-w-4xl text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl sm:leading-[1.12]">
          Chat. Create. Collaborate.
          <br />
          <span className="bg-gradient-to-r from-[#F5C842] via-[#e8a825] to-[#C8860A] bg-clip-text text-transparent">
            All in one place.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mb-10 max-w-2xl text-base text-muted-foreground sm:text-lg sm:leading-relaxed">
          Real-time messaging, shared whiteboards, persistent channels, and secure
          identity — built for teams that move fast.
        </p>

        {/* Primary CTA */}
        <div className="mb-16 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/auth"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(244,187,68,0.35)] transition-all duration-200 hover:shadow-[0_0_28px_rgba(244,187,68,0.55)] hover:brightness-105 active:scale-95 sm:w-auto"
          >
            Get Started →
          </Link>
          <a
            href="https://github.com/AnujAcharjee/collab"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-card/40 px-6 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-muted active:scale-95 sm:w-auto"
          >
            <IconBrandGithub size={18} />
            View Source
          </a>
        </div>

        {/* Workspace Preview Showcase */}
        <div className="relative mb-24 w-full max-w-4xl rounded-2xl border border-border/60 bg-card/50 p-2.5 shadow-2xl backdrop-blur-xl dark:bg-card/30">
          <div className="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/15 via-transparent to-primary/15 blur-2xl opacity-60" />

          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-background/95 text-left shadow-inner">
            <div className="grid grid-cols-12 min-h-[300px]">
              {/* Sidebar Preview */}
              <div className="col-span-4 border-r border-border/40 bg-card/40 p-4 space-y-3 hidden sm:block">
                <div className="flex items-center justify-between pb-2 border-b border-border/30">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Channels</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 rounded-lg bg-primary/15 px-3 py-2 text-xs font-semibold text-foreground border border-primary/30">
                    <span className="text-primary font-bold">#</span> general
                  </div>
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted/40 transition-colors">
                    <span className="text-muted-foreground/60 font-medium">#</span> engineering
                  </div>
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted/40 transition-colors">
                    <span className="text-muted-foreground/60 font-medium">#</span> announcements
                  </div>
                </div>
              </div>

              {/* Chat Canvas Preview */}
              <div className="col-span-12 sm:col-span-8 p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-3.5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-xs shadow-sm">
                      A
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">Anuj</span>
                        <span className="text-[10px] text-muted-foreground">10:42 AM</span>
                      </div>
                      <div className="rounded-2xl rounded-tl-sm bg-muted/80 px-3.5 py-2 text-xs text-foreground leading-relaxed max-w-sm border border-border/30">
                        Welcome to Collab! Real-time synchronization and channels are ready to go.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 flex-row-reverse">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-600 font-bold text-white text-xs shadow-sm">
                      T
                    </div>
                    <div className="space-y-1 items-end flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">10:43 AM</span>
                        <span className="text-xs font-semibold text-foreground">Team Member</span>
                      </div>
                      <div className="rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2 text-xs text-primary-foreground leading-relaxed max-w-sm shadow-sm font-medium">
                        Messages deliver instantly with zero lag. Let's start collaborating!
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-muted/40 px-3.5 py-2.5">
                  <IconMessageDots size={16} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Send a message to #general...</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <section className="w-full max-w-5xl pt-10 border-t border-border/40">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Engineered for seamless performance
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Built on a high-throughput architecture for reliable, uninterrupted collaboration.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, idx) => {
              const Icon = feature.icon
              return (
                <div
                  key={idx}
                  className="group relative flex flex-col items-start rounded-2xl border border-border/50 bg-card/40 p-6 text-left transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:bg-card/70 hover:shadow-lg"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon size={20} />
                  </div>
                  <h3 className="mb-1.5 text-sm font-semibold text-foreground">
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
      <footer className="flex h-14 shrink-0 items-center justify-between border-t border-border/50 bg-background/80 px-6 sm:px-12 text-xs text-muted-foreground">
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
