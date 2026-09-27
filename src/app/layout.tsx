import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/pwa";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif-display" });

export const metadata: Metadata = {
  title: { default: "Beulah Methodist Church", template: "%s · Beulah Methodist Church" },
  description: "Church management system for Beulah Methodist Church",
  applicationName: "Beulah Methodist Church",
  appleWebApp: { capable: true, title: "Beulah MCG", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1f1766",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable}`}>
      <body className="min-h-dvh font-sans">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
