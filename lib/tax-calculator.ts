import type { Transaction } from "@/lib/types"

// Define tax categories according to Belgian fiscal law
export enum TaxCategory {
  OCCASIONAL = "occasional",
  PROFESSIONAL = "professional",
  EXEMPT = "exempt",
}

// Interface for asset-specific tax breakdown
interface AssetTaxBreakdown {
  asset: string
  profitLoss: number
  taxableAmount: number
  taxDue: number
}

// Interface for overall tax liability
interface TaxLiability {
  totalProfitLoss: number
  category: TaxCategory
  taxableAmount: number
  taxDue: number
  assetBreakdown: AssetTaxBreakdown[]
}

// Calculate cost basis and profit/loss for each asset
function calculateAssetProfitLoss(transactions: Transaction[]): Map<string, number> {
  // Group transactions by asset
  const assetTransactions = new Map<string, Transaction[]>()

  transactions.forEach((tx) => {
    if (tx.status !== "completed") return

    const key = tx.asset
    if (!assetTransactions.has(key)) {
      assetTransactions.set(key, [])
    }
    assetTransactions.get(key)!.push(tx)
  })

  // Calculate profit/loss for each asset using FIFO method
  const assetProfitLoss = new Map<string, number>()

  assetTransactions.forEach((txs, asset) => {
    // Sort transactions by date
    txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const holdings: { amount: number; price: number }[] = []
    let realizedProfitLoss = 0

    // Process each transaction
    txs.forEach((tx) => {
      if (tx.type === "buy") {
        // Add to holdings
        holdings.push({ amount: tx.amount, price: tx.price })
      } else if (tx.type === "sell") {
        // Calculate profit/loss using FIFO
        let remainingToSell = tx.amount

        while (remainingToSell > 0 && holdings.length > 0) {
          const oldestHolding = holdings[0]

          if (oldestHolding.amount <= remainingToSell) {
            // Sell entire holding
            const profitLoss = (tx.price - oldestHolding.price) * oldestHolding.amount
            realizedProfitLoss += profitLoss
            remainingToSell -= oldestHolding.amount
            holdings.shift()
          } else {
            // Sell part of holding
            const profitLoss = (tx.price - oldestHolding.price) * remainingToSell
            realizedProfitLoss += profitLoss
            oldestHolding.amount -= remainingToSell
            remainingToSell = 0
          }
        }
      }
    })

    assetProfitLoss.set(asset, realizedProfitLoss)
  })

  return assetProfitLoss
}

// Determine tax category based on trading patterns
function determineTaxCategory(transactions: Transaction[]): TaxCategory {
  // Count completed transactions
  const completedTransactions = transactions.filter((tx) => tx.status === "completed")

  // Check trading frequency
  const txDates = completedTransactions.map((tx) => new Date(tx.date).getTime())
  const earliestDate = Math.min(...txDates)
  const latestDate = Math.max(...txDates)
  const daysBetween = (latestDate - earliestDate) / (1000 * 60 * 60 * 24)

  // Calculate average transactions per month
  const monthsBetween = Math.max(daysBetween / 30, 1)
  const txPerMonth = completedTransactions.length / monthsBetween

  // Determine category based on Belgian tax principles
  if (txPerMonth >= 10) {
    // High frequency trading is likely professional
    return TaxCategory.PROFESSIONAL
  } else if (txPerMonth >= 2) {
    // Moderate trading is likely occasional/speculative
    return TaxCategory.OCCASIONAL
  } else {
    // Low frequency could be considered long-term investment
    return TaxCategory.EXEMPT
  }
}

// Calculate tax rate based on category
function getTaxRate(category: TaxCategory): number {
  switch (category) {
    case TaxCategory.OCCASIONAL:
      return 0.33 // 33% for occasional/speculative transactions
    case TaxCategory.PROFESSIONAL:
      return 0.4 // Using 40% as an average for professional trading
    case TaxCategory.EXEMPT:
      return 0 // 0% for exempt long-term investments
    default:
      return 0.33 // Default to occasional rate
  }
}

// Main function to calculate tax liability
export function calculateTaxLiability(transactions: Transaction[]): TaxLiability {
  // Only consider completed transactions
  const completedTransactions = transactions.filter((tx) => tx.status === "completed")

  // Calculate profit/loss for each asset
  const assetProfitLoss = calculateAssetProfitLoss(completedTransactions)

  // Determine tax category
  const category = determineTaxCategory(completedTransactions)

  // Calculate tax rate
  const taxRate = getTaxRate(category)

  // Calculate total profit/loss
  let totalProfitLoss = 0
  assetProfitLoss.forEach((profitLoss) => {
    totalProfitLoss += profitLoss
  })

  // Calculate taxable amount (only positive profit is taxable)
  const taxableAmount = Math.max(0, totalProfitLoss)

  // Calculate tax due
  const taxDue = taxableAmount * taxRate

  // Create asset breakdown
  const assetBreakdown: AssetTaxBreakdown[] = []
  assetProfitLoss.forEach((profitLoss, asset) => {
    const assetTaxableAmount = Math.max(0, profitLoss)
    const assetTaxDue = assetTaxableAmount * taxRate

    assetBreakdown.push({
      asset,
      profitLoss,
      taxableAmount: assetTaxableAmount,
      taxDue: assetTaxDue,
    })
  })

  // Sort breakdown by profit/loss (highest first)
  assetBreakdown.sort((a, b) => b.profitLoss - a.profitLoss)

  return {
    totalProfitLoss,
    category,
    taxableAmount,
    taxDue,
    assetBreakdown,
  }
}
