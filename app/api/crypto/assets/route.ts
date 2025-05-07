import { NextResponse } from "next/server"
import { MOCK_ASSETS } from "@/lib/constants"

// API route to proxy requests to CoinCap API
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = searchParams.get("limit") || "10"

  try {
    // Try to fetch from the CoinCap API
    const response = await fetch(`https://api.coincap.io/v2/assets?limit=${limit}`, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    })

    if (!response.ok) {
      throw new Error(`CoinCap API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching from CoinCap API:", error)

    // Return mock data as fallback
    return NextResponse.json({
      data: MOCK_ASSETS.slice(0, Number.parseInt(limit)),
      timestamp: Date.now(),
    })
  }
}
