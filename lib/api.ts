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

// Transform API asset to our application format
export function transformAsset(asset: Asset): TransformedAsset {
  return {
    id: asset.id,
    rank: Number.parseInt(asset.rank),
    name: asset.name,
    symbol: asset.symbol,
    price: Number.parseFloat(asset.priceUsd),
    change: Number.parseFloat(asset.changePercent24Hr),
    volume: formatLargeNumber(Number.parseFloat(asset.volumeUsd24Hr)),
    marketCap: formatLargeNumber(Number.parseFloat(asset.marketCapUsd)),
    supply: formatLargeNumber(Number.parseFloat(asset.supply)),
    maxSupply: asset.maxSupply ? formatLargeNumber(Number.parseFloat(asset.maxSupply)) : null,
  }
}

// Fetch top assets using our API proxy
export async function fetchTopAssets(limit = 10): Promise<TransformedAsset[]> {
  try {
    // Use our internal API route instead of directly calling CoinCap
    const response = await fetch(`/api/crypto/assets?limit=${limit}`)

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data: AssetsResponse = await response.json()
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
      return "m5" // 5 minutes
    case "1d":
      return "m15" // 15 minutes
    case "1w":
      return "h2" // 2 hours
    case "1m":
      return "h6" // 6 hours
    case "1y":
      return "d1" // 1 day
    default:
      return "m15"
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

// Update the fetchAssetHistory function to handle errors better
export async function fetchAssetHistory(id: string, timeframe: TimeFrame): Promise<PricePoint[]> {
  try {
    const interval = getIntervalFromTimeframe(timeframe)
    const { start, end } = getTimeRangeFromTimeframe(timeframe)

    const response = await fetch(`/api/crypto/assets/${id}/history?interval=${interval}&start=${start}&end=${end}`)

    if (!response.ok) {
      console.error(`API returned status: ${response.status}`)
      throw new Error(`API error: ${response.status}`)
    }

    // Get the response text first to log it in case of parsing errors
    const responseText = await response.text()

    // Try to parse the JSON
    let data: AssetHistoryResponse
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error("JSON parse error:", parseError)
      console.error("Response text:", responseText.substring(0, 200)) // Log first 200 chars
      throw new Error("Failed to parse JSON response")
    }

    // Validate the data structure
    if (!data || !Array.isArray(data.data)) {
      console.error("Invalid data structure:", data)
      throw new Error("Invalid data structure in response")
    }

    return data.data.map((point) => ({
      price: Number.parseFloat(point.priceUsd),
      time: point.time,
    }))
  } catch (error) {
    console.error(`Error fetching history for ${id}:`, error)

    // Return empty array or mock data as fallback
    // For now, returning empty array to trigger the error state in the UI
    return []
  }
}
