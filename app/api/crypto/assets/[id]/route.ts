import { NextResponse } from "next/server"
import { MOCK_ASSETS } from "@/lib/constants"

const CMC_API_KEY = 'f7cdd94d-5862-4910-b8ea-f8a5917f31d5'
const CMC_API_URL = 'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest'

// API route to get a single asset by ID
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = params.id.toUpperCase() // CMC uses uppercase symbols

  try {
    const response = await fetch(
      `${CMC_API_URL}?symbol=${id}&convert=USD`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': CMC_API_KEY,
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`CoinMarketCap API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching asset:', error)
    return NextResponse.json(
      { error: 'Failed to fetch asset' },
      { status: 500 }
    )
  }
}
