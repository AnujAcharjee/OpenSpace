import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import dotenv from "dotenv"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load root workspace env (.env.dev in dev, .env.production in cloud/prod)
const rootDir = path.resolve(__dirname, "../..")
const isCloud = process.env.ENV_TARGET === "cloud" || process.env.NODE_ENV === "production"
const rootEnvFile = isCloud ? ".env.production" : ".env.dev"
const rootEnvPath = path.join(rootDir, rootEnvFile)
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath })
}

// Ensure @repo/validation is built before Next.js Turbopack resolves workspace packages
const validationDist = path.resolve(__dirname, "../../packages/validation/dist/index.js")
if (!fs.existsSync(validationDist)) {
  try {
    execSync("pnpm --filter @repo/validation build", {
      cwd: path.resolve(__dirname, "../.."),
      stdio: "inherit",
    })
  } catch (e) {
    console.error("Failed to prebuild @repo/validation in next.config.mjs:", e)
  }
}

/** @type {import('next').NextConfig} */
const apiGatewayUrl =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ||
  process.env.API_GATEWAY_URL ||
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

