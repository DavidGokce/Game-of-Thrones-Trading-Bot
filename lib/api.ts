import type { Asset, AssetsResponse, AssetHistoryResponse, TransformedAsset, PricePoint, TimeFrame } from "./api-types"

// Format large numbers to human-readable format with B, M, K suffixes
export function formatLargeNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`
  } else if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`
  } else {
    return num.toString()
  }
}

// Transform CoinMarketCap API asset to our application format
export function transformAsset(asset: Asset): TransformedAsset {
  return {
    id: asset.symbol.toLowerCase(),
    rank: asset.cmc_rank,
    name: asset.name,
    symbol: asset.symbol,
    price: asset.quote.USD.price,
    change: asset.quote.USD.percent_change_24h,
    volume: formatLargeNumber(asset.quote.USD.volume_24h),
    marketCap: formatLargeNumber(asset.quote.USD.market_cap),
    supply: formatLargeNumber(asset.circulating_supply),
    maxSupply: asset.max_supply ? formatLargeNumber(asset.max_supply) : null,
  }
}

// Fetch top assets using our API proxy
export async function fetchTopAssets(limit = 10): Promise<TransformedAsset[]> {
  try {
    // Use our internal API route instead of directly calling CoinMarketCap
    const response = await fetch(`/api/crypto/assets?limit=${limit}`)

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data: AssetsResponse = await response.json()
    if (!data.data) {
      throw new Error('Invalid response format')
    }
    return data.data.map(transformAsset)
  } catch (error) {
    console.error("Error fetching top assets:", error)
    throw error
  }
}

// Fetch a single asset by ID using our API proxy
export async function fetchAsset(id: string): Promise<TransformedAsset> {
  try {
    const response = await fetch(`/api/crypto/assets/${id}`)

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    if (!data.data) {
      throw new Error('Invalid response format')
    }
    return transformAsset(data.data)
  } catch (error) {
    console.error(`Error fetching asset ${id}:`, error)
    throw error
  }
}

// Map timeframe to interval for history API
function getIntervalFromTimeframe(timeframe: TimeFrame): string {
  switch (timeframe) {
    case "1h":
      return "5m" // 5 minutes
    case "1d":
      return "15m" // 15 minutes
    case "1w":
      return "2h" // 2 hours
    case "1m":
      return "6h" // 6 hours
    case "1y":
      return "1d" // 1 day
    default:
      return "15m"
  }
}

// Get time range based on timeframe
function getTimeRangeFromTimeframe(timeframe: TimeFrame): { start: number; end: number } {
  const end = Date.now()
  let start: number

  switch (timeframe) {
    case "1h":
      start = end - 60 * 60 * 1000 // 1 hour ago
      break
    case "1d":
      start = end - 24 * 60 * 60 * 1000 // 1 day ago
      break
    case "1w":
      start = end - 7 * 24 * 60 * 60 * 1000 // 1 week ago
      break
    case "1m":
      start = end - 30 * 24 * 60 * 60 * 1000 // 30 days ago
      break
    case "1y":
      start = end - 365 * 24 * 60 * 60 * 1000 // 1 year ago
      break
    default:
      start = end - 24 * 60 * 60 * 1000 // Default to 1 day
  }

  return { start, end }
}

// Update the fetchAssetHistory function to handle CoinMarketCap's OHLCV data
export async function fetchAssetHistory(id: string, timeframe: TimeFrame): Promise<PricePoint[]> {
  try {
    const interval = getIntervalFromTimeframe(timeframe)
    const { start, end } = getTimeRangeFromTimeframe(timeframe)

    const response = await fetch(`/api/crypto/assets/${id}/history?interval=${interval}&start=${start}&end=${end}`)

    if (!response.ok) {
      console.error(`API returned status: ${response.status}`)
      throw new Error(`API error: ${response.status}`)
    }

    const data: AssetHistoryResponse = await response.json()

    // Validate the data structure
    if (!data.data || !data.data[id.toUpperCase()] || !data.data[id.toUpperCase()].quotes) {
      console.error("Invalid data structure:", data)
      throw new Error("Invalid data structure in response")
    }

    // Transform CoinMarketCap OHLCV data to our price points format
    return data.data[id.toUpperCase()].quotes.map((quote) => ({
      price: quote.quote.USD.close,
      time: new Date(quote.timestamp).getTime(),
    }))
  } catch (error) {
    console.error(`Error fetching history for ${id}:`, error)
    return [] // Return empty array to trigger the error state in the UI
  }
}
