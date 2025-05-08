import type { Metadata, Viewport } from "next"

export const metadata: Metadata = {
  title: "Crypto Trading Bot",
  description: "Automated cryptocurrency trading with real-time market data and signals",
  keywords: "crypto, trading, bitcoin, ethereum, dashboard, automated trading",
  authors: [{ name: "Your Name" }],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" }
  ]
} 