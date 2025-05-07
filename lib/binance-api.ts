import type { TransformedAsset, PricePoint, TimeFrame } from "./api-types"

// Interface for Binance API responses
interface BinanceKline {
  openTime: number
  open: string
  high: string
  low: string
  close: string
  volume: string
  closeTime: number
  quoteAssetVolume: string
  trades: number
  takerBuyBaseAssetVolume: string
  takerBuyQuoteAssetVolume: string
  ignored: string
}

interface BinanceTickerPrice {
  symbol: string
  price: string
}

interface BinanceTickerStats {
  symbol: string
  priceChange: string
  priceChangePercent: string
  weightedAvgPrice: string
  prevClosePrice: string
  lastPrice: string
  lastQty: string
  bidPrice: string
  bidQty: string
  askPrice: string
  askQty: string
  openPrice: string
  highPrice: string
  lowPrice: string
  volume: string
  quoteVolume: string
  openTime: number
  closeTime: number
  firstId: number
  lastId: number
  count: number
}

// Map crypto symbols to Binance trading pairs
const symbolToBinancePair: Record<string, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
  ADA: "ADAUSDT",
  DOT: "DOTUSDT",
  XRP: "XRPUSDT",
  DOGE: "DOGEUSDT",
  AVAX: "AVAXUSDT",
  LINK: "LINKUSDT",
  MATIC: "MATICUSDT",
}

// Map timeframes to Binance intervals
const timeframeToInterval: Record<TimeFrame, string> = {
  "1h": "5m",
  "1d": "15m",
  "1w": "2h",
  "1m": "6h",
  "1y": "1d",
}

// Function to check if we should use paper trading
export function usePaperTrading(): boolean {
  // Check for environment variable or localStorage setting
  // Default to true (paper trading) if not specified
  if (typeof window !== "undefined") {
    const setting = localStorage.getItem("usePaperTrading")
    return setting === null ? true : setting === "true"
  }
  return true
}

// Toggle paper trading mode
export function togglePaperTrading(enable: boolean): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("usePaperTrading", enable.toString())
  }
}

