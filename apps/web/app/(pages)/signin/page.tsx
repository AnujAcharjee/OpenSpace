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
    <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(244,187,68,0.18),transparent_30%),linear-gradient(135deg,#fff8eb_0%,#fffdf8_45%,#f6f1e7_100%)] px-6 py-16 text-foreground dark:bg-[radial-gradient(circle_at_top,rgba(244,187,68,0.10),transparent_35%),linear-gradient(135deg,#18181b_0%,#09090b_60%,#18181b_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(123,77,22,0.06)_35%,transparent_70%)] dark:bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.05)_35%,transparent_70%)]" />

      <Card className="relative w-full max-w-xl border border-border/60 bg-card/90 shadow-[0_24px_80px_rgba(0,0,0,0.12)] backdrop-blur dark:bg-card/70">
        <CardHeader className="space-y-6 pb-2">
          <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-[0.28em] text-primary uppercase">
            <AppIcon size="sm" />
          </CardTitle>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">Welcome back</h1>

            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              Sign in to continue to OpenSpace using your secure Pramaan identity.
            </p>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col items-center justify-center space-y-6 pt-6">
          {error && (
            <div className="w-full rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid w-full gap-3">
            <Button
              size="lg"
              className="h-12 rounded-xl text-sm font-semibold cursor-pointer shadow-[0_0_20px_rgba(244,187,68,0.25)] hover:shadow-[0_0_25px_rgba(244,187,68,0.45)]"
              disabled={loading}
              onClick={() => handleNavigate(signinUrl)}
            >
              {loading ? (
                <>
                  <IconLoader2 className="mr-2 size-4 animate-spin" />
                  Redirecting…
                </>
              ) : (
                "Continue with Pramaan"
              )}
            </Button>
          </div>

          <div className="w-full">
            <div className="space-y-1 space-x-2 rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
              <p className="flex gap-2">
                <IconShieldCheck className="mt-0.5 size-4 text-emerald-600" />
                <span className="text-xs leading-5 font-semibold text-foreground">
                  Pramaan verified.
                </span>
              </p>

              <p className="text-xs leading-5 text-muted-foreground">
                Your authentication is handled securely using encrypted identity
                protocols.
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
        <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(244,187,68,0.18),transparent_30%),linear-gradient(135deg,#fff8eb_0%,#fffdf8_45%,#f6f1e7_100%)] dark:bg-[radial-gradient(circle_at_top,rgba(244,187,68,0.10),transparent_35%),linear-gradient(135deg,#18181b_0%,#09090b_60%,#18181b_100%)]">
          <IconLoader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  )
}
