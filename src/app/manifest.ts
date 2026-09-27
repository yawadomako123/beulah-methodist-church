import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Beulah Methodist Church",
    short_name: "Beulah MCG",
    description: "Church management for Beulah Methodist Church – members, classes, attendance, giving and events.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    orientation: "any",
    background_color: "#f8fafc",
    theme_color: "#1f1766",
    categories: ["productivity", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Members", url: "/members", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Events & attendance", short_name: "Events", url: "/events", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Giving", url: "/giving", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "My profile", url: "/me", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
