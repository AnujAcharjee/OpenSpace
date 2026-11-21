const apiGatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:3005"

export const authApiUrl = `${apiGatewayUrl}/api/v1/auth`
export const usersApiUrl = `${apiGatewayUrl}/api/v1/users`
export const roomsApiUrl = `${apiGatewayUrl}/api/v1/rooms`
export const chatApiUrl = `${apiGatewayUrl}/api/v1/chat`
export const pramaanAuthApiUrl = `${apiGatewayUrl}/api/v1/auth/pramaan`
