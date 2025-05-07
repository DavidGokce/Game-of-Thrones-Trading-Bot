// Types for the CoinMarketCap API responses
export interface Asset {
  id: number
  name: string
  symbol: string
  cmc_rank: number
  circulating_supply: number
  max_supply: number | null
  quote: {
    USD: {
      price: number
      volume_24h: number
      percent_change_24h: number
      market_cap: number
    }
  }
}

export interface AssetsResponse {
  data: Asset[]
  status: {
    timestamp: string
    error_code: number
    error_message: string | null
    elapsed: number
    credit_count: number
  }
}

export interface Quote {
  timestamp: string
  quote: {
    USD: {
      open: number
      high: number
      low: number
      close: number
      volume: number
      market_cap: number
    }
  }
}

export interface AssetHistoryResponse {
  data: {
    [symbol: string]: {
      id: number | string
      name?: string
      symbol: string
      quotes: Quote[]
    }
  }
  status?: {
    timestamp: string
    error_code: number
    error_message: string | null
    elapsed: number
    credit_count: number
  }
}

export interface PricePoint {
  price: number
  time: number
}

export type TimeFrame = "1h" | "1d" | "1w" | "1m" | "1y"

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
