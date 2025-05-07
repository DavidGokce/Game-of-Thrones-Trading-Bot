"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon } from "lucide-react"
import type { TransformedAsset } from "@/lib/api-types"

interface OrderPanelProps {
  asset: TransformedAsset
  usePaperTrading?: boolean
}

export function OrderPanel({ asset, usePaperTrading = true }: OrderPanelProps) {
  const [orderType, setOrderType] = useState("market")
  const [amount, setAmount] = useState("0")
  const [total, setTotal] = useState("0")
  const [sliderValue, setSliderValue] = useState([0])
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null)

  // Update calculations when asset changes
  useEffect(() => {
    handleAmountChange(amount)
  }, [asset])

  const handleAmountChange = (value: string) => {
    setAmount(value)
    const numValue = Number.parseFloat(value) || 0
    setTotal((numValue * asset.price).toFixed(2))
    setSliderValue([Math.min((numValue / 10) * 100, 100)])
  }

  const handleTotalChange = (value: string) => {
    setTotal(value)
    const numValue = Number.parseFloat(value) || 0
    setAmount((numValue / asset.price).toFixed(8))
    setSliderValue([Math.min((numValue / (10 * asset.price)) * 100, 100)])
  }

  const handleSliderChange = (value: number[]) => {
    setSliderValue(value)
    const percentage = value[0] / 100
    const newAmount = (percentage * 10).toFixed(8)
    setAmount(newAmount)
    setTotal((Number.parseFloat(newAmount) * asset.price).toFixed(2))
  }

  const handleOrder = (type: "buy" | "sell") => {
    // In a real implementation, this would connect to Binance API
    // For now, we'll just show a success message

    const orderDetails = {
      type,
      asset: asset.name,
      symbol: asset.symbol,
      amount: Number.parseFloat(amount),
      price: asset.price,
      total: Number.parseFloat(total),
      orderType,
    }

    console.log("Order placed:", orderDetails)

    // Show success message
    setOrderSuccess(
      `${type === "buy" ? "Bought" : "Sold"} ${amount} ${asset.symbol} at $${asset.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    )

    // Reset form
    setTimeout(() => {
      setAmount("0")
      setTotal("0")
      setSliderValue([0])
      setOrderSuccess(null)
    }, 3000)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Place Order</CardTitle>
        <CardDescription>Buy or sell {asset.symbol}</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        {usePaperTrading && (
          <Alert className="mb-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <InfoIcon className="h-4 w-4 text-blue-500 dark:text-blue-400" />
            <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
              Paper trading mode is active. No real orders will be executed.
            </AlertDescription>
          </Alert>
        )}

        {orderSuccess && (
          <Alert className="mb-4 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <InfoIcon className="h-4 w-4 text-green-500 dark:text-green-400" />
            <AlertDescription className="text-green-700 dark:text-green-300 text-sm">{orderSuccess}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="buy" className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="buy" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
              Buy
            </TabsTrigger>
            <TabsTrigger value="sell" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
              Sell
            </TabsTrigger>
          </TabsList>
          <TabsContent value="buy" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="order-type">Order Type</Label>
                <div className="flex items-center border rounded-md overflow-hidden">
                  <Button
                    type="button"
                    variant={orderType === "market" ? "default" : "ghost"}
                    onClick={() => setOrderType("market")}
                    className="h-8 rounded-none px-3 text-xs"
                  >
                    Market
                  </Button>
                  <Button
                    type="button"
                    variant={orderType === "limit" ? "default" : "ghost"}
                    onClick={() => setOrderType("limit")}
                    className="h-8 rounded-none px-3 text-xs"
                  >
                    Limit
                  </Button>
                </div>
              </div>

              {orderType === "limit" && (
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <div className="relative">
                    <Input
                      id="price"
                      type="number"
                      placeholder="0.00"
                      value={asset.price.toString()}
                      className="pl-7"
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                      <span className="text-sm text-muted-foreground">$</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="pr-16"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-sm font-medium">{asset.symbol}</span>
                  </div>
                </div>
              </div>

              <div className="py-2">
                <Slider value={sliderValue} max={100} step={1} onValueChange={handleSliderChange} className="my-4" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="total">Total</Label>
                <div className="relative">
                  <Input
                    id="total"
                    type="number"
                    placeholder="0.00"
                    value={total}
                    onChange={(e) => handleTotalChange(e.target.value)}
                    className="pl-7"
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                    <span className="text-sm text-muted-foreground">$</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="sell" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="order-type">Order Type</Label>
                <div className="flex items-center border rounded-md overflow-hidden">
                  <Button
                    type="button"
                    variant={orderType === "market" ? "default" : "ghost"}
                    onClick={() => setOrderType("market")}
                    className="h-8 rounded-none px-3 text-xs"
                  >
                    Market
                  </Button>
                  <Button
                    type="button"
                    variant={orderType === "limit" ? "default" : "ghost"}
                    onClick={() => setOrderType("limit")}
                    className="h-8 rounded-none px-3 text-xs"
                  >
                    Limit
                  </Button>
                </div>
              </div>

              {orderType === "limit" && (
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <div className="relative">
                    <Input
                      id="price"
                      type="number"
                      placeholder="0.00"
                      value={asset.price.toString()}
                      className="pl-7"
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                      <span className="text-sm text-muted-foreground">$</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="pr-16"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-sm font-medium">{asset.symbol}</span>
                  </div>
                </div>
              </div>

              <div className="py-2">
                <Slider value={sliderValue} max={100} step={1} onValueChange={handleSliderChange} className="my-4" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="total">Total</Label>
                <div className="relative">
                  <Input
                    id="total"
                    type="number"
                    placeholder="0.00"
                    value={total}
                    onChange={(e) => handleTotalChange(e.target.value)}
                    className="pl-7"
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                    <span className="text-sm text-muted-foreground">$</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="pt-2">
        <Tabs defaultValue="buy" className="w-full">
          <TabsContent value="buy" className="mt-0">
            <Button
              className="w-full bg-green-500 hover:bg-green-600"
              onClick={() => handleOrder("buy")}
              disabled={Number.parseFloat(amount) <= 0}
            >
              Buy {asset.symbol}
            </Button>
          </TabsContent>
          <TabsContent value="sell" className="mt-0">
            <Button
              className="w-full bg-red-500 hover:bg-red-600"
              onClick={() => handleOrder("sell")}
              disabled={Number.parseFloat(amount) <= 0}
            >
              Sell {asset.symbol}
            </Button>
          </TabsContent>
        </Tabs>
      </CardFooter>
    </Card>
  )
}
