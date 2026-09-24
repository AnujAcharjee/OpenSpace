"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { IconSearch, IconX } from "@tabler/icons-react"

type EmojiItem = {
  emoji: string
  name: string
  keywords: string[]
}

type EmojiCategory = {
  name: string
  icon: string
  emojis: EmojiItem[]
}

const QUICK_REACTIONS: string[] = ["👍", "❤️", "🔥", "😂", "🎉", "🚀", "✨", "🙏"]

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: "Smileys",
    icon: "😀",
    emojis: [
      { emoji: "😀", name: "Grinning face", keywords: ["smile", "happy", "grin"] },
      { emoji: "😃", name: "Grinning face with big eyes", keywords: ["smile", "happy", "joy"] },
      { emoji: "😄", name: "Grinning face with smiling eyes", keywords: ["smile", "happy", "laugh"] },
      { emoji: "😁", name: "Beaming face with smiling eyes", keywords: ["grin", "proud", "teeth"] },
      { emoji: "😆", name: "Grinning squinting face", keywords: ["laugh", "satisfied", "haha"] },
      { emoji: "😅", name: "Grinning face with sweat", keywords: ["sweat", "relieved", "phew"] },
      { emoji: "🤣", name: "Rolling on the floor laughing", keywords: ["rofl", "lmao", "lol", "laugh"] },
      { emoji: "😂", name: "Face with tears of joy", keywords: ["crying", "tears", "lol", "laugh"] },
      { emoji: "🙂", name: "Slightly smiling face", keywords: ["smile", "calm", "okay"] },
      { emoji: "😉", name: "Winking face", keywords: ["wink", "flirt", "playful"] },
      { emoji: "😊", name: "Smiling face with smiling eyes", keywords: ["blush", "warm", "happy"] },
      { emoji: "😇", name: "Smiling face with halo", keywords: ["angel", "innocent", "good"] },
      { emoji: "🥰", name: "Smiling face with hearts", keywords: ["love", "adore", "crush"] },
      { emoji: "😍", name: "Heart eyes", keywords: ["love", "crush", "in love"] },
      { emoji: "🤩", name: "Star-struck", keywords: ["star", "amazed", "excited"] },
      { emoji: "😘", name: "Face blowing a kiss", keywords: ["kiss", "love", "heart"] },
      { emoji: "😋", name: "Face savoring food", keywords: ["yum", "delicious", "tongue"] },
      { emoji: "😛", name: "Face with tongue", keywords: ["tongue", "playful", "silly"] },
      { emoji: "😜", name: "Winking face with tongue", keywords: ["wink", "tongue", "crazy"] },
      { emoji: "🤪", name: "Zany face", keywords: ["crazy", "goofy", "wild"] },
      { emoji: "😎", name: "Smiling face with sunglasses", keywords: ["cool", "glasses", "confident"] },
      { emoji: "🤓", name: "Nerd face", keywords: ["nerd", "geek", "glasses", "smart"] },
      { emoji: "🧐", name: "Face with monocle", keywords: ["curious", "inspect", "monocle"] },
      { emoji: "🥳", name: "Partying face", keywords: ["party", "celebration", "happy", "hat"] },
      { emoji: "😏", name: "Smirking face", keywords: ["smirk", "flirt", "cocky"] },
      { emoji: "😒", name: "Unamused face", keywords: ["meh", "bored", "unamused"] },
      { emoji: "🙄", name: "Face with rolling eyes", keywords: ["eyeroll", "whatever", "sarcastic"] },
      { emoji: "😬", name: "Grimacing face", keywords: ["awkward", "grimace", "nervous"] },
      { emoji: "😌", name: "Relieved face", keywords: ["peace", "calm", "relief"] },
      { emoji: "😴", name: "Sleeping face", keywords: ["sleep", "tired", "zzz"] },
      { emoji: "🤔", name: "Thinking face", keywords: ["think", "hmm", "wonder", "ponder"] },
      { emoji: "🤫", name: "Shushing face", keywords: ["quiet", "secret", "shh"] },
      { emoji: "🫡", name: "Saluting face", keywords: ["salute", "respect", "yes sir"] },
      { emoji: "🤐", name: "Zipper-mouth face", keywords: ["silent", "zip", "quiet"] },
      { emoji: "🤨", name: "Face with raised eyebrow", keywords: ["suspicious", "skeptical", "doubt"] },
      { emoji: "😐", name: "Neutral face", keywords: ["neutral", "blank", "poker"] },
      { emoji: "😑", name: "Expressionless face", keywords: ["blank", "done", "serious"] },
      { emoji: "😶", name: "Face without mouth", keywords: ["speechless", "blank", "quiet"] },
      { emoji: "🥱", name: "Yawning face", keywords: ["yawn", "sleepy", "bored"] },
      { emoji: "😮‍💨", name: "Face exhaling", keywords: ["sigh", "gasp", "phew"] },
      { emoji: "🤯", name: "Exploding head", keywords: ["mind blown", "shock", "wow"] },
      { emoji: "😳", name: "Flushed face", keywords: ["blush", "shocked", "embarrassed"] },
      { emoji: "🥺", name: "Pleading face", keywords: ["puppy eyes", "please", "begging"] },
      { emoji: "🥹", name: "Face holding back tears", keywords: ["grateful", "touched", "proud"] },
      { emoji: "😭", name: "Loudly crying face", keywords: ["cry", "sad", "sobbing", "tears"] },
      { emoji: "😱", name: "Face screaming in fear", keywords: ["scream", "scared", "fear"] },
      { emoji: "😤", name: "Face with steam from nose", keywords: ["frustrated", "angry", "proud"] },
      { emoji: "😡", name: "Pouting face", keywords: ["angry", "mad", "rage"] },
      { emoji: "🤬", name: "Face with symbols on mouth", keywords: ["cursing", "swear", "furious"] },
    ],
  },
  {
    name: "Hands & Gestures",
    icon: "👍",
    emojis: [
      { emoji: "👍", name: "Thumbs up", keywords: ["thumbs up", "like", "agree", "yes", "good", "+1"] },
      { emoji: "👎", name: "Thumbs down", keywords: ["thumbs down", "dislike", "no", "bad", "-1"] },
      { emoji: "👏", name: "Clapping hands", keywords: ["clap", "applause", "bravo", "praise"] },
      { emoji: "🙌", name: "Raising hands", keywords: ["celebrate", "hooray", "cheer"] },
      { emoji: "👐", name: "Open hands", keywords: ["open", "hug", "jazz"] },
      { emoji: "🤝", name: "Handshake", keywords: ["deal", "agreement", "shake", "friends"] },
      { emoji: "🙏", name: "Folded hands", keywords: ["please", "thank you", "pray", "namaste"] },
      { emoji: "✌️", name: "Victory hand", keywords: ["peace", "two", "victory"] },
      { emoji: "🤞", name: "Crossed fingers", keywords: ["luck", "hopeful", "wish"] },
      { emoji: "🫰", name: "Hand with index finger and thumb crossed", keywords: ["love", "money", "finger heart"] },
      { emoji: "🤟", name: "Love-you gesture", keywords: ["love", "rock", "sign"] },
      { emoji: "🤘", name: "Sign of the horns", keywords: ["rock", "metal", "horns"] },
      { emoji: "🤙", name: "Call me hand", keywords: ["call", "shaka", "hang loose"] },
      { emoji: "👈", name: "Backhand index pointing left", keywords: ["left", "point"] },
      { emoji: "👉", name: "Backhand index pointing right", keywords: ["right", "point"] },
      { emoji: "👆", name: "Backhand index pointing up", keywords: ["up", "point"] },
      { emoji: "👇", name: "Backhand index pointing down", keywords: ["down", "point"] },
      { emoji: "☝️", name: "Index pointing up", keywords: ["one", "first", "point up"] },
      { emoji: "✋", name: "Raised hand", keywords: ["high five", "stop", "palm"] },
      { emoji: "👋", name: "Waving hand", keywords: ["wave", "hello", "hi", "bye"] },
      { emoji: "👌", name: "OK hand", keywords: ["ok", "perfect", "fine"] },
      { emoji: "🤌", name: "Pinched fingers", keywords: ["italian", "chef", "what"] },
      { emoji: "🤏", name: "Pinching hand", keywords: ["small", "tiny", "little"] },
      { emoji: "💪", name: "Flexed biceps", keywords: ["strong", "power", "muscle", "flex"] },
      { emoji: "🦾", name: "Mechanical arm", keywords: ["robot", "bionic", "strength"] },
      { emoji: "👀", name: "Eyes", keywords: ["look", "see", "watch", "peeking"] },
      { emoji: "🧠", name: "Brain", keywords: ["smart", "mind", "genius", "think"] },
      { emoji: "🧑‍💻", name: "Technologist", keywords: ["developer", "coder", "programmer", "laptop"] },
      { emoji: "🚀", name: "Rocket", keywords: ["launch", "fast", "space", "ship"] },
    ],
  },
  {
    name: "Hearts & Sparkles",
    icon: "❤️",
    emojis: [
      { emoji: "❤️", name: "Red heart", keywords: ["heart", "love", "red"] },
      { emoji: "🧡", name: "Orange heart", keywords: ["heart", "love", "orange"] },
      { emoji: "💛", name: "Yellow heart", keywords: ["heart", "love", "yellow"] },
      { emoji: "💚", name: "Green heart", keywords: ["heart", "love", "green"] },
      { emoji: "💙", name: "Blue heart", keywords: ["heart", "love", "blue"] },
      { emoji: "💜", name: "Purple heart", keywords: ["heart", "love", "purple"] },
      { emoji: "🖤", name: "Black heart", keywords: ["heart", "love", "black"] },
      { emoji: "🤍", name: "White heart", keywords: ["heart", "love", "white"] },
      { emoji: "🤎", name: "Brown heart", keywords: ["heart", "love", "brown"] },
      { emoji: "💔", name: "Broken heart", keywords: ["broken", "heartbreak", "sad"] },
      { emoji: "❤️‍🔥", name: "Heart on fire", keywords: ["passion", "fire", "love"] },
      { emoji: "💖", name: "Sparkling heart", keywords: ["sparkle", "love", "cute"] },
      { emoji: "💗", name: "Growing heart", keywords: ["love", "pulse", "grow"] },
      { emoji: "💓", name: "Beating heart", keywords: ["beat", "heartbeat", "vibrate"] },
      { emoji: "💞", name: "Revolving hearts", keywords: ["love", "romance", "circle"] },
      { emoji: "💕", name: "Two hearts", keywords: ["love", "couple", "pink"] },
      { emoji: "💌", name: "Love letter", keywords: ["letter", "mail", "envelope", "kiss"] },
      { emoji: "💋", name: "Kiss mark", keywords: ["kiss", "lips", "flirt"] },
      { emoji: "✨", name: "Sparkles", keywords: ["magic", "stars", "shine", "sparkle", "clean"] },
      { emoji: "⭐", name: "Star", keywords: ["star", "favorite", "yellow"] },
      { emoji: "🌟", name: "Glowing star", keywords: ["star", "glow", "shine"] },
      { emoji: "💫", name: "Dizzy", keywords: ["star", "dizzy", "sparkle"] },
    ],
  },
  {
    name: "Objects & Symbols",
    icon: "🎉",
    emojis: [
      { emoji: "🎉", name: "Party popper", keywords: ["party", "tada", "celebrate", "congrats"] },
      { emoji: "🎊", name: "Confetti ball", keywords: ["confetti", "party", "festival"] },
      { emoji: "🎈", name: "Balloon", keywords: ["balloon", "party", "birthday"] },
      { emoji: "🎁", name: "Wrapped gift", keywords: ["gift", "present", "birthday"] },
      { emoji: "🏆", name: "Trophy", keywords: ["award", "winner", "prize", "first"] },
      { emoji: "🥇", name: "1st place medal", keywords: ["gold", "winner", "first"] },
      { emoji: "🥈", name: "2nd place medal", keywords: ["silver", "second"] },
      { emoji: "🥉", name: "3rd place medal", keywords: ["bronze", "third"] },
      { emoji: "🎖️", name: "Military medal", keywords: ["award", "honor", "medal"] },
      { emoji: "🎯", name: "Bullseye", keywords: ["target", "hit", "goal"] },
      { emoji: "🔥", name: "Fire", keywords: ["lit", "hot", "flame", "trending"] },
      { emoji: "⚡", name: "High voltage", keywords: ["lightning", "thunder", "fast", "bolt", "electric"] },
      { emoji: "💡", name: "Light bulb", keywords: ["idea", "light", "smart", "invention"] },
      { emoji: "💻", name: "Laptop", keywords: ["computer", "code", "tech", "work"] },
      { emoji: "📱", name: "Mobile phone", keywords: ["phone", "screen", "cell"] },
      { emoji: "🔒", name: "Locked", keywords: ["lock", "private", "secure"] },
      { emoji: "🔓", name: "Unlocked", keywords: ["unlock", "open", "public"] },
      { emoji: "🔑", name: "Key", keywords: ["key", "password", "access"] },
      { emoji: "📦", name: "Package", keywords: ["box", "delivery", "shipping", "npm"] },
      { emoji: "📌", name: "Pushpin", keywords: ["pin", "pinned", "mark"] },
      { emoji: "📍", name: "Round pushpin", keywords: ["pin", "location", "place"] },
      { emoji: "📎", name: "Paperclip", keywords: ["clip", "attach", "attachment"] },
      { emoji: "✅", name: "Check mark button", keywords: ["check", "done", "yes", "correct", "approved"] },
      { emoji: "❌", name: "Cross mark", keywords: ["cross", "x", "no", "wrong", "cancel"] },
      { emoji: "⚠️", name: "Warning", keywords: ["warning", "alert", "caution"] },
      { emoji: "☕", name: "Hot beverage", keywords: ["coffee", "tea", "cafe"] },
      { emoji: "🍕", name: "Pizza", keywords: ["food", "cheese", "slice"] },
      { emoji: "🍻", name: "Clinking beer mugs", keywords: ["cheers", "beer", "drink"] },
    ],
  },
]

