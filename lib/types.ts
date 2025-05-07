// Define transaction type
export interface Transaction {
  id: string
  type: "buy" | "sell"
  asset: string
  symbol: string
  amount: number
  price: number
  total: number
  status: "completed" | "pending" | "failed"
  date: string
}

// Add other types as needed
