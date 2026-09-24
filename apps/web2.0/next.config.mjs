/** @type {import('next').NextConfig} */
const apiGatewayUrl =
  process.env.API_GATEWAY_URL ||
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ||
  "http://localhost:3005"

const nextConfig = {
  transpilePackages: ["@repo/validation", "@repo/auth"],
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiGatewayUrl}/api/v1/:path*`,
      },
    ]
  },
}

export default nextConfig
