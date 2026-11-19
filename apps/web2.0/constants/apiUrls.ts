// Unified API Gateway URL
// In the single-server EC2 deployment, all services (users, rooms, chat, auth)
// are routed through the API Gateway (port 3005 / https://api.openspace.anujacharjee.com).
const envApiGatewayUrl =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL?.trim() ||
  process.env.NEXT_PUBLIC_HTTP_SRV_URL?.trim() ||
  ""

function resolveApiGatewayUrl(): string {
  if (typeof window !== "undefined") {
    // When running locally in browser, proxy through Next.js rewrites to prevent CORS errors
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return ""
    }
    // In production on openspace.anujacharjee.com, use configured URL or canonical production API
    if (window.location.hostname.includes("anujacharjee.com")) {
      return envApiGatewayUrl || "https://api.openspace.anujacharjee.com"
    }
  }
  return envApiGatewayUrl || "http://localhost:3005"
}

const apiGatewayUrl = resolveApiGatewayUrl()

// In unified architecture, chat-service is proxied via API Gateway at /api/v1/chat
const chatBaseUrl =
  process.env.NEXT_PUBLIC_CHAT_SRV_URL?.trim() ||
  apiGatewayUrl

export const usersApiUrl = `${apiGatewayUrl}/api/v1/users`
export const roomsApiUrl = `${apiGatewayUrl}/api/v1/rooms`
export const chatApiUrl = `${chatBaseUrl}/api/v1/chat`
export const pramaanAuthApiUrl = `${apiGatewayUrl}/api/v1/auth/pramaan`

