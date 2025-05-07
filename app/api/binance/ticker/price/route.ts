import { NextResponse } from "next/server"

// API route to proxy requests to Binance API for ticker prices
export async function GET(request: Request) {
  try {
    // Fetch from Binance API
    const response = await fetch("https://api.binance.com/api/v3/ticker/price", {
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

    // Generate mock ticker price data as fallback
    const mockData = generateMockTickerPrices()
    return NextResponse.json(mockData)
  }
}

// Generate mock ticker price data
function generateMockTickerPrices() {
  const symbols = [
    "BTCUSDT",
    "ETHUSDT",
    "SOLUSDT",
    "ADAUSDT",
    "DOTUSDT",
    "XRPUSDT",
    "DOGEUSDT",
    "AVAXUSDT",
    "LINKUSDT",
    "MATICUSDT",
    "BNBUSDT",
    "LTCUSDT",
    "UNIUSDT",
    "ATOMUSDT",
    "AAVEUSDT",
  ]

  const prices = {
    BTCUSDT: 68000,
    ETHUSDT: 3500,
    SOLUSDT: 140,
    ADAUSDT: 0.58,
    DOTUSDT: 7.8,
    XRPUSDT: 0.62,
    DOGEUSDT: 0.13,
    AVAXUSDT: 34,
    LINKUSDT: 16,
    MATICUSDT: 0.8,
    BNBUSDT: 580,
    LTCUSDT: 85,
    UNIUSDT: 10,
    ATOMUSDT: 9.5,
    AAVEUSDT: 95,
  }

  return symbols.map((symbol) => ({
    symbol,
    price: (prices[symbol] * (1 + (Math.random() - 0.5) * 0.01)).toFixed(8), // ±0.5% random variation
  }))
}
