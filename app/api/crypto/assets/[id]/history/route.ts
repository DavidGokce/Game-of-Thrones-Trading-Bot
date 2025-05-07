import { NextResponse } from "next/server"

const CMC_API_KEY = process.env.COINMARKETCAP_API_KEY || 'f7cdd94d-5862-4910-b8ea-f8a5917f31d5'
const CMC_API_URL = 'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/historical'

// API route to get asset history from CoinMarketCap
export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
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
      // Return mock data with error status for any API error
      const mockData = generateMockHistoricalData(start, end, interval)
      return NextResponse.json({
        data: {
          [symbol]: {
            id: symbol,
            symbol: symbol,
            quotes: mockData
          }
        },
        status: {
          error_code: response.status,
          error_message: `Using mock data - CoinMarketCap API error: ${response.status}`
        }
      })
    }

    const rawData = await response.json()

    // Transform the data into our expected format
    if (!rawData.data || !rawData.data[symbol]) {
      // Return mock data if no real data is available
      const mockData = generateMockHistoricalData(start, end, interval)
      return NextResponse.json({
        data: {
          [symbol]: {
            id: symbol,
            symbol: symbol,
            quotes: mockData
          }
        },
        status: {
          error_code: 200,
          error_message: 'Using mock data - No data available from API'
        }
      })
    }

    return NextResponse.json(rawData)
  } catch (error) {
    console.error('Error fetching historical data:', error)
    
    // Safely get the parameters even in error case
    let interval = '15m'
    const now = Date.now()
    const end = now.toString()
    const start = (now - 24 * 60 * 60 * 1000).toString() // 24 hours ago
    const symbol = context.params.id.toUpperCase()

    // Generate mock data as fallback
    const mockData = generateMockHistoricalData(start, end, interval)

    return NextResponse.json({
      data: {
        [symbol]: {
          id: symbol,
          symbol: symbol,
          quotes: mockData
        }
      },
      status: {
        error_code: 500,
        error_message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    })
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
