"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TransactionHistory } from "@/components/transaction-history"
import { TaxSummary } from "@/components/tax-summary"
import { useState } from "react"
import type { Transaction } from "@/lib/types"

export function TaxCalculator() {
  // State to track transactions
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "tx1",
      type: "buy",
      asset: "Bitcoin",
      symbol: "BTC",
      amount: 0.05,
      price: 68423.51,
      total: 3421.18,
      status: "completed",
      date: "2023-05-07T10:23:14Z",
    },
    {
      id: "tx2",
      type: "sell",
      asset: "Ethereum",
      symbol: "ETH",
      amount: 1.2,
      price: 3521.78,
      total: 4226.14,
      status: "completed",
      date: "2023-05-06T15:45:22Z",
    },
    {
      id: "tx3",
      type: "buy",
      asset: "Solana",
      symbol: "SOL",
      amount: 10,
      price: 142.65,
      total: 1426.5,
      status: "pending",
      date: "2023-05-07T09:12:05Z",
    },
    {
      id: "tx4",
      type: "buy",
      asset: "Cardano",
      symbol: "ADA",
      amount: 500,
      price: 0.58,
      total: 290.0,
      status: "completed",
      date: "2023-05-05T11:32:45Z",
    },
    {
      id: "tx5",
      type: "sell",
      asset: "Bitcoin",
      symbol: "BTC",
      amount: 0.02,
      price: 69500.0,
      total: 1390.0,
      status: "completed",
      date: "2023-05-08T14:22:30Z",
    },
  ])

  // Function to add a new transaction (will be passed to TransactionHistory)
  const addTransaction = (transaction: Transaction) => {
    setTransactions((prev) => [...prev, transaction])
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Trading Activity</CardTitle>
        <CardDescription>Your transactions and tax information</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="transactions">
          <div className="px-6 pt-2 border-b">
            <TabsList>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="taxes">Tax Calculation</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="transactions" className="m-0">
            <div className="px-6 py-4">
              <TransactionHistory transactions={transactions} onNewTransaction={addTransaction} />
            </div>
          </TabsContent>
          <TabsContent value="taxes" className="m-0">
            <div className="px-6 py-4">
              <TaxSummary transactions={transactions} />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
