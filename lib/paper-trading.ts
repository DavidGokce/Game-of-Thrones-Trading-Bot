import { fetchAsset } from './api';

export interface Position {
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface Transaction {
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: Date;
  reason?: 'market' | 'stop_loss' | 'take_profit';
}

export interface OrderParameters {
  stopLoss?: number;
  takeProfit?: number;
}

class PaperTrading {
  private static instance: PaperTrading;
  private balance: number;
  private positions: Map<string, Position>;
  private transactions: Transaction[];
  private lastCheck: number = 0;
  private lastPriceUpdate: number = 0;
  private readonly checkInterval: number = 60000; // Check every minute
  private readonly priceUpdateInterval: number = 1000; // Update prices every second

  private constructor(initialBalance: number = 10000) {
    this.balance = initialBalance;
    this.positions = new Map();
    this.transactions = [];
    this.startPriceMonitoring();
  }

  public static getInstance(initialBalance?: number): PaperTrading {
    if (!PaperTrading.instance) {
      PaperTrading.instance = new PaperTrading(initialBalance);
    }
    return PaperTrading.instance;
  }

  private startPriceMonitoring() {
    setInterval(() => this.checkStopLossAndTakeProfit(), this.checkInterval);
  }

  private async checkStopLossAndTakeProfit() {
    const now = Date.now();
    if (now - this.lastCheck < this.checkInterval) return;
    this.lastCheck = now;

    for (const [symbol, position] of this.positions.entries()) {
      try {
        const asset = await fetchAsset(symbol);
        const currentPrice = asset.price;

        // Update position current price and PnL
        position.currentPrice = currentPrice;
        position.pnl = (currentPrice - position.entryPrice) * position.quantity;

        // Check stop-loss
        if (position.stopLoss && currentPrice <= position.stopLoss) {
          await this.sell(symbol, position.quantity, 'stop_loss');
          continue;
        }

        // Check take-profit
        if (position.takeProfit && currentPrice >= position.takeProfit) {
          await this.sell(symbol, position.quantity, 'take_profit');
        }
      } catch (error) {
        console.error(`Error checking price for ${symbol}:`, error);
      }
    }
  }

  async updatePrices(): Promise<void> {
    const now = Date.now();
    if (now - this.lastPriceUpdate < this.priceUpdateInterval) {
      return; // Skip update if too soon
    }
    this.lastPriceUpdate = now;

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

  async buy(symbol: string, quantity: number, params?: OrderParameters): Promise<boolean> {
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
        stopLoss: params?.stopLoss,
        takeProfit: params?.takeProfit
      });

      this.transactions.push({
        symbol,
        type: 'buy',
        quantity,
        price,
        timestamp: new Date(),
        reason: 'market'
      });

      return true;
    } catch (error) {
      console.error(`Error buying ${symbol}:`, error);
      return false;
    }
  }

  async sell(symbol: string, quantity: number, reason: 'market' | 'stop_loss' | 'take_profit' = 'market'): Promise<boolean> {
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
        reason
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