// Function to fetch historical data from Binance
export async function fetchBinanceHistory(
  assetId: string,
  timeframe: TimeFrame,
  usePaper = true,
): Promise<PricePoint[]> {
  // If paper trading is enabled, use mock data
  if (usePaper) {
    return fetchMockHistory(assetId, timeframe)
  }

  try {
    // Convert asset ID to Binance trading pair
    const symbol = assetIdToBinanceSymbol(assetId)
    if (!symbol) {
      throw new Error(`Unsupported asset: ${assetId}`)
    }

    // Get interval and time range
    const interval = timeframeToInterval[timeframe]
    const { startTime, endTime } = getTimeRange(timeframe)

    // Fetch from Binance API
    const response = await fetch(
      `/api/binance/klines?symbol=${symbol}&interval=${interval}&startTime=${startTime}&endTime=${endTime}`,
    )

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`)
    }

    const data = await response.json()

    // Transform Binance klines to our PricePoint format
    return data.map((kline: any) => ({
      price: Number.parseFloat(kline[4]), // Close price
      time: kline[0], // Open time
    }))
  } catch (error) {
    console.error(`Error fetching Binance history for ${assetId}:`, error)
    // Fall back to mock data
    return fetchMockHistory(assetId, timeframe)
  }
}

// Function to fetch top assets from Binance
export async function fetchBinanceAssets(limit = 10, usePaper = true): Promise<TransformedAsset[]> {
  // If paper trading is enabled, use mock data
  if (usePaper) {
    return fetchMockAssets(limit)
  }

  try {
    // Fetch ticker prices and 24hr stats from Binance
    const [pricesResponse, statsResponse] = await Promise.all([
      fetch(`/api/binance/ticker/price`),
      fetch(`/api/binance/ticker/24hr`),
    ])

    if (!pricesResponse.ok || !statsResponse.ok) {
      throw new Error(`Binance API error: ${pricesResponse.status} / ${statsResponse.status}`)
    }

    const prices: BinanceTickerPrice[] = await pricesResponse.json()
    const stats: BinanceTickerStats[] = await statsResponse.json()

    // Filter for USDT pairs and map to our format
    const assets = stats
      .filter((stat) => stat.symbol.endsWith("USDT"))
      .map((stat) => {
        const symbol = stat.symbol.replace("USDT", "")
        return {
          id: symbol.toLowerCase(),
          rank: 0, // We'll set this later
          name: getFullName(symbol),
          symbol,
          price: Number.parseFloat(stat.lastPrice),
          change: Number.parseFloat(stat.priceChangePercent),
          volume: formatLargeNumber(Number.parseFloat(stat.volume)),
          marketCap: "N/A", // Binance doesn't provide market cap
          supply: "N/A", // Binance doesn't provide supply
          maxSupply: null,
        }
      })
      .sort(
        (a, b) => Number.parseFloat(b.volume.replace(/[BMK]/g, "")) - Number.parseFloat(a.volume.replace(/[BMK]/g, "")),
      )
      .slice(0, limit)

    // Set rank based on volume
    assets.forEach((asset, index) => {
      asset.rank = index + 1
    })

    return assets
  } catch (error) {
    console.error("Error fetching Binance assets:", error)
    // Fall back to mock data
    return fetchMockAssets(limit)
  }
}

// Helper function to convert asset ID to Binance symbol
function assetIdToBinanceSymbol(assetId: string): string | null {
  const symbol = assetId.toUpperCase()
  return symbolToBinancePair[symbol] || null
}

// Helper function to get time range for historical data
function getTimeRange(timeframe: TimeFrame): { startTime: number; endTime: number } {
  const endTime = Date.now()
  let startTime: number

  switch (timeframe) {
    case "1h":
      startTime = endTime - 60 * 60 * 1000 // 1 hour ago
      break
    case "1d":
      startTime = endTime - 24 * 60 * 60 * 1000 // 1 day ago
      break
    case "1w":
      startTime = endTime - 7 * 24 * 60 * 60 * 1000 // 1 week ago
      break
    case "1m":
      startTime = endTime - 30 * 24 * 60 * 60 * 1000 // 30 days ago
      break
    case "1y":
      startTime = endTime - 365 * 24 * 60 * 60 * 1000 // 1 year ago
      break
    default:
      startTime = endTime - 24 * 60 * 60 * 1000 // Default to 1 day
  }

  return { startTime, endTime }
}

// Helper function to get full name from symbol
function getFullName(symbol: string): string {
  const names: Record<string, string> = {
    BTC: "Bitcoin",
    ETH: "Ethereum",
    SOL: "Solana",
    ADA: "Cardano",
    DOT: "Polkadot",
    XRP: "XRP",
    DOGE: "Dogecoin",
    AVAX: "Avalanche",
    LINK: "Chainlink",
    MATIC: "Polygon",
    BNB: "Binance Coin",
    USDT: "Tether",
    USDC: "USD Coin",
    BUSD: "Binance USD",
    DAI: "Dai",
    UNI: "Uniswap",
    AAVE: "Aave",
    ATOM: "Cosmos",
    LTC: "Litecoin",
    BCH: "Bitcoin Cash",
  }

  return names[symbol] || symbol
}

// Helper function to format large numbers
function formatLargeNumber(num: number): string {
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

// Mock data functions
async function fetchMockHistory(assetId: string, timeframe: TimeFrame): Promise<PricePoint[]> {
  // Generate mock price data
  const mockData: PricePoint[] = []
  const now = Date.now()

  // Get base price from common crypto prices
  const basePrices: Record<string, number> = {
    bitcoin: 68000,
    ethereum: 3500,
    solana: 140,
    cardano: 0.58,
    polkadot: 7.8,
    ripple: 0.62,
    dogecoin: 0.13,
    avalanche: 34,
    chainlink: 16,
    polygon: 0.8,
  }

  const basePrice = basePrices[assetId] || 100
  let points = 50

  // Adjust number of points based on timeframe
  switch (timeframe) {
    case "1h":
      points = 60
      break
    case "1d":
      points = 96
      break
    case "1w":
      points = 84
      break
    case "1m":
      points = 120
      break
    case "1y":
      points = 365
      break
  }

  // Generate random walk with slight trend
  let price = basePrice
  const volatility = basePrice * 0.05 // 5% volatility
  const trend = (Math.random() - 0.5) * 0.001 // Small random trend

  for (let i = 0; i < points; i++) {
    const timePoint = getTimeForPoint(now, i, points, timeframe)
    const change = (Math.random() - 0.5) * volatility + trend * basePrice
    price += change
    if (price <= 0) price = basePrice * 0.01 // Prevent negative prices

    mockData.push({
      price,
      time: timePoint,
    })
  }

  return mockData
}

// Helper to get time for each data point
function getTimeForPoint(now: number, index: number, totalPoints: number, timeframe: TimeFrame): number {
  let totalDuration: number

  switch (timeframe) {
    case "1h":
      totalDuration = 60 * 60 * 1000
      break
    case "1d":
      totalDuration = 24 * 60 * 60 * 1000
      break
    case "1w":
      totalDuration = 7 * 24 * 60 * 60 * 1000
      break
    case "1m":
      totalDuration = 30 * 24 * 60 * 60 * 1000
      break
    case "1y":
      totalDuration = 365 * 24 * 60 * 60 * 1000
      break
    default:
      totalDuration = 24 * 60 * 60 * 1000
  }

  return now - totalDuration + (index * totalDuration) / totalPoints
}

// Mock assets function
async function fetchMockAssets(limit: number): Promise<TransformedAsset[]> {
  // Use predefined mock assets
  const mockAssets = [
    {
      id: "bitcoin",
      rank: 1,
      name: "Bitcoin",
      symbol: "BTC",
      price: 68423.51,
      change: 2.34,
      volume: "25B",
      marketCap: "1.2T",
      supply: "19.5M",
      maxSupply: "21M",
    },
    {
      id: "ethereum",
      rank: 2,
      name: "Ethereum",
      symbol: "ETH",
      price: 3521.78,
      change: 1.56,
      volume: "15B",
      marketCap: "420B",
      supply: "120M",
      maxSupply: null,
    },
    {
      id: "solana",
      rank: 3,
      name: "Solana",
      symbol: "SOL",
      price: 142.65,
      change: -0.87,
      volume: "5B",
      marketCap: "65B",
      supply: "450M",
      maxSupply: null,
    },
    {
      id: "cardano",
      rank: 4,
      name: "Cardano",
      symbol: "ADA",
      price: 0.58,
      change: 0.23,
      volume: "800M",
      marketCap: "21B",
      supply: "36B",
      maxSupply: "45B",
    },
    {
      id: "polkadot",
      rank: 5,
      name: "Polkadot",
      symbol: "DOT",
      price: 7.82,
      change: -1.42,
      volume: "600M",
      marketCap: "9.5B",
      supply: "1.2B",
      maxSupply: null,
    },
    {
      id: "ripple",
      rank: 6,
      name: "XRP",
      symbol: "XRP",
      price: 0.62,
      change: 0.85,
      volume: "1.2B",
      marketCap: "28B",
      supply: "45B",
      maxSupply: "100B",
    },
    {
      id: "dogecoin",
      rank: 7,
      name: "Dogecoin",
      symbol: "DOGE",
      price: 0.13,
      change: 3.45,
      volume: "900M",
      marketCap: "18B",
      supply: "140B",
      maxSupply: null,
    },
    {
      id: "avalanche",
      rank: 8,
      name: "Avalanche",
      symbol: "AVAX",
      price: 34.25,
      change: 1.23,
      volume: "700M",
      marketCap: "12B",
      supply: "350M",
      maxSupply: "720M",
    },
    {
      id: "chainlink",
      rank: 9,
      name: "Chainlink",
      symbol: "LINK",
      price: 16.35,
      change: 2.78,
      volume: "500M",
      marketCap: "8.5B",
      supply: "520M",
      maxSupply: "1B",
    },
    {
      id: "polygon",
      rank: 10,
      name: "Polygon",
      symbol: "MATIC",
      price: 0.8,
      change: -0.65,
      volume: "450M",
      marketCap: "7.2B",
      supply: "9B",
      maxSupply: "10B",
    },
  ]

  // Add some randomness to prices and changes
  return mockAssets.slice(0, limit).map((asset) => ({
    ...asset,
    price: asset.price * (1 + (Math.random() - 0.5) * 0.02), // ±1% random variation
    change: asset.change + (Math.random() - 0.5) * 1, // ±0.5% random variation
  }))
}
