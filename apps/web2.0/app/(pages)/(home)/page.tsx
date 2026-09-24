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
  IconMicrophone,
  IconVideo,
  IconUsers,
  IconSearch,
  IconCompass,
  IconSparkles,
  IconSettings,
} from "@tabler/icons-react"

const discoveryRooms = [
  {
    name: "Football",
    letter: "F",
    members: "24.8K members",
    online: "1.4K talking",
    description: "Matchday discussions, transfer rumors, tactical analysis, and live game commentary.",
    lastMsg: "Did you see that stoppage time screamer? Unreal goal!",
    hasVoice: true,
  },
  {
    name: "AI & Machine Learning",
    letter: "A",
    members: "12.4K members",
    online: "890 talking",
    description: "Frontier models, prompt engineering, agentic systems, open-source weights, and breakthroughs.",
    lastMsg: "New reasoning model benchmarks just dropped. Latency is halved.",
    hasVoice: true,
  },
  {
    name: "World Chat",
    letter: "W",
    members: "8.7K members",
    online: "650 talking",
    description: "Meet people from across the globe, share cultures, and talk about everyday life.",
    lastMsg: "Good morning from Tokyo! How is everyone's day going?",
    hasVoice: false,
  },
  {
    name: "Web Development",
    letter: "D",
    members: "5.2K members",
    online: "420 talking",
    description: "Next.js, React 19, TypeScript, UI design systems, and modern full-stack architectures.",
    lastMsg: "Turbopack dev server rebuild times in Next.js 16 are blazing fast.",
    hasVoice: true,
  },
]

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
      {/* Top Navigation - Stationery Letterhead Banner */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex h-16 w-full items-center justify-between border-b border-line bg-paper/90 px-6 backdrop-blur-md shadow-2xs sm:px-12">
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <AppIcon size="md" />
        </Link>

        <div className="hidden md:flex items-center gap-8 text-xs font-medium text-ink-muted">
          <a href="#discover" className="hover:text-ink transition-colors">
            Explore
          </a>
          <a href="#communities" className="hover:text-ink transition-colors">
            Channels
          </a>
          <a href="#modes" className="hover:text-ink transition-colors">
            Text, Voice & Video
          </a>
          <a href="#create" className="hover:text-ink transition-colors">
            Create a Channel
          </a>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggleButton className="h-8 w-8 text-ink-muted hover:bg-surface-hover hover:text-ink rounded-[var(--radius-sketch-sm)]" />

          <Link
            href={appUrl}
            className="inline-flex h-8 items-center justify-center rounded-[var(--radius-sketch-sm)] bg-[var(--pencil-teal)] px-4 text-xs font-semibold text-paper shadow-2xs transition-all duration-150 hover:bg-[var(--pencil-teal)]/90 active:scale-95 cursor-pointer"
          >
            {user ? "Open App" : "Sign In"}
          </Link>
        </div>
      </nav>

      {/* Spacer to prevent content jump behind fixed navbar */}
      <div className="h-16 shrink-0 w-full" aria-hidden="true" />

      {/* Hero Section */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 pt-16 pb-24 text-center sm:px-12 sm:pt-24 sm:pb-32">
        {/* Main Headline */}
        <h1 className="hero-pop-text mb-6 max-w-4xl font-display text-4xl font-bold tracking-tight text-ink sm:text-6xl sm:leading-[1.12] cursor-default">
          Every topic deserves
          <br />
          <span className="font-serif italic text-[var(--pencil-teal)]">
            a place to be heard.
          </span>
        </h1>

        {/* Supporting Copy */}
        <p className="mb-10 max-w-2xl text-base text-ink-muted sm:text-lg sm:leading-relaxed">
          OpenSpace is where people come together around the things they care about. Find a channel that catches your interest or start one of your own, and talk about it with your people.
        </p>

        {/* Primary CTA */}
        <div className="mb-16 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={appUrl}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-sketch-md)] bg-[var(--pencil-teal)] px-8 text-sm font-semibold text-paper shadow-md transition-all duration-150 hover:bg-[var(--pencil-teal)]/90 active:scale-95 sm:w-auto cursor-pointer"
          >
            Start Exploring
          </Link>
        </div>

        {/* Live Interactive App Demo Showcase (Matching Real OpenSpace App for New Sign-in User) */}
        <div className="relative mb-28 w-full max-w-4xl rounded-[var(--radius-sketch-lg)] border border-line bg-paper-subtle p-2 sm:p-2.5 shadow-xl">
          <div className="grid grid-cols-12 gap-2 sm:gap-2.5">
            {/* Left Panel: Sidebar (Channels) */}
            <div className="col-span-12 sm:col-span-5 rounded-[var(--radius-sketch-md)] border border-line bg-paper shadow-2xs overflow-hidden flex flex-col text-left">
              {/* Sidebar Header */}
              <div className="flex flex-col gap-2.5 border-b border-line px-3.5 py-3 bg-paper-subtle">
                <div className="flex items-center justify-between">
                  <AppIcon size="sm" />
                  <div className="flex items-center gap-1.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sketch-sm)] text-ink-muted hover:text-ink hover:bg-surface-hover transition-colors cursor-pointer">
                      <IconSettings size={15} />
                    </div>
                  </div>
                </div>
                {/* Search Bar + Add Channel Button */}
                <div className="flex items-center gap-2">
                  <div className="flex h-7.5 flex-1 items-center gap-2 rounded-[var(--radius-sketch-sm)] border border-line bg-paper px-2.5">
                    <IconSearch stroke={2} height={13} width={13} className="shrink-0 text-ink-muted" />
                    <span className="flex-1 text-[11px] text-ink-muted truncate">Search channels to join...</span>
                  </div>
                  <span className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-[var(--radius-sketch-sm)] border border-white/80 dark:border-white/70 bg-[var(--primary)] text-white shadow-2xs cursor-pointer">
                    <IconPlus size={13} stroke={2.5} />
                  </span>
                </div>
              </div>

              {/* Channels List (Discover popular channels for newly signed-in user) */}
              <div className="p-2 space-y-1">
                <div className="px-2 py-1 flex items-center justify-between">
                  <span className="font-display text-[10px] font-semibold tracking-wider text-ink-muted uppercase">Suggested Channels</span>
                  <span className="text-[10px] text-[var(--pencil-teal)] font-medium">Browse all</span>
                </div>

                {/* Channel 1: General */}
                <div className="group relative flex items-center justify-between rounded-[var(--radius-sketch-sm)] px-2.5 py-2 border border-[var(--pencil-teal)] bg-[var(--pencil-teal-soft)] text-ink transition-all">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Avatar className="h-8 w-8 shrink-0 border border-[var(--pencil-teal)]">
                      <AvatarFallback className="text-xs font-semibold">G</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold text-ink">General</div>
                      <div className="truncate text-[10px] text-ink-muted">Open discussion for everyone</div>
                    </div>
                  </div>
                  <span className="rounded-[4px] bg-paper px-2 py-0.5 text-[10px] font-semibold text-[var(--pencil-teal)] shadow-2xs">
                    Join
                  </span>
                </div>

                {/* Channel 2: Technology */}
                <div className="group relative flex items-center justify-between rounded-[var(--radius-sketch-sm)] px-2.5 py-2 border border-transparent bg-transparent hover:bg-surface-hover text-ink-muted hover:text-ink transition-all">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs font-semibold">T</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-ink">Technology</div>
                      <div className="truncate text-[10px] text-ink-muted">Tech news, gadgets & trends</div>
                    </div>
                  </div>
                  <span className="rounded-[4px] border border-line bg-paper px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                    Join
                  </span>
                </div>

                {/* Channel 3: AI & Machine Learning */}
                <div className="group relative flex items-center justify-between rounded-[var(--radius-sketch-sm)] px-2.5 py-2 border border-transparent bg-transparent hover:bg-surface-hover text-ink-muted hover:text-ink transition-all">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs font-semibold">A</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-ink">AI & Machine Learning</div>
                      <div className="truncate text-[10px] text-ink-muted">Models, tools & breakthroughs</div>
                    </div>
                  </div>
                  <span className="rounded-[4px] border border-line bg-paper px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                    Join
                  </span>
                </div>

                {/* Channel 4: Design */}
                <div className="group relative flex items-center justify-between rounded-[var(--radius-sketch-sm)] px-2.5 py-2 border border-transparent bg-transparent hover:bg-surface-hover text-ink-muted hover:text-ink transition-all">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs font-semibold">D</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-ink">Design</div>
                      <div className="truncate text-[10px] text-ink-muted">UI/UX, typography & craft</div>
                    </div>
                  </div>
                  <span className="rounded-[4px] border border-line bg-paper px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                    Join
                  </span>
                </div>
              </div>
            </div>

            {/* Right Panel: Chat Section (New Sign-In User Welcome State) */}
            <div className="col-span-12 sm:col-span-7 rounded-[var(--radius-sketch-md)] border border-line bg-paper shadow-2xs overflow-hidden flex flex-col justify-center items-center text-center p-6 min-h-[320px]">
              <div className="flex flex-col items-center max-w-sm space-y-3.5">
                <div className="relative flex items-center justify-center py-2">
                  <AppIcon size="lg" />
                </div>

                <div className="space-y-1">
                  <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-ink">
                    Welcome to OpenSpace, Alex!
                  </h2>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    Pick a channel from the sidebar or search for a topic you&apos;re interested in to start discussing.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 w-full pt-4 border-t border-line text-left">
                  <div className="flex flex-col gap-1 rounded-[var(--radius-sketch-sm)] border border-line bg-paper-subtle p-3">
                    <div className="text-xs font-semibold text-ink">Explore Channels</div>
                    <div className="text-[11px] text-ink-muted">Search topics and join discussions</div>
                  </div>

                  <div className="flex flex-col gap-1 rounded-[var(--radius-sketch-sm)] border border-line bg-paper-subtle p-3">
                    <div className="text-xs font-semibold text-ink">Create Channel</div>
                    <div className="text-[11px] text-ink-muted">Start a space on any topic</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Core Experience (Discover, Connect, Create) */}
        <section id="discover" className="w-full max-w-5xl py-16 border-t border-line scroll-mt-16">
          <div className="mb-14 text-center">
            <span className="font-display text-xs font-bold uppercase tracking-wider text-[var(--pencil-teal)] mb-2 block">
              How It Works
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Join. Discuss. Create.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-ink-muted max-w-xl mx-auto leading-relaxed">
              Browse channels around topics that interest you, join ongoing discussions through text, voice, or video, or create a channel of your own.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Explore (Green) */}
            <div className="group relative flex flex-col items-start rounded-[var(--radius-sketch-md)] border border-line bg-paper p-8 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--pencil-green)] shadow-sm">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[var(--radius-sketch-sm)] bg-[var(--pencil-green-soft)] text-[var(--pencil-green)] border border-[var(--pencil-green)]/30">
                <IconCompass size={24} />
              </div>
              <h3 className="mb-2 font-display text-lg font-bold text-[var(--pencil-green)]">
                Explore open channels
              </h3>
              <p className="text-xs sm:text-sm leading-relaxed text-ink-muted">
                Search and browse public channels on any topic, from football and AI to music, gaming, world news, and whatever else people are talking about.
              </p>
            </div>

            {/* Discuss (Yellow) */}
            <div className="group relative flex flex-col items-start rounded-[var(--radius-sketch-md)] border border-line bg-paper p-8 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--pencil-yellow)] shadow-sm">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[var(--radius-sketch-sm)] bg-[var(--pencil-yellow-soft)] text-[var(--pencil-yellow)] border border-[var(--pencil-yellow)]/30">
                <IconUsers size={24} />
              </div>
              <h3 className="mb-2 font-display text-lg font-bold text-[var(--pencil-yellow)]">
                Discuss your way
              </h3>
              <p className="text-xs sm:text-sm leading-relaxed text-ink-muted">
                Every channel supports text, voice, and video. Write it out, join a voice room, or jump on video — choose whatever feels right for the conversation.
              </p>
            </div>

            {/* Add / Create Channel (Blue) */}
            <div className="group relative flex flex-col items-start rounded-[var(--radius-sketch-md)] border border-line bg-paper p-8 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--pencil-blue)] shadow-sm">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[var(--radius-sketch-sm)] bg-[var(--pencil-blue-soft)] text-[var(--pencil-blue)] border border-[var(--pencil-blue)]/30">
                <IconPlus size={24} />
              </div>
              <h3 className="mb-2 font-display text-lg font-bold text-[var(--pencil-blue)]">
                Start your own channel
              </h3>
              <p className="text-xs sm:text-sm leading-relaxed text-ink-muted">
                Can&apos;t find a channel for your topic? Start your own. Make it public or private, invite people in, and get the conversation going.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Live Channels */}
        <section id="communities" className="w-full max-w-5xl py-16 border-t border-line scroll-mt-16">
          <div className="mb-10 text-center">
            <span className="font-display text-xs font-bold uppercase tracking-wider text-[var(--pencil-teal)] mb-2 block">
              Active Channels
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              See what people are talking about.
            </h2>
            {/* <p className="mt-3 text-sm sm:text-base text-ink-muted max-w-2xl mx-auto leading-relaxed">
              From football matchday debates to AI breakthroughs, people are discussing topics they care about. New channels pop up every day.
            </p> */}
          </div>

          {/* Channel Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-left">
            {discoveryRooms.map((room) => (
              <div
                key={room.name}
                className="group relative flex flex-col justify-between rounded-[var(--radius-sketch-md)] border border-line bg-paper p-6 transition-all duration-200 hover:border-[var(--pencil-teal)] shadow-2xs"
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="text-xs font-bold">
                        {room.letter}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-display text-base font-semibold text-ink">{room.name}</h4>
                      <span className="text-[11px] text-ink-muted">{room.members} • {room.online}</span>
                    </div>
                  </div>

                  <p className="text-xs text-ink-muted leading-relaxed mb-4">
                    {room.description}
                  </p>
                </div>

                <div className="rounded-[var(--radius-sketch-sm)] border border-line bg-paper-subtle p-3">
                  <div className="text-[11px] text-ink-muted italic truncate font-serif">
                    &ldquo;{room.lastMsg}&rdquo;
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* And many more */}
          <p className="mt-6 text-center text-xs font-medium text-[var(--pencil-teal)]">
            ...and many more
          </p>
        </section>

        {/* Section 5: Communication Modes */}
        <section id="modes" className="w-full max-w-5xl py-16 border-t border-line scroll-mt-16">
          <div className="mb-14 text-center">
            <span className="font-display text-xs font-bold uppercase tracking-wider text-[var(--pencil-teal)] mb-2 block">
              Three Ways to Discuss
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Text. Voice. Video.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-ink-muted max-w-xl mx-auto leading-relaxed">
              Switch between text, voice, and video to match the way you want to talk.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 text-left">
            {/* Text Card */}
            <div className="flex flex-col justify-between rounded-[var(--radius-sketch-md)] border border-line bg-paper p-6 shadow-2xs">
              <div className="space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sketch-sm)] bg-[var(--pencil-teal-soft)] text-[var(--pencil-teal)] border border-[var(--pencil-teal)]/30">
                  <IconMessageCircle size={22} />
                </div>
                <h3 className="font-display text-lg font-bold text-ink">Text</h3>
                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                  Send messages, share files, and react to what others say. Everything stays so the discussion never loses its thread.
                </p>
              </div>
            </div>

            {/* Voice Card */}
            <div className="flex flex-col justify-between rounded-[var(--radius-sketch-md)] border border-[var(--pencil-teal)] bg-[var(--pencil-teal-soft)]/20 p-6 shadow-sm">
              <div className="space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sketch-sm)] bg-[var(--pencil-teal)] text-paper shadow-2xs">
                  <IconMicrophone size={22} />
                </div>
                <h3 className="font-display text-lg font-bold text-ink">Voice</h3>
                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                  Jump into a live voice room — no scheduling needed. Just join and talk with whoever is there.
                </p>
              </div>
            </div>

            {/* Video Card */}
            <div className="flex flex-col justify-between rounded-[var(--radius-sketch-md)] border border-line bg-paper p-6 shadow-2xs">
              <div className="space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sketch-sm)] bg-[var(--pencil-blue-soft)] text-[var(--pencil-blue)] border border-[var(--pencil-blue)]/30">
                  <IconVideo size={22} />
                </div>
                <h3 className="font-display text-lg font-bold text-ink">Video</h3>
                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                  When text and voice aren&apos;t enough, go face-to-face with video calls and screen sharing.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: Create Room Flowchart */}
        <section id="create" className="w-full max-w-5xl py-16 border-t border-line scroll-mt-16">
          <div className="mb-12 text-center">
            <span className="font-display text-xs font-bold uppercase tracking-wider text-[var(--pencil-teal)] mb-2 block">
              Create
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Create a channel in seconds.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-ink-muted max-w-xl mx-auto leading-relaxed">
              Pick a topic you want to discuss, set it public or private, invite people, and start talking.
            </p>
          </div>

          {/* Visual Flowchart */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 max-w-4xl mx-auto mb-10 text-center">
            {[
              { step: "1", title: "Create Channel", desc: "Click + in the sidebar" },
              { step: "2", title: "Name Your Topic", desc: "Give it a title" },
              { step: "3", title: "Set Visibility", desc: "Public or private" },
              { step: "4", title: "Invite People", desc: "Share the link" },
              { step: "5", title: "Start Discussing", desc: "Text, voice, or video" },
            ].map((item) => (
              <div
                key={item.step}
                className="relative flex flex-col items-center justify-center rounded-[var(--radius-sketch-sm)] border border-line bg-paper p-4 shadow-2xs"
              >
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--pencil-teal)] font-bold text-paper text-xs shadow-2xs">
                  {item.step}
                </div>
                <div className="font-display text-xs font-bold text-ink">{item.title}</div>
                <div className="text-[10px] text-ink-muted mt-0.5">{item.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 7: Final CTA */}
        <section className="w-full max-w-4xl py-16 my-8 rounded-[var(--radius-sketch-lg)] p-8 sm:p-14 text-center border border-line bg-paper-subtle shadow-sm">
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-5xl mb-4">
            Ready to jump in?
          </h2>
          <p className="text-sm sm:text-base text-ink-muted max-w-xl mx-auto mb-8 leading-relaxed">
            People are already discussing topics you care about.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={appUrl}
              className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-[var(--radius-sketch-md)] bg-[var(--pencil-teal)] px-8 text-sm font-semibold text-paper transition-all duration-150 hover:bg-[var(--pencil-teal)]/90 active:scale-95 cursor-pointer shadow-sm"
            >
              {user ? "Open App" : "Get Started"}
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="flex h-16 shrink-0 items-center justify-between border-t border-line bg-paper px-6 sm:px-12 text-xs text-ink-muted">
        <div>© 2026 OpenSpace. Where every topic finds its voice.</div>
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
