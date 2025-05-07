import { NextResponse } from "next/server"

// API route to proxy requests to Binance API for 24hr ticker statistics
export async function GET(request: Request) {
  try {
    // Fetch from Binance API
    const response = await fetch("https://api.binance.com/api/v3/ticker/24hr", {
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

    // Generate mock 24hr ticker data as fallback
    const mockData = generateMock24hrTickers()
    return NextResponse.json(mockData)
  }
}

// Generate mock 24hr ticker data
function generateMock24hrTickers() {
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

  const baseData = {
    BTCUSDT: { price: 68000, volume: 25000, change: 2.34 },
    ETHUSDT: { price: 3500, volume: 15000, change: 1.56 },
    SOLUSDT: { price: 140, volume: 5000, change: -0.87 },
    ADAUSDT: { price: 0.58, volume: 800, change: 0.23 },
    DOTUSDT: { price: 7.8, volume: 600, change: -1.42 },
    XRPUSDT: { price: 0.62, volume: 1200, change: 0.85 },
    DOGEUSDT: { price: 0.13, volume: 900, change: 3.45 },
    AVAXUSDT: { price: 34, volume: 700, change: 1.23 },
    LINKUSDT: { price: 16, volume: 500, change: 2.78 },
    MATICUSDT: { price: 0.8, volume: 450, change: -0.65 },
    BNBUSDT: { price: 580, volume: 3000, change: 1.1 },
    LTCUSDT: { price: 85, volume: 400, change: 0.5 },
    UNIUSDT: { price: 10, volume: 300, change: -0.3 },
    ATOMUSDT: { price: 9.5, volume: 250, change: 1.8 },
    AAVEUSDT: { price: 95, volume: 200, change: -0.9 },
  }

  return symbols.map((symbol) => {
    const base = baseData[symbol]
    const price = base.price * (1 + (Math.random() - 0.5) * 0.01) // ±0.5% random variation

    return {
      symbol,
      priceChange: (price - base.price).toFixed(8),
      priceChangePercent: base.change.toFixed(2),
      weightedAvgPrice: (price * 0.99).toFixed(8),
      prevClosePrice: (price * 0.998).toFixed(8),
      lastPrice: price.toFixed(8),
      lastQty: (Math.random() * 10).toFixed(8),
      bidPrice: (price * 0.999).toFixed(8),
      bidQty: (Math.random() * 5).toFixed(8),
      askPrice: (price * 1.001).toFixed(8),
      askQty: (Math.random() * 5).toFixed(8),
      openPrice: (price * 0.995).toFixed(8),
      highPrice: (price * 1.01).toFixed(8),
      lowPrice: (price * 0.99).toFixed(8),
      volume: (base.volume * (1 + (Math.random() - 0.5) * 0.1)).toFixed(8),
      quoteVolume: (base.volume * price * (1 + (Math.random() - 0.5) * 0.1)).toFixed(8),
      openTime: Date.now() - 24 * 60 * 60 * 1000,
      closeTime: Date.now(),
      firstId: 1000000,
      lastId: 2000000,
      count: 100000,
    }
  })
}
