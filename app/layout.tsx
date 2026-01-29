import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { NotificationProvider } from "@/components/ui/notification-system"
import { TimeBasedThemeProvider } from "@/components/theme/time-based-theme-provider"
import { PWAComponents } from "./pwa-components"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  preload: true,
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
  weight: ["400", "600"],
  preload: true,
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ea580c",
}

export const metadata: Metadata = {
  title: "QCC Electronic Attendance | Quality Control Company Limited",
  description: "Quality Control Company Limited Electronic Attendance System - Intranet Portal",
  manifest: "/manifest.json",
  applicationName: "QCC Attendance",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "QCC Attendance",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/images/qcc-logo.png", sizes: "32x32", type: "image/png" },
      { url: "/images/qcc-logo.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: "/images/qcc-logo.png",
    shortcut: "/favicon.ico",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-config": "/browserconfig.xml",
    "msapplication-TileColor": "#ea580c",
    "msapplication-tap-highlight": "no",
  },
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} antialiased`} suppressHydrationWarning>
      <body className="font-sans" suppressHydrationWarning>
        <TimeBasedThemeProvider>
          <NotificationProvider>{children}</NotificationProvider>
          <PWAComponents />
        </TimeBasedThemeProvider>
      </body>
    </html>
  )
}
