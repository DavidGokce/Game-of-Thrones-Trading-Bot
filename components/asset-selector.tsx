"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import type { TransformedAsset } from "@/lib/api-types"

interface AssetSelectorProps {
  assets: TransformedAsset[]
  selectedAsset: TransformedAsset
  onSelect: (asset: TransformedAsset) => void
}

export function AssetSelector({ assets, selectedAsset, onSelect }: AssetSelectorProps) {
  const [open, setOpen] = useState(false)

  // Get asset icon color based on symbol
  const getAssetColor = (symbol: string) => {
    const colors: Record<string, string> = {
      BTC: "from-orange-400 to-orange-600",
      ETH: "from-indigo-400 to-indigo-600",
      SOL: "from-purple-400 to-purple-600",
      ADA: "from-blue-400 to-blue-600",
      DOT: "from-pink-400 to-pink-600",
    }

    return colors[symbol] || "from-gray-400 to-gray-600"
  }

  return (
    <div className="flex items-center space-x-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[200px] justify-between font-medium"
          >
            <div className="flex items-center gap-2">
              <div
                className={`h-5 w-5 rounded-full bg-gradient-to-br ${getAssetColor(selectedAsset.symbol)} flex items-center justify-center`}
              >
                <span className="font-bold text-white text-xs">{selectedAsset.symbol.charAt(0)}</span>
              </div>
              {selectedAsset.name}
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="Search assets..." className="h-9" />
            <CommandList>
              <CommandEmpty>No assets found.</CommandEmpty>
              <CommandGroup>
                {assets.map((asset) => (
                  <CommandItem
                    key={asset.id}
                    value={asset.id}
                    onSelect={() => {
                      onSelect(asset)
                      setOpen(false)
                    }}
                    className="flex items-center gap-2"
                  >
                    <div
                      className={`h-5 w-5 rounded-full bg-gradient-to-br ${getAssetColor(asset.symbol)} flex items-center justify-center`}
                    >
                      <span className="font-bold text-white text-xs">{asset.symbol.charAt(0)}</span>
                    </div>
                    {asset.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <div className="flex items-center">
        <h1 className="text-3xl font-bold">
          ${selectedAsset.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </h1>
        <Badge
          variant={selectedAsset.change >= 0 ? "outline" : "destructive"}
          className={`ml-2 ${selectedAsset.change >= 0 ? "text-green-600 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 dark:text-green-400" : ""}`}
        >
          {selectedAsset.change >= 0 ? "+" : ""}
          {selectedAsset.change.toFixed(2)}%
        </Badge>
      </div>
      <div className="text-sm text-muted-foreground">24h Volume: {selectedAsset.volume}</div>
    </div>
  )
}
