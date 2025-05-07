import { fetchAsset } from './api';

export interface Position {
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
}

export interface Transaction {
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: Date;
}

class PaperTrading {
  private static instance: PaperTrading;
  private balance: number;
  private positions: Map<string, Position>;
  private transactions: Transaction[];

  private constructor(initialBalance: number = 10000) {
    this.balance = initialBalance;
    this.positions = new Map();
    this.transactions = [];
  }

  public static getInstance(initialBalance?: number): PaperTrading {
    if (!PaperTrading.instance) {
      PaperTrading.instance = new PaperTrading(initialBalance);
    }
    return PaperTrading.instance;
  }

  async updatePrices(): Promise<void> {
    for (const [symbol, position] of this.positions.entries()) {
      try {
        const asset = await fetchAsset(symbol);
        position.currentPrice = asset.price;
        position.pnl = (position.currentPrice - position.entryPrice) * position.quantity;
      } catch (error) {
        console.error(`Error updating price for ${symbol}:`, error);
      }
    }
  }

  async buy(symbol: string, quantity: number): Promise<boolean> {
    try {
      const asset = await fetchAsset(symbol);
      const price = asset.price;
      const cost = price * quantity;

      if (cost > this.balance) {
        return false; // Insufficient funds
      }

      this.balance -= cost;
      this.positions.set(symbol, {
        symbol,
        quantity,
        entryPrice: price,
        currentPrice: price,
        pnl: 0,
      });

      this.transactions.push({
        symbol,
        type: 'buy',
        quantity,
        price,
        timestamp: new Date(),
      });

      return true;
    } catch (error) {
      console.error(`Error buying ${symbol}:`, error);
      return false;
    }
  }

  async sell(symbol: string, quantity: number): Promise<boolean> {
    const position = this.positions.get(symbol);
    if (!position || position.quantity < quantity) {
      return false; // Position not found or insufficient quantity
    }

    try {
      const asset = await fetchAsset(symbol);
      const price = asset.price;
      const revenue = price * quantity;

      this.balance += revenue;
      position.quantity -= quantity;
      position.pnl = (price - position.entryPrice) * position.quantity;

      if (position.quantity === 0) {
        this.positions.delete(symbol);
      }

      this.transactions.push({
        symbol,
        type: 'sell',
        quantity,
        price,
        timestamp: new Date(),
      });

      return true;
    } catch (error) {
      console.error(`Error selling ${symbol}:`, error);
      return false;
    }
  }

  getBalance(): number {
    return this.balance;
  }

  getPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  getTransactions(): Transaction[] {
    return this.transactions;
  }
}

export default PaperTrading; 