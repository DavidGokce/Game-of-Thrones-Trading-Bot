"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { InfoIcon, HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useMemo } from "react"
import type { Transaction } from "@/lib/types"
import { calculateTaxLiability, TaxCategory } from "@/lib/tax-calculator"

interface TaxSummaryProps {
  transactions: Transaction[]
}

export function TaxSummary({ transactions }: TaxSummaryProps) {
  // Calculate tax liability based on transactions
  const taxData = useMemo(() => calculateTaxLiability(transactions), [transactions])

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(amount)
  }

  // Get tax category label and description
  const getTaxCategoryInfo = (category: TaxCategory) => {
    switch (category) {
      case TaxCategory.OCCASIONAL:
        return {
          label: "Occasional Income",
          description: "Taxed at 33% as miscellaneous income",
          rate: "33%",
        }
      case TaxCategory.PROFESSIONAL:
        return {
          label: "Professional Trading",
          description: "Taxed at progressive income tax rates (25-50%)",
          rate: "25-50%",
        }
      case TaxCategory.EXEMPT:
        return {
          label: "Long-term Investment",
          description: "Exempt from tax under 'good father of the family' principle",
          rate: "0%",
        }
      default:
        return {
          label: "Unknown",
          description: "Tax category not determined",
          rate: "?",
        }
    }
  }

  const categoryInfo = getTaxCategoryInfo(taxData.category)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Profit/Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${taxData.totalProfitLoss >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
            >
              {formatCurrency(taxData.totalProfitLoss)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tax Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-lg font-semibold">{categoryInfo.label}</div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{categoryInfo.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="text-sm text-muted-foreground">Rate: {categoryInfo.rate}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxable Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(taxData.taxableAmount)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tax Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(taxData.taxDue)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Tax Breakdown by Asset</CardTitle>
              <CardDescription>Profit/loss and tax calculation per cryptocurrency</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Asset</th>
                  <th className="pb-2 font-medium text-muted-foreground">Realized P/L</th>
                  <th className="pb-2 font-medium text-muted-foreground">Taxable Amount</th>
                  <th className="pb-2 font-medium text-muted-foreground">Tax Due</th>
                  <th className="pb-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {taxData.assetBreakdown.map((item) => (
                  <tr key={item.asset} className="border-b last:border-0">
                    <td className="py-3 font-medium">{item.asset}</td>
                    <td
                      className={`py-3 ${item.profitLoss >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                    >
                      {formatCurrency(item.profitLoss)}
                    </td>
                    <td className="py-3">{formatCurrency(item.taxableAmount)}</td>
                    <td className="py-3">{formatCurrency(item.taxDue)}</td>
                    <td className="py-3">
                      <Badge
                        variant={item.taxDue > 0 ? "destructive" : "outline"}
                        className={
                          item.taxDue === 0
                            ? "bg-green-50 text-green-600 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800"
                            : ""
                        }
                      >
                        {item.taxDue > 0 ? "Tax Due" : "No Tax Due"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Belgian Tax Information</CardTitle>
          <CardDescription>Important information about cryptocurrency taxation in Belgium</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <InfoIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium">Occasional Transactions (33% Tax)</h3>
              <p className="text-sm text-muted-foreground">
                Profits from occasional or speculative cryptocurrency transactions are typically taxed at 33% as
                "miscellaneous income" plus local taxes (approximately 7%), resulting in a total tax rate of around 33%.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <InfoIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium">Professional Trading (25-50% Tax)</h3>
              <p className="text-sm text-muted-foreground">
                If you trade cryptocurrencies as a professional activity, profits are subject to progressive income tax
                rates ranging from 25% to 50%, plus social security contributions.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <InfoIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium">Long-term Investments (Tax Exempt)</h3>
              <p className="text-sm text-muted-foreground">
                Long-term cryptocurrency investments managed as a "good father of the family" (prudent investor) may be
                exempt from tax. This typically applies to buy-and-hold strategies without frequent trading.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <InfoIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium">Disclaimer</h3>
              <p className="text-sm text-muted-foreground">
                This tax calculation is an estimate based on general Belgian tax principles. For accurate tax advice,
                please consult with a qualified tax professional. Tax laws and interpretations may change.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
