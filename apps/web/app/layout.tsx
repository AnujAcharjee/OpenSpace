import { Geist_Mono, Raleway } from "next/font/google"
import type { Metadata } from "next"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

const raleway = Raleway({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://openspace.anujacharjee.com"),
  title: {
    default: "OpenSpace — Discover Conversations & Communities",
    template: "%s | OpenSpace",
  },
  description:
    "Discover channels, join conversations, and connect with people worldwide through text, voice, and video.",
  keywords: [
    "OpenSpace",
    "real-time chat",
    "community channels",
    "group messaging",
    "chat app",
    "voice channels",
    "social platform",
    "instant messaging",
    "public channels",
    "private channels",
  ],
  authors: [{ name: "Anuj Acharjee", url: "https://anujacharjee.com" }],
  creator: "Anuj Acharjee",
  publisher: "OpenSpace",
  alternates: {
    canonical: "https://openspace.anujacharjee.com",
  },

  // Open Graph — social media previews (WhatsApp, Facebook, LinkedIn)
  openGraph: {
    title: "OpenSpace — Discover Conversations & Communities",
    description:
      "Discover channels, join conversations, and connect with people worldwide through text, voice, and video.",
    url: "https://openspace.anujacharjee.com",
    siteName: "OpenSpace",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "OpenSpace — Discover Conversations & Communities",
      },
    ],
  },

  // Twitter / X cards
  twitter: {
    card: "summary_large_image",
    title: "OpenSpace — Discover Conversations & Communities",
    description:
      "Discover channels, join conversations, and connect with people worldwide through text, voice, and video.",
    images: ["/og-image.png"],
    creator: "@AnujAcharjee",
  },

  // Controls search engine crawling
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  icons: {
    icon: [
      { url: "/logo/favicon.ico" },
      { url: "/logo/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/logo/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/logo/apple-touch-icon.png", sizes: "180x180" }],
    other: [
      { rel: "icon", url: "/logo/favicon-192x192.png", sizes: "192x192" },
    ],
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://openspace.anujacharjee.com/#website",
      url: "https://openspace.anujacharjee.com",
      name: "OpenSpace",
      description:
        "Discover channels, join conversations, and connect with people worldwide through text, voice, and video.",
      publisher: {
        "@type": "Person",
        name: "Anuj Acharjee",
        url: "https://anujacharjee.com",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://openspace.anujacharjee.com/#application",
      name: "OpenSpace",
      applicationCategory: "CommunicationApplication",
      operatingSystem: "All",
      browserRequirements: "Requires JavaScript. Requires HTML5.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        raleway.variable
      )}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="flex min-h-screen items-center justify-center bg-background">
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
