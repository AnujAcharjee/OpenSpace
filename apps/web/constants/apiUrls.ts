const envApiGatewayUrl =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ||
  process.env.NEXT_PUBLIC_HTTP_SRV_URL ||
  ""

function resolveApiGatewayUrl() {
  if (typeof window !== "undefined") {
    // When running locally in browser, proxy through Next.js rewrites to prevent CORS errors
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      if (!envApiGatewayUrl || envApiGatewayUrl.includes("openspace.anujacharjee.com")) {
        return ""
      }
    }
  }
  return envApiGatewayUrl || "http://localhost:3005"
}

const apiGatewayUrl = resolveApiGatewayUrl()

const chatBaseUrl =
  process.env.NEXT_PUBLIC_CHAT_SRV_URL ||
  apiGatewayUrl

export const usersApiUrl = `${apiGatewayUrl}/api/v1/users`
export const roomsApiUrl = `${apiGatewayUrl}/api/v1/rooms`
export const chatApiUrl = `${chatBaseUrl}/api/v1/chat`
export const pramaanAuthApiUrl = `${apiGatewayUrl}/api/v1/auth/pramaan`

