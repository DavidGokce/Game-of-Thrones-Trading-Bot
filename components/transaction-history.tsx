"use client"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Transaction } from "@/lib/types"

interface TransactionHistoryProps {
  transactions: Transaction[]
  onNewTransaction?: (transaction: Transaction) => void
}

export function TransactionHistory({ transactions, onNewTransaction }: TransactionHistoryProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left">
            <th className="pb-2 font-medium text-muted-foreground">Type</th>
            <th className="pb-2 font-medium text-muted-foreground">Asset</th>
            <th className="pb-2 font-medium text-muted-foreground">Amount</th>
            <th className="pb-2 font-medium text-muted-foreground">Price</th>
            <th className="pb-2 font-medium text-muted-foreground">Total</th>
            <th className="pb-2 font-medium text-muted-foreground">Status</th>
            <th className="pb-2 font-medium text-muted-foreground">Date</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} className="border-b last:border-0">
              <td className="py-3">
                <div className="flex items-center gap-1">
                  {tx.type === "buy" ? (
                    <ArrowDownRight className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-red-500" />
                  )}
                  <span
                    className={
                      tx.type === "buy" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    }
                  >
                    {tx.type === "buy" ? "Buy" : "Sell"}
                  </span>
                </div>
              </td>
              <td className="py-3 font-medium">{tx.asset}</td>
              <td className="py-3">
                {tx.amount} {tx.symbol}
              </td>
              <td className="py-3">${tx.price.toLocaleString()}</td>
              <td className="py-3">${tx.total.toLocaleString()}</td>
              <td className="py-3">
                <Badge
                  variant={tx.status === "completed" ? "outline" : tx.status === "failed" ? "destructive" : "secondary"}
                  className={
                    tx.status === "completed"
                      ? "bg-green-50 text-green-600 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800"
                      : ""
                  }
                >
                  {tx.status === "completed" ? "Completed" : tx.status === "pending" ? "Pending" : "Failed"}
                </Badge>
              </td>
              <td className="py-3 text-muted-foreground">{formatDate(tx.date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
