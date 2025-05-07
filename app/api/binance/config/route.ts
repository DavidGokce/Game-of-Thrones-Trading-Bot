import { NextResponse } from "next/server"
import { isBinanceConfigured } from "@/lib/env"

// API route to check if Binance API is configured
export async function GET(request: Request) {
  return NextResponse.json({
    configured: isBinanceConfigured(),
    paperTradingRecommended: !isBinanceConfigured(),
  })
}
