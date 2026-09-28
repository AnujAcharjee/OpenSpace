import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // Protected paths: user workspaces (@username or /user/...), profile, settings
  const isProtected =
    pathname.startsWith("/@") ||
    pathname.startsWith("/user") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/settings")

  if (isProtected) {
    const token =
      request.cookies.get("accessToken")?.value ||
      request.cookies.get("collab_token")?.value

    if (!token) {
      const returnUrl = encodeURIComponent(`${pathname}${search}`)
      const signInUrl = new URL(`/signin?returnUrl=${returnUrl}`, request.url)
      return NextResponse.redirect(signInUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
