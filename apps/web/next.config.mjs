/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/validation", "@repo/auth"],
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "https://api.openspace.anujacharjee.com/api/v1/:path*",
      },
    ]
  },
}

export default nextConfig
