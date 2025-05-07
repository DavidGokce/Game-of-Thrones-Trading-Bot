"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { BarChart3, CandlestickChart, LineChart } from "lucide-react"
import { useTheme } from "next-themes"
import type { TransformedAsset, TimeFrame, PricePoint } from "@/lib/api-types"
import { fetchAssetHistory } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"

interface TradingChartProps {
  asset: TransformedAsset
  usePaperTrading?: boolean
}

export function TradingChart({ asset, usePaperTrading = true }: TradingChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [timeframe, setTimeframe] = useState<TimeFrame>("1d")
  const { theme } = useTheme()
  const [chartData, setChartData] = useState<PricePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch historical data when asset or timeframe changes
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchAssetHistory(asset.id, timeframe)

        // Validate the data structure
        if (!Array.isArray(data)) {
          throw new Error('Invalid data format received from API')
        }

        // Check if we got valid data back
        if (data && data.length > 0) {
          // Validate each data point
          const validData = data.every(point => 
            typeof point === 'object' &&
            point !== null &&
            typeof point.price === 'number' &&
            typeof point.time === 'number'
          )

          if (!validData) {
            throw new Error('Invalid data point format received from API')
          }

          setChartData(data)
        } else {
          throw new Error('No data points received from API')
        }
      } catch (err) {
        console.error("Error fetching chart data:", err)
        // Generate mock data as fallback
        const mockData: PricePoint[] = []
        const now = Date.now()
        const basePrice = asset.price
        const points = 50

        for (let i = 0; i < points; i++) {
          const randomChange = (Math.random() - 0.48) * (basePrice * 0.02)
          const price = basePrice * (1 + (i - points / 2) * 0.001) + randomChange
          const time = now - (points - i) * ((24 * 60 * 60 * 1000) / points)

          mockData.push({
            price: Math.max(price, 0.01),
            time,
          })
        }

        setChartData(mockData)
        setError(err instanceof Error ? err.message : 'Error loading chart data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [asset.id, timeframe, asset.price])

  // Draw chart when data changes or theme changes
  useEffect(() => {
    if (!canvasRef.current || chartData.length === 0) return

    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    const canvas = canvasRef.current
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height)

    // Find min and max for scaling
    const prices = chartData.map((point) => point.price)
    const min = Math.min(...prices) * 0.99
    const max = Math.max(...prices) * 1.01
    const range = max - min

    // Check if dark mode is active
    const isDarkMode = document.documentElement.classList.contains("dark")

    // Draw grid
    ctx.strokeStyle = isDarkMode ? "#2d3748" : "#f1f5f9"
    ctx.lineWidth = 1

    // Horizontal grid lines
    const gridLines = 5
    for (let i = 0; i <= gridLines; i++) {
      const y = rect.height - (i / gridLines) * rect.height
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(rect.width, y)
      ctx.stroke()

      // Price labels
      const price = min + (i / gridLines) * range
      ctx.fillStyle = isDarkMode ? "#94a3b8" : "#94a3b8"
      ctx.font = "10px Inter, sans-serif"
      ctx.textAlign = "left"
      ctx.fillText(`$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 5, y - 5)
    }

    // Draw line chart
    const isPositive = chartData[chartData.length - 1].price >= chartData[0].price
    ctx.strokeStyle = isPositive ? "#10b981" : "#ef4444"
    ctx.lineWidth = 2
    ctx.beginPath()

    for (let i = 0; i < chartData.length; i++) {
      const x = (i / (chartData.length - 1)) * rect.width
      const y = rect.height - ((chartData[i].price - min) / range) * rect.height

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }

    ctx.stroke()

    // Add gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, rect.height)
    if (isPositive) {
      gradient.addColorStop(0, isDarkMode ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.2)")
      gradient.addColorStop(1, "rgba(16, 185, 129, 0)")
    } else {
      gradient.addColorStop(0, isDarkMode ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.2)")
      gradient.addColorStop(1, "rgba(239, 68, 68, 0)")
    }

    ctx.fillStyle = gradient
    ctx.lineTo(rect.width, rect.height)
    ctx.lineTo(0, rect.height)
    ctx.closePath()
    ctx.fill()

    // Add time labels
    ctx.fillStyle = isDarkMode ? "#94a3b8" : "#94a3b8"
    ctx.font = "10px Inter, sans-serif"
    ctx.textAlign = "center"

    // Only show a few time labels to avoid overcrowding
    const labelCount = 5
    for (let i = 0; i < labelCount; i++) {
      const index = Math.floor((i / (labelCount - 1)) * (chartData.length - 1))
      const x = (index / (chartData.length - 1)) * rect.width

      const date = new Date(chartData[index].time)
      let label = ""

      switch (timeframe) {
        case "1h":
          label = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          break
        case "1d":
          label = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          break
        case "1w":
          label = date.toLocaleDateString([], { weekday: "short" })
          break
        case "1m":
          label = date.toLocaleDateString([], { month: "short", day: "numeric" })
          break
        case "1y":
          label = date.toLocaleDateString([], { month: "short" })
          break
      }

      ctx.fillText(label, x, rect.height - 5)
    }
  }, [chartData, theme])

  const handleTimeframeChange = (value: string) => {
    setTimeframe(value as TimeFrame)
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Price Chart</CardTitle>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md p-1 bg-muted/30">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <LineChart className="h-4 w-4" />
              <span className="sr-only">Line chart</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <CandlestickChart className="h-4 w-4" />
              <span className="sr-only">Candlestick chart</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <BarChart3 className="h-4 w-4" />
              <span className="sr-only">Bar chart</span>
            </Button>
          </div>
          <Tabs defaultValue="1d" className="w-auto" onValueChange={handleTimeframeChange}>
            <TabsList className="grid grid-cols-5 h-8">
              <TabsTrigger value="1h" className="text-xs px-2">
                1H
              </TabsTrigger>
              <TabsTrigger value="1d" className="text-xs px-2">
                1D
              </TabsTrigger>
              <TabsTrigger value="1w" className="text-xs px-2">
                1W
              </TabsTrigger>
              <TabsTrigger value="1m" className="text-xs px-2">
                1M
              </TabsTrigger>
              <TabsTrigger value="1y" className="text-xs px-2">
                1Y
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative aspect-[3/1] md:aspect-[4/1] w-full">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Skeleton className="h-full w-full" />
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-destructive">{error}</p>
            </div>
          ) : (
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full"></canvas>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
