import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import HomeLayout from "../(home)/homeLayout"

export default async function UserWorkspacePage({
  params,
}: {
  params: Promise<{ username?: string }>
}) {
  const cookieStore = await cookies()
  const token =
    cookieStore.get("accessToken")?.value ||
    cookieStore.get("collab_token")?.value

  if (!token) {
    const resolvedParams = await params
    const rawUsername = resolvedParams?.username
    const returnUrl = rawUsername ? encodeURIComponent(`/${rawUsername}`) : ""
    redirect(returnUrl ? `/signin?returnUrl=${returnUrl}` : "/signin")
  }

  return <HomeLayout />
}
