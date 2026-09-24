import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OpenSpace",
    short_name: "OpenSpace",
    description:
      "A modern real-time chat application inspired by colored-pencil illustrations and fine stationery.",
    start_url: "/",
    display: "standalone",
    background_color: "#F5EFE6",
    theme_color: "#6D94C5",
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
