import { NextResponse } from "next/server"
import { getEnv } from "@/lib/env"

const CMC_API_KEY = getEnv('COINMARKETCAP_API_KEY')
const CMC_API_URL = 'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/historical'

// API route to get asset history from CoinMarketCap
export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    if (!CMC_API_KEY) {
      throw new Error('CoinMarketCap API key not configured')
    }

    const symbol = context.params.id.toUpperCase()
    const { searchParams } = new URL(request.url)
    const interval = searchParams.get('interval') || '15m'
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (!start || !end) {
      return NextResponse.json(
        { error: 'Missing start or end timestamp' },
        { status: 400 }
      )
    }

    // Convert timestamps to ISO strings
    const startDate = new Date(parseInt(start)).toISOString()
    const endDate = new Date(parseInt(end)).toISOString()

    const response = await fetch(
      `${CMC_API_URL}?symbol=${symbol}&interval=${interval}&time_start=${startDate}&time_end=${endDate}&convert=USD`,
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
    console.error('Error fetching asset history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch asset history' },
      { status: 500 }
    )
  }
}

function generateMockHistoricalData(start: string, end: string, interval: string) {
  const startTime = parseInt(start)
  const endTime = parseInt(end)
  const intervalMs = getIntervalInMs(interval)
  const points = Math.floor((endTime - startTime) / intervalMs)
  
  const basePrice = 50000 // Base price for mock data
  const mockData = []
  
  for (let i = 0; i < points; i++) {
    const timestamp = new Date(startTime + i * intervalMs).toISOString()
    const randomChange = (Math.random() - 0.5) * 100 // Random price change
    
    mockData.push({
      timestamp,
      quote: {
        USD: {
          open: basePrice + randomChange,
          high: basePrice + randomChange + 50,
          low: basePrice + randomChange - 50,
          close: basePrice + randomChange,
          volume: Math.random() * 1000000,
          market_cap: (basePrice + randomChange) * 19000000 // Approximate BTC supply
        }
      }
    })
  }
  
  return mockData
}

function getIntervalInMs(interval: string): number {
  const value = parseInt(interval)
  const unit = interval.slice(-1)
  
  switch (unit) {
    case 'm':
      return value * 60 * 1000
    case 'h':
      return value * 60 * 60 * 1000
    case 'd':
      return value * 24 * 60 * 60 * 1000
    default:
      return 15 * 60 * 1000 // Default to 15 minutes
  }
}
