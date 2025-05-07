import { NextResponse } from "next/server"
import { MOCK_ASSETS } from "@/lib/constants"

// Generate mock history data
function generateMockHistory(basePrice: number, interval: string, start: number, end: number) {
  const points = []
  const now = Date.now()
  let intervalMs: number

  // Convert interval to milliseconds
  switch (interval) {
    case "m5":
      intervalMs = 5 * 60 * 1000
      break
    case "m15":
      intervalMs = 15 * 60 * 1000
      break
    case "m30":
      intervalMs = 30 * 60 * 1000
      break
    case "h1":
      intervalMs = 60 * 60 * 1000
      break
    case "h2":
      intervalMs = 2 * 60 * 60 * 1000
      break
    case "h6":
      intervalMs = 6 * 60 * 60 * 1000
      break
    case "h12":
      intervalMs = 12 * 60 * 60 * 1000
      break
    case "d1":
      intervalMs = 24 * 60 * 60 * 1000
      break
    default:
      intervalMs = 15 * 60 * 1000
  }

  const count = Math.min(500, Math.floor((end - start) / intervalMs))
  const volatility = basePrice * 0.05 // 5% volatility

  let price = basePrice
  for (let i = 0; i < count; i++) {
    const time = start + i * intervalMs
    // Random walk with slight upward bias
    const change = (Math.random() - 0.48) * volatility
    price += change
    if (price <= 0) price = basePrice * 0.01 // Prevent negative prices

    points.push({
      priceUsd: price.toString(),
      time,
      date: new Date(time).toISOString(),
    })
  }

  return points
}

// API route to get asset history
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = params.id
  const { searchParams } = new URL(request.url)
  const interval = searchParams.get("interval") || "m15"
  const start = Number.parseInt(searchParams.get("start") || (Date.now() - 24 * 60 * 60 * 1000).toString())
  const end = Number.parseInt(searchParams.get("end") || Date.now().toString())

  try {
    // Try to fetch from the CoinCap API
    const response = await fetch(
      `https://api.coincap.io/v2/assets/${id}/history?interval=${interval}&start=${start}&end=${end}`,
      {
        headers: {
          Accept: "application/json",
        },
        next: { revalidate: 60 }, // Cache for 60 seconds
      },
    )

    // Check if the response is ok before trying to parse JSON
    if (!response.ok) {
      console.error(`CoinCap API returned status: ${response.status}`)
      throw new Error(`CoinCap API error: ${response.status}`)
    }

    // Check content type to ensure we're getting JSON
    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      console.error(`Expected JSON but got content-type: ${contentType}`)
      throw new Error("Invalid content type from CoinCap API")
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
      throw new Error("Failed to parse JSON response from CoinCap API")
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error(`Error fetching history for ${id} from CoinCap API:`, error)

    // Find the asset in mock data to get its base price
    const mockAsset = MOCK_ASSETS.find((asset) => asset.id === id) || MOCK_ASSETS[0]
    const basePrice = Number.parseFloat(mockAsset.priceUsd)

    // Generate mock history data
    const mockHistory = generateMockHistory(basePrice, interval, start, end)

    return NextResponse.json({
      data: mockHistory,
      timestamp: Date.now(),
    })
  }
}
