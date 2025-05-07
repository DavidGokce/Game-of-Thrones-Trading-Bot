"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { TransformedAsset } from "@/lib/api-types"
import { useMemo } from "react"

interface PortfolioSummaryProps {
  assets: TransformedAsset[]
}

export function PortfolioSummary({ assets }: PortfolioSummaryProps) {
  // Generate mock portfolio data based on real assets
  const portfolioItems = useMemo(() => {
    // Take top 3 assets
    const topAssets = assets.slice(0, 3)

    // Create mock portfolio with random amounts
    return topAssets.map((asset, index) => {
      // Mock amounts that decrease with rank
      const mockAmounts = [0.42, 3.21, 28.5]
      const amount = mockAmounts[index] || (Math.random() * 10).toFixed(2)

      // Calculate value based on current price
      const value = amount * asset.price

      // Assign percentages (65%, 25%, 10%)
      const percentages = [65, 25, 10]
      const percentage = percentages[index]

      // Assign colors
      const colors = ["from-orange-400 to-orange-600", "from-indigo-400 to-indigo-600", "from-purple-400 to-purple-600"]

      return {
        id: asset.id,
        name: asset.name,
        symbol: asset.symbol,
        amount,
        value,
        percentage,
        color: colors[index],
      }
    })
  }, [assets])

  const totalValue = useMemo(() => {
    return portfolioItems.reduce((sum, item) => sum + item.value, 0)
  }, [portfolioItems])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Portfolio</CardTitle>
        <CardDescription>Your current holdings</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Total Value</span>
            <span className="text-xl font-bold">
              ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="space-y-3">
            {portfolioItems.map((item) => (
              <div key={item.id} className="space-y-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className={`h-4 w-4 rounded-full bg-gradient-to-br ${item.color}`}></div>
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <span className="text-sm">{item.percentage}%</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {item.amount} {item.symbol}
                  </span>
                  <span>${item.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <Progress value={item.percentage} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
