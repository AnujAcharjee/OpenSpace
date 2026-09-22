"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useHydrate } from "@/hooks/useHydrate"
import { AppIcon } from "@/components/AppIcon"
import { ThemeToggleButton } from "@/components/theme-toggle"
import { Avatar, AvatarFallback, AvatarBadge } from "@/components/ui/avatar"
import {
  IconPlus,
  IconMessageCircle,
  IconMicrophone,
  IconVideo,
  IconUsers,
  IconBrandGithub,
  IconSearch,
  IconDotsVertical,
  IconPaperclip,
  IconMoodSmile,
  IconSend,
  IconCompass,
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
    <div className="flex min-h-svh w-full flex-col overflow-x-clip bg-background bg-[radial-gradient(circle_at_top,rgba(244,187,68,0.12),transparent_40%),radial-gradient(circle_at_bottom,rgba(125,80,20,0.05),transparent_50%)] font-sans text-foreground dark:bg-[radial-gradient(circle_at_top,rgba(244,187,68,0.08),transparent_40%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.02),transparent_50%)]">
      {/* Top Navigation - Fixed at top while scrolling */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex h-16 w-full items-center justify-between border-b border-border/60 bg-white/85 dark:bg-background/80 px-6 backdrop-blur-md shadow-[0_1px_12px_rgba(0,0,0,0.03)] sm:px-12">
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <AppIcon size="md" />
        </Link>

        <div className="hidden md:flex items-center gap-8 text-xs font-medium text-muted-foreground">
          <a href="#discover" className="hover:text-foreground transition-colors">
            Discover
          </a>
          <a href="#communities" className="hover:text-foreground transition-colors">
            Communities
          </a>
          <a href="#modes" className="hover:text-foreground transition-colors">
            Voice & Video
          </a>
          <a href="#create" className="hover:text-foreground transition-colors">
            Start a Channel
          </a>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com/AnujAcharjee/collab"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-border/60 bg-white/80 dark:bg-card/40 px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground shadow-2xs"
          >
            <IconBrandGithub size={15} />
            <span className="hidden sm:inline">GitHub</span>
          </a>

          <ThemeToggleButton className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground" />

          <Link
            href={appUrl}
            className="inline-flex h-8 items-center justify-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-[0_0_12px_rgba(212,175,55,0.35)] transition-all duration-200 hover:shadow-[0_0_16px_rgba(212,175,55,0.55)] hover:brightness-105 active:scale-95 cursor-pointer"
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
        <h1 className="mb-6 max-w-4xl text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl sm:leading-[1.12]">
          Find your people.
          <br />
          <span className="bg-gradient-to-r from-[#B47805] via-[#D49410] to-[#996500] dark:from-[#F5C842] dark:via-[#e8a825] dark:to-[#C8860A] bg-clip-text text-transparent">
            Join the conversation.
          </span>
        </h1>

        {/* Supporting Copy */}
        <p className="mb-10 max-w-2xl text-base text-muted-foreground sm:text-lg sm:leading-relaxed">
          A real-time social platform to discover channels, join conversations, and connect with people worldwide through text, voice, and video.
        </p>

        {/* Primary CTA */}
        <div className="mb-16 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={appUrl}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all duration-200 hover:shadow-[0_0_28px_rgba(212,175,55,0.6)] hover:brightness-105 active:scale-95 sm:w-auto cursor-pointer"
          >
            Start Exploring
          </Link>
        </div>

        {/* Live Interactive App Demo (Matching Real OpenSpace App for New Sign-in User) */}
        <div className="relative mb-28 w-full max-w-4xl rounded-2xl border border-border/70 dark:border-border/40 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.08),transparent_50%),linear-gradient(135deg,#FFFFFF_0%,#F8F8F7_50%,#F1F0EC_100%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(244,187,68,0.03),transparent_45%),linear-gradient(135deg,#0E0E11_0%,#09090B_60%,#0D0D10_100%)] p-2 sm:p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:shadow-2xl backdrop-blur-xl">
          <div className="grid grid-cols-12 gap-2 sm:gap-2.5">
            {/* Left Panel: Sidebar (Channels) */}
            <div className="col-span-12 sm:col-span-5 rounded-xl border border-border/70 dark:border-border/40 bg-white/95 dark:bg-card/50 shadow-sm dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-md overflow-hidden flex flex-col text-left">
              {/* Sidebar Header */}
              <div className="flex flex-col gap-2.5 border-b border-border/60 dark:border-border/50 px-3.5 py-3 bg-white/80 dark:bg-card/40 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <AppIcon size="sm" />
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6 border border-primary/40">
                      <AvatarFallback className="text-[10px] font-bold bg-primary/15 text-primary">A</AvatarFallback>
                      <AvatarBadge className="right-0 bottom-0 h-1.5 w-1.5 border border-background bg-emerald-500" />
                    </Avatar>
                  </div>
                </div>
                {/* Search Bar */}
                <div className="flex h-7.5 items-center gap-2 rounded-full border border-border/60 bg-stone-100/90 dark:bg-muted/60 px-2.5">
                  <IconSearch stroke={2} height={13} width={13} className="shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-[11px] text-muted-foreground truncate">Search channels to join...</span>
                  <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border border-border/80 bg-background text-[11px] font-bold text-muted-foreground cursor-pointer">+</span>
                </div>
              </div>

              {/* Channels List (Discover popular channels for newly signed-in user) */}
              <div className="p-2 space-y-1">
                <div className="px-2 py-1 flex items-center justify-between">
                  <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Suggested Channels</span>
                  <span className="text-[10px] text-primary font-medium">Browse all</span>
                </div>

                {/* Channel 1: General */}
                <div className="group relative flex items-center justify-between rounded-xl px-2.5 py-2 border border-[#d4af37]/80 dark:border-[#f5d061]/60 bg-amber-500/10 dark:bg-muted/70 text-foreground transition-all">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Avatar className="h-8 w-8 shrink-0 border border-border/60">
                      <AvatarFallback className="text-xs font-semibold bg-muted text-foreground">G</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold text-foreground">General</div>
                      <div className="truncate text-[10px] text-muted-foreground">Community discussions</div>
                    </div>
                  </div>
                  <span className="rounded-md border border-primary/40 bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                    Join
                  </span>
                </div>

                {/* Channel 2: Technology */}
                <div className="group relative flex items-center justify-between rounded-xl px-2.5 py-2 border border-transparent bg-transparent hover:bg-stone-100/80 dark:hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Avatar className="h-8 w-8 shrink-0 border border-border/60">
                      <AvatarFallback className="text-xs font-semibold bg-muted text-muted-foreground">T</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-foreground/90">Technology</div>
                      <div className="truncate text-[10px] text-muted-foreground">Devs, hardware & trends</div>
                    </div>
                  </div>
                  <span className="rounded-md border border-border/60 bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Join
                  </span>
                </div>

                {/* Channel 3: AI & Machine Learning */}
                <div className="group relative flex items-center justify-between rounded-xl px-2.5 py-2 border border-transparent bg-transparent hover:bg-stone-100/80 dark:hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Avatar className="h-8 w-8 shrink-0 border border-border/60">
                      <AvatarFallback className="text-xs font-semibold bg-muted text-muted-foreground">A</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-foreground/90">AI & Machine Learning</div>
                      <div className="truncate text-[10px] text-muted-foreground">Models, research & papers</div>
                    </div>
                  </div>
                  <span className="rounded-md border border-border/60 bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Join
                  </span>
                </div>

                {/* Channel 4: Design */}
                <div className="group relative flex items-center justify-between rounded-xl px-2.5 py-2 border border-transparent bg-transparent hover:bg-stone-100/80 dark:hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Avatar className="h-8 w-8 shrink-0 border border-border/60">
                      <AvatarFallback className="text-xs font-semibold bg-muted text-muted-foreground">D</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-foreground/90">Design</div>
                      <div className="truncate text-[10px] text-muted-foreground">UI/UX, design systems</div>
                    </div>
                  </div>
                  <span className="rounded-md border border-border/60 bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Join
                  </span>
                </div>
              </div>
            </div>

            {/* Right Panel: Chat Section (New Sign-In User Welcome State) */}
            <div className="col-span-12 sm:col-span-7 rounded-xl border border-border/70 dark:border-border/40 bg-white/95 dark:bg-card/50 shadow-sm dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-md overflow-hidden flex flex-col justify-center items-center text-center p-6 min-h-[320px]">
              <div className="flex flex-col items-center max-w-sm space-y-3.5">
                <div className="relative flex items-center justify-center py-2">
                  <div className="pointer-events-none absolute -inset-6 rounded-full bg-[radial-gradient(circle,rgba(244,208,63,0.15)_0%,rgba(212,175,55,0.05)_55%,transparent_70%)] blur-xl" />
                  <AppIcon size="lg" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                    Welcome to OpenSpace, Alex!
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Select a channel from the sidebar or search above to start collaborating.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 w-full pt-4 border-t border-border/40 text-left">
                  <div className="flex items-start gap-2.5 rounded-xl border border-border/50 bg-muted/40 p-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                      <IconSearch size={14} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">Discover Channels</div>
                      <div className="text-[10px] text-muted-foreground">Search and join conversations</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 rounded-xl border border-border/50 bg-muted/40 p-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                      <IconPlus size={14} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">Create Channel</div>
                      <div className="text-[10px] text-muted-foreground">Start your own community</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 pt-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <IconMessageCircle size={13} className="text-primary" /> Text Chat
                  </span>
                  <span className="flex items-center gap-1">
                    <IconMicrophone size={13} className="text-primary" /> Voice Rooms
                  </span>
                  <span className="flex items-center gap-1">
                    <IconVideo size={13} className="text-primary" /> Video Calls
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Core Experience (Discover, Connect, Create) */}
        <section id="discover" className="w-full max-w-5xl py-16 border-t border-border/40 scroll-mt-16">
          <div className="mb-14 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-primary mb-2 block">
              How It Works
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Discover. Connect. Create.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Explore public channels, join conversations that interest you, or start your own community in seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Discover */}
            <div className="group relative flex flex-col items-start rounded-2xl border border-border/60 bg-white dark:bg-card/40 p-8 text-left transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:bg-white dark:hover:bg-card/70 shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-none hover:shadow-xl">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                <IconCompass size={24} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
                Discover
              </span>
              <h3 className="mb-2 text-lg font-bold text-foreground">
                Browse open channels
              </h3>
              <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Search and explore public channels across topics like sports, tech, gaming, music, and more.
              </p>
            </div>

            {/* Connect */}
            <div className="group relative flex flex-col items-start rounded-2xl border border-border/60 bg-white dark:bg-card/40 p-8 text-left transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:bg-white dark:hover:bg-card/70 shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-none hover:shadow-xl">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                <IconUsers size={24} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
                Connect
              </span>
              <h3 className="mb-2 text-lg font-bold text-foreground">
                Talk through text, voice, or video
              </h3>
              <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Send messages, drop into live voice channels, or start face-to-face video calls — all within the same space.
              </p>
            </div>

            {/* Create */}
            <div className="group relative flex flex-col items-start rounded-2xl border border-border/60 bg-white dark:bg-card/40 p-8 text-left transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:bg-white dark:hover:bg-card/70 shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-none hover:shadow-xl">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                <IconPlus size={24} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
                Create
              </span>
              <h3 className="mb-2 text-lg font-bold text-foreground">
                Build your own space
              </h3>
              <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                Create a channel around any topic, set it public or private, invite people, and grow your community.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Live Channels */}
        <section id="communities" className="w-full max-w-5xl py-16 border-t border-border/40 scroll-mt-16">
          <div className="mb-10 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-primary mb-2 block">
              Live Channels
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Conversations happening right now.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              People are talking about football, AI, gaming, music, and everything in between. New channels appear every day.
            </p>
          </div>

          {/* Channel Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-left">
            {discoveryRooms.map((room) => (
              <div
                key={room.name}
                className="group relative flex flex-col justify-between rounded-2xl border border-border/60 bg-white dark:bg-card/40 p-6 transition-all duration-200 hover:border-primary/50 hover:shadow-lg shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none"
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-9 w-9 shrink-0 border border-border/60">
                      <AvatarFallback className="text-xs font-bold bg-muted text-foreground">
                        {room.letter}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="text-base font-bold text-foreground">{room.name}</h4>
                      <span className="text-[11px] text-muted-foreground">{room.members} • {room.online}</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                    {room.description}
                  </p>
                </div>

                <div className="rounded-xl border border-border/50 bg-stone-50 dark:bg-muted/40 p-3">
                  <div className="text-[11px] text-muted-foreground italic truncate">
                    "{room.lastMsg}"
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* And many more */}
          <p className="mt-6 text-center text-xs font-medium text-primary/90">
            ...and many more
          </p>
        </section>

        {/* Section 5: Communication Modes */}
        <section id="modes" className="w-full max-w-5xl py-16 border-t border-border/40 scroll-mt-16">
          <div className="mb-14 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-primary mb-2 block">
              Communication
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Text. Voice. Video.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Every channel supports all three modes. Switch between them seamlessly depending on how you want to connect.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 text-left">
            {/* Text Card */}
            <div className="flex flex-col justify-between rounded-2xl border border-border/60 bg-white dark:bg-card/40 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none">
              <div className="space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <IconMessageCircle size={22} />
                </div>
                <h3 className="text-lg font-bold text-foreground">Text</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Real-time messaging with reactions and attachments. Messages are persistent so you never lose context.
                </p>
              </div>
            </div>

            {/* Voice Card */}
            <div className="flex flex-col justify-between rounded-2xl border border-primary/50 bg-amber-500/5 dark:bg-card/60 p-6 shadow-md">
              <div className="space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <IconMicrophone size={22} />
                </div>
                <h3 className="text-lg font-bold text-foreground">Voice</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Drop into live voice channels without scheduling. Just join and start talking with people in real time.
                </p>
              </div>
            </div>

            {/* Video Card */}
            <div className="flex flex-col justify-between rounded-2xl border border-border/60 bg-white dark:bg-card/40 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none">
              <div className="space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <IconVideo size={22} />
                </div>
                <h3 className="text-lg font-bold text-foreground">Video</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Go face-to-face with HD video calls and screen sharing whenever the conversation calls for it.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: Create Room Flowchart */}
        <section id="create" className="w-full max-w-5xl py-16 border-t border-border/40 scroll-mt-16">
          <div className="mb-12 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-primary mb-2 block">
              Create
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Start a channel in seconds.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Pick a topic, set it public or private, and invite people. Your space, your rules.
            </p>
          </div>

          {/* Visual Flowchart */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 max-w-4xl mx-auto mb-10 text-center">
            {[
              { step: "1", title: "Create Channel", desc: "Click + in sidebar" },
              { step: "2", title: "Choose Topic", desc: "Name & category" },
              { step: "3", title: "Customize", desc: "Avatar & visibility" },
              { step: "4", title: "Invite People", desc: "Share link or add" },
              { step: "5", title: "Start Talking", desc: "Text, voice, video" },
            ].map((item) => (
              <div
                key={item.step}
                className="relative flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-white dark:bg-card/40 p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] dark:shadow-none"
              >
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-xs shadow-sm">
                  {item.step}
                </div>
                <div className="text-xs font-bold text-foreground">{item.title}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</div>
              </div>
            ))}
          </div>

        </section>

        {/* Section 7: Final CTA */}
        <section className="w-full max-w-4xl py-16 my-8 rounded-3xl border border-primary/40 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.14)_0%,rgba(255,255,255,0.9)_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(244,187,68,0.12)_0%,transparent_70%)] shadow-[0_10px_40px_rgba(212,175,55,0.08)] p-8 sm:p-14 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl mb-4">
            Ready to join?
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mb-8">
            Thousands of conversations are happening right now. Find the ones that matter to you.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={appUrl}
              className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all duration-200 hover:shadow-[0_0_28px_rgba(212,175,55,0.6)] hover:brightness-105 active:scale-95 cursor-pointer"
            >
              {user ? "Open App" : "Get Started"}
            </Link>

          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="flex h-16 shrink-0 items-center justify-between border-t border-border/50 bg-background/80 px-6 sm:px-12 text-xs text-muted-foreground">
        <div>© 2026 OpenSpace. Connect and discover conversations everywhere.</div>
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
