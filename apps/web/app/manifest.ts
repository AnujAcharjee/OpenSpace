import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OpenSpace",
    short_name: "OpenSpace",
    description:
      "A real-time social platform to discover channels, join conversations, and connect with people worldwide.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#d4af37",
    icons: [
      {
        src: "/logo/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/logo/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/logo/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  }
}
