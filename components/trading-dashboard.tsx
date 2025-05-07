"use client"

import { useState, useEffect, useCallback } from "react"
import { TradingChart } from "@/components/trading-chart"
import { OrderPanel } from "@/components/order-panel"
import { AssetSelector } from "@/components/asset-selector"
import { PortfolioSummary } from "@/components/portfolio-summary"
import { TaxCalculator } from "@/components/tax-calculator"
import { MarketOverview } from "@/components/market-overview"
import { Header } from "@/components/header"
import { fetchTopAssets } from "@/lib/api"
import { fetchBinanceAssets, usePaperTrading, togglePaperTrading } from "@/lib/binance-api"
import { useWebSocket } from "@/lib/use-websocket"
import type { TransformedAsset, WebSocketPriceMessage } from "@/lib/api-types"
import { Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

// Update the trading dashboard to use Binance API with paper trading option
export default function TradingDashboard() {
  const [assets, setAssets] = useState<TransformedAsset[]>([])
  const [selectedAsset, setSelectedAsset] = useState<TransformedAsset | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usingPaperTrading, setUsingPaperTrading] = useState(usePaperTrading()) // Initialize paper trading state using the hook

  // Function to update asset price from WebSocket
  const updateAssetPrice = useCallback((message: WebSocketPriceMessage) => {
    const assetId = message.base.toLowerCase()
    const newPrice = Number.parseFloat(message.price)

    setAssets((prevAssets) =>
      prevAssets.map((asset) => {
        if (asset.id === assetId) {
          // Calculate change based on previous price
          const change = ((newPrice - asset.price) / asset.price) * 100 + asset.change

          return {
            ...asset,
            price: newPrice,
            change: change,
          }
        }
        return asset
      }),
    )

    // Also update selected asset if it matches
    setSelectedAsset((prevSelected) => {
      if (prevSelected && prevSelected.id === assetId) {
        const change = ((newPrice - prevSelected.price) / prevSelected.price) * 100 + prevSelected.change

        return {
          ...prevSelected,
          price: newPrice,
          change: change,
        }
      }
      return prevSelected
    })
  }, [])

  // Initialize WebSocket connection
  const { mockMode } = useWebSocket({
    onMessage: updateAssetPrice,
    onError: () => {
      console.log("WebSocket connection error. Using paper trading data.")
      setUsingPaperTrading(true)
      togglePaperTrading(true)
    },
  })

  // Fetch initial data
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true)

        // Use Binance API if not in paper trading mode
        const topAssets = usingPaperTrading ? await fetchTopAssets(10) : await fetchBinanceAssets(10, false)

        setAssets(topAssets)
        setSelectedAsset(topAssets[0])
        setError(null)
      } catch (err) {
        setError("Failed to load market data. Using simulated data instead.")
        console.error(err)

        // Fall back to paper trading
        setUsingPaperTrading(true)
        togglePaperTrading(true)

        // Try to load with paper trading
        try {
          const fallbackAssets = await fetchTopAssets(10)
          setAssets(fallbackAssets)
          setSelectedAsset(fallbackAssets[0])
        } catch (fallbackErr) {
          console.error("Even fallback data failed:", fallbackErr)
        }
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [usingPaperTrading])

  // Handle asset selection
  const handleAssetSelect = (asset: TransformedAsset) => {
    setSelectedAsset(asset)
  }

  // Handle paper trading toggle
  const handlePaperTradingToggle = (enabled: boolean) => {
    setUsingPaperTrading(enabled)
    togglePaperTrading(enabled)
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg">Loading market data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !usingPaperTrading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md p-6 text-center">
            <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
            <p className="mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!selectedAsset) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md p-6 text-center">
            <h2 className="text-2xl font-bold mb-4">No assets available</h2>
            <p className="mb-6">Unable to load asset data.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-6 flex-1 flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Switch id="paper-trading" checked={usingPaperTrading} onCheckedChange={handlePaperTradingToggle} />
            <Label htmlFor="paper-trading" className="cursor-pointer">
              Paper Trading Mode
            </Label>
          </div>

          {usingPaperTrading && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 px-4 py-2 rounded-md text-sm">
              Using simulated market data. No real trades will be executed.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <AssetSelector assets={assets} selectedAsset={selectedAsset} onSelect={handleAssetSelect} />
            <TradingChart asset={selectedAsset} usePaperTrading={usingPaperTrading} />
            <MarketOverview assets={assets} />
          </div>
          <div className="space-y-6">
            <OrderPanel asset={selectedAsset} usePaperTrading={usingPaperTrading} />
            <PortfolioSummary assets={assets} />
          </div>
        </div>
        <TaxCalculator />
      </div>
    </div>
  )
}
