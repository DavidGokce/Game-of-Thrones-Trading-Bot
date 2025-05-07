// Types for the CoinCap API responses

export interface Asset {
  id: string
  rank: string
  symbol: string
  name: string
  supply: string
  maxSupply: string | null
  marketCapUsd: string
  volumeUsd24Hr: string
  priceUsd: string
  changePercent24Hr: string
  vwap24Hr: string
}

export interface AssetsResponse {
  data: Asset[]
  timestamp: number
}

export interface AssetHistoryPoint {
  priceUsd: string
  time: number
  date: string
}

export interface AssetHistoryResponse {
  data: AssetHistoryPoint[]
  timestamp: number
}

// Transformed types for our application
export interface TransformedAsset {
  id: string
  rank: number
  name: string
  symbol: string
  price: number
  change: number
  volume: string
  marketCap: string
  supply: string
  maxSupply: string | null
}

export interface PricePoint {
  price: number
  time: number
}

// WebSocket message types
export interface WebSocketPriceMessage {
  exchange: string
  base: string
  quote: string
  direction: string
  price: string
  volume: string
  timestamp: number
}

export type TimeFrame = "1h" | "1d" | "1w" | "1m" | "1y"
