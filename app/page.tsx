import type { Metadata } from "next"
import TradingDashboard from "@/components/trading-dashboard"

export const metadata: Metadata = {
  title: "Trading Dashboard",
  description: "A beautiful trading interface with Stripe-inspired design",
}

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
      <TradingDashboard />
    </main>
  )
}
