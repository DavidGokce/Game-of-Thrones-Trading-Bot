import { NextResponse } from "next/server"
import { MOCK_ASSETS } from "@/lib/constants"
import { getEnv } from "@/lib/env"

const CMC_API_KEY = getEnv('COINMARKETCAP_API_KEY')
const CMC_API_URL = 'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest'

// Validate cryptocurrency symbol
function validateSymbol(symbol: string): boolean {
  return /^[A-Za-z0-9-]{1,10}$/.test(symbol)
}

// API route to get a single asset by ID
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id.toUpperCase() // CMC uses uppercase symbols

    // Validate input
    if (!validateSymbol(id)) {
      return NextResponse.json(
        { error: 'Invalid symbol format' },
        { status: 400 }
      )
    }

    // Check if API key is configured
    if (!CMC_API_KEY) {
      console.warn('CoinMarketCap API key not configured, using fallback data')
      const mockAsset = MOCK_ASSETS.find(asset => asset.symbol === id)
      if (!mockAsset) {
        return NextResponse.json(
          { error: 'Asset not found' },
          { status: 404 }
        )
      }
      return NextResponse.json({
        data: {
          [id]: mockAsset
        },
        status: {
          timestamp: new Date().toISOString(),
          error_code: 0,
          error_message: null,
          elapsed: 0,
          credit_count: 0
        }
      })
    }

    // Add timeout to prevent hanging
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await fetch(
        `${CMC_API_URL}?symbol=${id}&convert=USD`,
        {
          headers: {
            'X-CMC_PRO_API_KEY': CMC_API_KEY,
            'Accept': 'application/json'
          },
          signal: controller.signal
        }
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`CoinMarketCap API error: ${response.status}`)
      }

      const data = await response.json()
      return NextResponse.json(data)
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout' },
          { status: 504 }
        )
      }
      throw error
    }
  } catch (error: unknown) {
    console.error('Error fetching asset:', error)
    return NextResponse.json(
      { error: 'Failed to fetch asset' },
      { status: 500 }
    )
  }
}
