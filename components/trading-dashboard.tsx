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
import type { TransformedAsset } from "@/lib/api-types"
import { Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Position, Transaction } from '../lib/paper-trading'
import { TradingBot } from '../lib/trading-bot'

export default function TradingDashboard() {
  const [assets, setAssets] = useState<TransformedAsset[]>([])
  const [selectedAsset, setSelectedAsset] = useState<TransformedAsset | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [balance, setBalance] = useState<number>(0)
  const [positions, setPositions] = useState<Position[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [symbol, setSymbol] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(0)
  const [botRunning, setBotRunning] = useState(false)
  const [botUpdates, setBotUpdates] = useState<Array<{ symbol: string; action: string; reason: string }>>([])
  const [tradingBot, setTradingBot] = useState<TradingBot | null>(null)

  // Fetch initial data and set up polling for live price updates
  useEffect(() => {
    let interval: NodeJS.Timeout;
    async function loadInitialData() {
      try {
        setLoading(true)
        const topAssets = await fetchTopAssets(10)
        setAssets(topAssets)
        setSelectedAsset(topAssets[0])
        setError(null)
      } catch (err) {
        setError("Failed to load market data. Using simulated data instead.")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadInitialData()
    // Poll for live price updates every 30 seconds
    interval = setInterval(async () => {
      try {
        const updatedAssets = await fetchTopAssets(10)
        setAssets(updatedAssets)
        setSelectedAsset((prev) => {
          if (!prev) return updatedAssets[0]
          const updated = updatedAssets.find(a => a.id === prev.id)
          return updated || updatedAssets[0]
        })
      } catch (err) {
        console.error("Error polling for asset updates:", err)
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  // Handle asset selection
  const handleAssetSelect = (asset: TransformedAsset) => {
    setSelectedAsset(asset)
  }

  useEffect(() => {
    fetchPaperTradingData()
    const interval = setInterval(fetchPaperTradingData, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchPaperTradingData = async () => {
    const response = await fetch('/api/paper-trading')
    const data = await response.json()
    setBalance(data.balance)
    setPositions(data.positions)
    setTransactions(data.transactions)
  }

  const handleTrade = async (action: 'buy' | 'sell') => {
    const response = await fetch('/api/paper-trading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, symbol, quantity }),
    })
    if (response.ok) {
      fetchPaperTradingData()
    }
  }

  // Initialize trading bot with all available assets
  useEffect(() => {
    if (assets.length > 0) {
      const symbols = assets.map(asset => `${asset.symbol}`)
      
      const bot = new TradingBot(symbols, (update) => {
        setBotUpdates(prev => [...prev, update].slice(-10)) // Keep last 10 updates
        fetchPaperTradingData() // Refresh data after trade
      })
      setTradingBot(bot)
      return () => bot.stop()
    }
  }, [assets]) // Re-initialize when assets change

  const toggleBot = async () => {
    if (!tradingBot) return
    
    if (botRunning) {
      tradingBot.stop()
    } else {
      await tradingBot.start()
    }
    setBotRunning(!botRunning)
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

  if (error) {
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <AssetSelector assets={assets} selectedAsset={selectedAsset} onSelect={handleAssetSelect} />
            <TradingChart asset={selectedAsset} />
            <MarketOverview assets={assets} />
          </div>
          <div className="space-y-6">
            <OrderPanel asset={selectedAsset} />
            <PortfolioSummary assets={assets} />
          </div>
        </div>
        <TaxCalculator />
        <Card>
          <CardHeader>
            <CardTitle>Paper Trading Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Balance: ${balance.toFixed(2)}</h3>
            </div>
            <div className="mb-4">
              <Input
                placeholder="Symbol (e.g., BTC)"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="mb-2"
              />
              <Input
                type="number"
                placeholder="Quantity"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="mb-2"
              />
              <div className="flex space-x-2">
                <Button onClick={() => handleTrade('buy')}>Buy</Button>
                <Button onClick={() => handleTrade('sell')}>Sell</Button>
              </div>
            </div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Open Positions</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Entry Price</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>P&L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((position) => (
                    <TableRow key={position.symbol}>
                      <TableCell>{position.symbol}</TableCell>
                      <TableCell>{position.quantity}</TableCell>
                      <TableCell>${position.entryPrice.toFixed(2)}</TableCell>
                      <TableCell>${position.currentPrice.toFixed(2)}</TableCell>
                      <TableCell>${position.pnl.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Transaction History</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction, index) => (
                    <TableRow key={index}>
                      <TableCell>{transaction.symbol}</TableCell>
                      <TableCell>{transaction.type}</TableCell>
                      <TableCell>{transaction.quantity}</TableCell>
                      <TableCell>${transaction.price.toFixed(2)}</TableCell>
                      <TableCell>{new Date(transaction.timestamp).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Automated Trading Bot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex items-center gap-4">
                <Switch
                  id="bot-control"
                  checked={botRunning}
                  onCheckedChange={toggleBot}
                />
                <Label htmlFor="bot-control" className="cursor-pointer">
                  {botRunning ? 'Stop Bot' : 'Start Bot'}
                </Label>
              </div>
              {botRunning && (
                <p className="text-sm text-muted-foreground mt-2">
                  Bot is running and monitoring {tradingBot ? tradingBot.symbols.join(', ') : 'selected'} markets
                </p>
              )}
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Recent Bot Actions</h3>
              <div className="space-y-2">
                {botUpdates.map((update, index) => (
                  <div key={index} className="text-sm">
                    <span className="font-medium">{update.symbol}:</span>{' '}
                    <span className={update.action === 'buy' ? 'text-green-600' : 'text-red-600'}>
                      {update.action.toUpperCase()}
                    </span>
                    {' - '}
                    <span className="text-muted-foreground">{update.reason}</span>
                  </div>
                ))}
                {botUpdates.length === 0 && (
                  <p className="text-sm text-muted-foreground">No recent actions</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
