import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Friet Bestellen",
  description: "Verzamel alle bestellingen op één plek",
  icons: {
    icon: "/frietbot.png",
    apple: "/frietbot.png",
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="nl" suppressHydrationWarning className="dark">
      <head>
        <link rel="icon" href="/frietbot.png" />
        <link rel="apple-touch-icon" href="/frietbot.png" />
      </head>
      <body className={inter.className}>
        <ThemeProvider defaultTheme="system" storageKey="friet-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
