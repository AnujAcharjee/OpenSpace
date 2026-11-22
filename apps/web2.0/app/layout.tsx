import { JetBrains_Mono, Plus_Jakarta_Sans, Newsreader } from "next/font/google"
import type { Metadata } from "next"
import Script from "next/script"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
})

const fontDisplay = Newsreader({
  subsets: ["latin"],
  variable: "--font-display",
  style: ["normal", "italic"],
})

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://openspace.anujacharjee.com"),
  title: {
    default: "OpenSpace — Illustrated Stationery Real-Time Chat",
    template: "%s | OpenSpace",
  },
  description:
    "A modern real-time chat application inspired by colored-pencil illustrations and fine stationery. Discover channels, join conversations, and connect with people worldwide.",
  keywords: [
    "OpenSpace",
    "illustrated chat",
    "stationery chat",
    "real-time chat",
    "community channels",
    "group messaging",
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
  openGraph: {
    title: "OpenSpace — Illustrated Stationery Real-Time Chat",
    description:
      "A modern real-time chat application inspired by colored-pencil illustrations and fine stationery.",
    url: "https://openspace.anujacharjee.com",
    siteName: "OpenSpace",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenSpace — Illustrated Stationery Real-Time Chat",
    description:
      "A modern real-time chat application inspired by colored-pencil illustrations and fine stationery.",
    creator: "@AnujAcharjee",
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
        "A modern real-time chat application inspired by colored-pencil illustrations and fine stationery.",
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

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-WWWM1EDZP1"
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "GTM-KZ76N2NB"

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
        fontSans.variable,
        fontDisplay.variable,
        fontMono.variable,
        "font-sans"
      )}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Google Tag Manager */}
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
          }}
        />
        {/* Google Analytics (gtag.js) */}
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}', {
                page_path: window.location.pathname,
              });
            `,
          }}
        />
      </head>
      <body className="flex min-h-screen items-center justify-center bg-paper text-ink selection:bg-[var(--pencil-teal-soft)] selection:text-ink">
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
