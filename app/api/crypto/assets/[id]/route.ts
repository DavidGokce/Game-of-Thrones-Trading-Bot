import { NextResponse } from "next/server"
import { MOCK_ASSETS } from "@/lib/constants"

// API route to get a single asset by ID
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = params.id

  try {
    // Try to fetch from the CoinCap API
    const response = await fetch(`https://api.coincap.io/v2/assets/${id}`, {
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
    console.error(`Error fetching asset ${id} from CoinCap API:`, error)

    // Return mock data as fallback
    const mockAsset = MOCK_ASSETS.find((asset) => asset.id === id) || MOCK_ASSETS[0]
    return NextResponse.json({
      data: mockAsset,
      timestamp: Date.now(),
    })
  }
}
