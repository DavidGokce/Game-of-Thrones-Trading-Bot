"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingDown, TrendingUp } from "lucide-react"
import type { TransformedAsset } from "@/lib/api-types"

interface MarketOverviewProps {
  assets: TransformedAsset[]
}

export function MarketOverview({ assets }: MarketOverviewProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Market Overview</CardTitle>
        <CardDescription>Top trading assets</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium text-muted-foreground">Asset</th>
                <th className="pb-2 font-medium text-muted-foreground">Price</th>
                <th className="pb-2 font-medium text-muted-foreground">24h Change</th>
                <th className="pb-2 font-medium text-muted-foreground">24h Volume</th>
                <th className="pb-2 font-medium text-muted-foreground">Market Cap</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id} className="border-b last:border-0">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                        <span className="font-bold text-white text-xs">{asset.symbol.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="font-medium">{asset.name}</div>
                        <div className="text-xs text-muted-foreground">{asset.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 font-medium">
                    ${asset.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1">
                      {asset.change >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span
                        className={
                          asset.change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        }
                      >
                        {asset.change >= 0 ? "+" : ""}
                        {asset.change.toFixed(2)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3">{asset.volume}</td>
                  <td className="py-3">{asset.marketCap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
