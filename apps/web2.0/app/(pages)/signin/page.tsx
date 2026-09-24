"use client"

import { useMemo, useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import useAppStore from "@/stores/app-store"
import { IconShieldCheck, IconLoader2 } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { pramaanAuthApiUrl } from "@/constants/apiUrls"
import { AppIcon } from "@/components/AppIcon"

function buildPramaanUrl(returnUrl?: string | null) {
  const base = pramaanAuthApiUrl.startsWith("http")
    ? pramaanAuthApiUrl
    : typeof window !== "undefined"
      ? `${window.location.origin}${pramaanAuthApiUrl}`
      : `http://localhost:3000${pramaanAuthApiUrl}`
  const url = new URL(base)
  url.searchParams.set("mode", "signin")
  if (returnUrl) {
    url.searchParams.set("returnUrl", returnUrl)
  }
  return url.toString()
}

function SignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get("error")
  const returnUrl = searchParams.get("returnUrl")

  const user = useAppStore((s) => s.user)
  const hasHydrated = useAppStore((s) => s.hasHydrated)

  const [loading, setLoading] = useState(false)

  const signinUrl = useMemo(() => buildPramaanUrl(returnUrl), [returnUrl])

  useEffect(() => {
    if (hasHydrated && user?.username) {
      const destination = returnUrl
        ? decodeURIComponent(returnUrl)
        : `/@${encodeURIComponent(user.username)}`
      router.replace(destination)
    }
  }, [hasHydrated, user, returnUrl, router])

  function handleNavigate(url: string) {
    setLoading(true)
    window.location.href = url
  }

  return (
    <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-paper px-6 py-16 text-ink">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,160,61,0.08)_0%,transparent_60%)]" />

      <Card className="relative w-full max-w-md border border-line bg-paper shadow-lg rounded-[var(--radius-sketch-lg)]">
        <CardHeader className="space-y-4 pb-2 text-center items-center">
          <CardTitle className="flex items-center justify-center">
            <AppIcon size="md" />
          </CardTitle>

          <div className="space-y-1">
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Welcome back</h1>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
              Sign in to OpenSpace using your verified Pramaan identity.
            </p>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col items-center justify-center space-y-6 pt-4">
          {error && (
            <div className="w-full rounded-[var(--radius-sketch-sm)] border border-[var(--pencil-coral)]/40 bg-[var(--pencil-coral-soft)] px-4 py-2.5 text-xs text-[var(--pencil-coral)]">
              {error}
            </div>
          )}

          <div className="grid w-full gap-3">
            <Button
              size="lg"
              className="h-11 rounded-[var(--radius-sketch-sm)] text-xs font-semibold cursor-pointer shadow-sm bg-[var(--pencil-teal)] text-paper hover:bg-[var(--pencil-teal)]/90"
              disabled={loading}
              onClick={() => handleNavigate(signinUrl)}
            >
              {loading ? (
                <>
                  <IconLoader2 className="mr-2 size-4 animate-spin" />
                  Connecting to Pramaan…
                </>
              ) : (
                "Continue with Pramaan"
              )}
            </Button>
          </div>

          <div className="w-full">
            <div className="space-y-1 rounded-[var(--radius-sketch-sm)] border border-line bg-paper-subtle px-3.5 py-2.5">
              <p className="flex items-center gap-1.5">
                <IconShieldCheck className="size-4 text-[var(--pencil-green)]" />
                <span className="font-display text-xs font-semibold text-ink">
                  Pramaan verified security
                </span>
              </p>
              <p className="text-[11px] leading-relaxed text-ink-muted">
                Your session and authentication are securely protected with encrypted identity protocols.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="relative flex min-h-svh w-full items-center justify-center bg-paper">
          <IconLoader2 className="size-8 animate-spin text-[var(--pencil-teal)]" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  )
}