export interface EmojiPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelectEmoji: (emoji: string) => void
  className?: string
}

export function EmojiPicker({
  isOpen,
  onClose,
  onSelectEmoji,
  className = "",
}: EmojiPickerProps) {
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [hoveredEmoji, setHoveredEmoji] = useState<{ emoji: string; name: string } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  const isDraggingTabs = useRef(false)
  const dragStartX = useRef(0)
  const dragScrollLeft = useRef(0)

  const handleTabsWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0) {
      e.currentTarget.scrollLeft += e.deltaY
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tabsRef.current) return
    isDraggingTabs.current = true
    dragStartX.current = e.pageX - tabsRef.current.offsetLeft
    dragScrollLeft.current = tabsRef.current.scrollLeft
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingTabs.current || !tabsRef.current) return
    const x = e.pageX - tabsRef.current.offsetLeft
    const walk = (x - dragStartX.current) * 1.5
    tabsRef.current.scrollLeft = dragScrollLeft.current - walk
  }

  const handleMouseUpOrLeave = () => {
    isDraggingTabs.current = false
  }

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose()
      }
    }

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  // Reset query and focus search when opening
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("")
      setHoveredEmoji(null)
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    }
  }, [isOpen])

  // Filter emojis based on query
  const filteredEmojis = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return null

    const results: Array<{ emoji: string; name: string }> = []
    for (const cat of EMOJI_CATEGORIES) {
      for (const item of cat.emojis) {
        if (
          item.name.toLowerCase().includes(query) ||
          item.keywords.some((k) => k.toLowerCase().includes(query)) ||
          item.emoji.includes(query)
        ) {
          results.push({ emoji: item.emoji, name: item.name })
        }
      }
    }
    return results
  }, [searchQuery])

  if (!isOpen) return null

  return (
    <div
      ref={containerRef}
      className={`absolute bottom-full mb-3 left-0 sm:left-2 z-50 flex flex-col w-80 sm:w-[340px] max-h-[380px] rounded-[var(--radius-sketch-md)] border border-line bg-paper shadow-xl p-3 text-ink animate-in fade-in zoom-in-95 duration-150 select-none ${className}`}
      role="dialog"
      aria-label="Emoji picker"
    >
      {/* Quick Reaction Bar */}
      <div className="flex items-center justify-between gap-1 pb-2 border-b border-line mb-2 shrink-0">
        <span className="font-display text-[10px] font-semibold text-ink-muted tracking-wider uppercase pl-1">
          Quick
        </span>
        <div className="flex items-center gap-1">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onSelectEmoji(emoji)}
              className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sketch-sm)] text-base transition-all duration-150 hover:scale-125 hover:bg-[var(--pencil-yellow-soft)] active:scale-95 cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative flex items-center mb-2 shrink-0">
        <div className="flex w-full items-center gap-2 rounded-[var(--radius-sketch-sm)] border border-line bg-paper-subtle px-3 py-1.5 text-xs transition-colors focus-within:border-[var(--pencil-teal)]">
          <IconSearch size={14} className="text-ink-muted shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search emojis..."
            className="flex-1 bg-transparent text-xs text-ink placeholder:text-ink-subtle outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-ink-muted hover:text-ink rounded p-0.5"
            >
              <IconX size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs (if not searching) */}
      {!searchQuery && (
        <div
          ref={tabsRef}
          onWheel={handleTabsWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className="flex items-center gap-1 border-b border-line pb-2 mb-2 overflow-x-auto overflow-y-hidden no-scrollbar scrollbar-none shrink-0 cursor-grab active:cursor-grabbing select-none"
        >
          {EMOJI_CATEGORIES.map((cat, idx) => (
            <button
              key={cat.name}
              type="button"
              onClick={(e) => {
                setActiveCategoryIndex(idx)
                e.currentTarget.scrollIntoView({
                  behavior: "smooth",
                  inline: "center",
                  block: "nearest",
                })
              }}
              className={`flex h-7 shrink-0 items-center gap-1.5 rounded-[var(--radius-sketch-sm)] px-2.5 text-xs font-medium transition-all duration-150 cursor-pointer ${
                activeCategoryIndex === idx
                  ? "bg-[var(--pencil-teal)] text-paper font-semibold shadow-2xs"
                  : "text-ink-muted hover:bg-surface-hover hover:text-ink"
              }`}
              title={cat.name}
            >
              <span className="text-sm shrink-0 pointer-events-none">{cat.icon}</span>
              <span className="text-[11px] whitespace-nowrap pointer-events-none">{cat.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Emoji Grid Area */}
      <div className="flex-1 overflow-y-auto px-1 max-h-48 pr-1 scrollbar-ultra-thin">
        {filteredEmojis !== null ? (
          <div>
            <div className="font-display text-[10px] font-semibold text-ink-muted uppercase tracking-wider mb-2 px-1">
              Search Results ({filteredEmojis.length})
            </div>
            {filteredEmojis.length === 0 ? (
              <div className="py-10 text-center text-xs text-ink-muted">
                No emojis match &quot;{searchQuery}&quot;
              </div>
            ) : (
              <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
                {filteredEmojis.map((item, i) => (
                  <button
                    key={`${item.emoji}-${i}`}
                    type="button"
                    onMouseEnter={() => setHoveredEmoji(item)}
                    onClick={() => {
                      onSelectEmoji(item.emoji)
                    }}
                    title={item.name}
                    className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sketch-sm)] text-xl transition-all duration-150 hover:scale-125 hover:bg-[var(--pencil-yellow-soft)] hover:shadow-2xs active:scale-95 cursor-pointer"
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="font-display text-[10px] font-semibold text-ink-muted uppercase tracking-wider mb-1.5 px-1">
              {EMOJI_CATEGORIES[activeCategoryIndex].name}
            </div>
            <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
              {EMOJI_CATEGORIES[activeCategoryIndex].emojis.map((item) => (
                <button
                  key={item.emoji}
                  type="button"
                  onMouseEnter={() => setHoveredEmoji(item)}
                  onClick={() => {
                    onSelectEmoji(item.emoji)
                  }}
                  title={item.name}
                  className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sketch-sm)] text-xl transition-all duration-150 hover:scale-125 hover:bg-[var(--pencil-yellow-soft)] hover:shadow-2xs active:scale-95 cursor-pointer"
                >
                  {item.emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hover Preview Footer */}
      <div className="flex items-center gap-2 pt-2 mt-1 border-t border-line px-1 text-xs text-ink-muted min-h-7 shrink-0">
        {hoveredEmoji ? (
          <div className="flex items-center gap-2 animate-in fade-in duration-100">
            <span className="text-xl leading-none">{hoveredEmoji.emoji}</span>
            <span className="text-[11px] font-medium text-ink truncate max-w-[240px]">
              {hoveredEmoji.name}
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-ink-subtle">
            Click any emoji to stamp into message
          </span>
        )}
      </div>
    </div>
  )
}
