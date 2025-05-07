import { NextResponse } from "next/server"
import type { AssetsResponse } from "@/lib/api-types"

const CMC_API_KEY = 'f7cdd94d-5862-4910-b8ea-f8a5917f31d5'
const CMC_API_URL = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest'

// API route to proxy requests to CoinMarketCap API
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '10'

    const response = await fetch(`${CMC_API_URL}?limit=${limit}&convert=USD`, {
      headers: {
        'X-CMC_PRO_API_KEY': CMC_API_KEY,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`CoinMarketCap API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching assets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assets' },
      { status: 500 }
    )
  }
}
