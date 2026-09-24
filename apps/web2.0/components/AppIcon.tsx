import { IconSparkles } from "@tabler/icons-react"

export function AppIcon({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const word = {
    sm: "text-[16px] tracking-tight",
    md: "text-[20px] tracking-tight",
    lg: "text-[26px] tracking-tight",
  }
  const spark = { sm: "size-3.5", md: "size-4", lg: "size-5" }

  return (
    <div className="relative flex shrink-0 items-center gap-1.5 select-none group">
      <IconSparkles
        className={`${spark[size]} text-[#6D94C5] dark:text-[#4580b4] transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 drop-shadow-xs`}
        stroke={2.2}
      />

      <span
        className={`relative font-display ${word[size]} font-semibold text-ink transition-colors`}
      >
        Open<span className="text-[#6D94C5] dark:text-[#4580b4] font-serif italic">Space</span>
      </span>
    </div>
  )
}
