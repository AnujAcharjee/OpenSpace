import { IconSparkles } from "@tabler/icons-react"

export function AppIcon({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const word = {
    sm: "text-[16px] tracking-[1.5px]",
    md: "text-[20px] tracking-[2px]",
    lg: "text-[28px] tracking-[2.5px]",
  }
  const spark = { sm: "size-3.5", md: "size-4", lg: "size-5" }

  return (
    <div className="relative flex shrink-0 items-center gap-2 select-none">
      {/* Soft, light golden ambient glow */}
      <div className="pointer-events-none absolute -inset-2 rounded-full bg-[radial-gradient(circle,rgba(244,208,63,0.08)_0%,rgba(212,175,55,0.02)_50%,transparent_70%)] blur-md dark:bg-[radial-gradient(circle,rgba(244,208,63,0.12)_0%,rgba(212,175,55,0.03)_50%,transparent_70%)]" />

      <IconSparkles
        className={`${spark[size]} text-[#d4af37] dark:text-[#f5d061] drop-shadow-[0_0_5px_rgba(212,175,55,0.25)] transition-transform duration-300 hover:rotate-12`}
        stroke={2}
      />

      <span
        className={`relative font-sans ${word[size]} leading-none font-bold tracking-widest text-[#b8860b] dark:text-[#f5d061] drop-shadow-[0_0_6px_rgba(212,175,55,0.15)]`}
      >
        OpenSpace
      </span>
    </div>
  )
}
