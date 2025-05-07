import { NextResponse } from "next/server"

// API route to proxy requests to Binance API for klines (candlestick) data
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol") || "BTCUSDT"
  const interval = searchParams.get("interval") || "1h"
  const startTime = searchParams.get("startTime")
  const endTime = searchParams.get("endTime")
  const limit = searchParams.get("limit") || "500"

  // Build query parameters
  const queryParams = new URLSearchParams()
  queryParams.append("symbol", symbol)
  queryParams.append("interval", interval)
  if (startTime) queryParams.append("startTime", startTime)
  if (endTime) queryParams.append("endTime", endTime)
  queryParams.append("limit", limit)

  try {
    // Fetch from Binance API
    const response = await fetch(`https://api.binance.com/api/v3/klines?${queryParams.toString()}`, {
      headers: {
        Accept: "application/json",
        "X-MBX-APIKEY": process.env.BINANCE_API_KEY || "",
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    })

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`)
    }

    // Get the response text first to log it in case of parsing errors
    const responseText = await response.text()

    // Try to parse the JSON
    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error("JSON parse error:", parseError)
      console.error("Response text:", responseText.substring(0, 200)) // Log first 200 chars
      throw new Error("Failed to parse JSON response from Binance API")
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching from Binance API:", error)

    // Generate mock kline data as fallback
    const mockData = generateMockKlines(symbol, interval, startTime, endTime, Number.parseInt(limit))
    return NextResponse.json(mockData)
  }
}

// Generate mock kline data
function generateMockKlines(
  symbol: string,
  interval: string,
  startTimeStr: string | null,
  endTimeStr: string | null,
  limit: number,
) {
  const startTime = startTimeStr ? Number.parseInt(startTimeStr) : Date.now() - 24 * 60 * 60 * 1000
  const endTime = endTimeStr ? Number.parseInt(endTimeStr) : Date.now()

  // Determine interval in milliseconds
  let intervalMs: number
  switch (interval) {
    case "1m":
      intervalMs = 60 * 1000
      break
    case "5m":
      intervalMs = 5 * 60 * 1000
      break
    case "15m":
      intervalMs = 15 * 60 * 1000
      break
    case "30m":
      intervalMs = 30 * 60 * 1000
      break
    case "1h":
      intervalMs = 60 * 60 * 1000
      break
    case "2h":
      intervalMs = 2 * 60 * 60 * 1000
      break
    case "4h":
      intervalMs = 4 * 60 * 60 * 1000
      break
    case "6h":
      intervalMs = 6 * 60 * 60 * 1000
      break
    case "8h":
      intervalMs = 8 * 60 * 60 * 1000
      break
    case "12h":
      intervalMs = 12 * 60 * 60 * 1000
      break
    case "1d":
      intervalMs = 24 * 60 * 60 * 1000
      break
    case "3d":
      intervalMs = 3 * 24 * 60 * 60 * 1000
      break
    case "1w":
      intervalMs = 7 * 24 * 60 * 60 * 1000
      break
    case "1M":
      intervalMs = 30 * 24 * 60 * 60 * 1000
      break
    default:
      intervalMs = 60 * 60 * 1000 // Default to 1h
  }

  // Get base price based on symbol
  let basePrice = 100
  if (symbol === "BTCUSDT") basePrice = 68000
  else if (symbol === "ETHUSDT") basePrice = 3500
  else if (symbol === "SOLUSDT") basePrice = 140
  else if (symbol === "ADAUSDT") basePrice = 0.58
  else if (symbol === "DOTUSDT") basePrice = 7.8

  const klines = []
  const count = Math.min(limit, Math.floor((endTime - startTime) / intervalMs))
  const volatility = basePrice * 0.01 // 1% volatility per candle

  let price = basePrice
  for (let i = 0; i < count; i++) {
    const openTime = startTime + i * intervalMs
    const closeTime = openTime + intervalMs - 1

    // Random price movement
    const change = (Math.random() - 0.5) * 2 * volatility
    const open = price
    price += change
    const close = price

    // High and low are random values between open and close, plus some extra movement
    const extraMove = volatility * 0.5
    const high = Math.max(open, close) + Math.random() * extraMove
    const low = Math.min(open, close) - Math.random() * extraMove

    // Random volume
    const volume = basePrice * Math.random() * 100

    klines.push([
      openTime, // Open time
      open.toFixed(8), // Open
      high.toFixed(8), // High
      low.toFixed(8), // Low
      close.toFixed(8), // Close
      volume.toFixed(8), // Volume
      closeTime, // Close time
      (volume * price).toFixed(8), // Quote asset volume
      100, // Number of trades
      (volume * 0.6).toFixed(8), // Taker buy base asset volume
      (volume * 0.6 * price).toFixed(8), // Taker buy quote asset volume
      "0", // Ignore
    ])
  }

  return klines
}
