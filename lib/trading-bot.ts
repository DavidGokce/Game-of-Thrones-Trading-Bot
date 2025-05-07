import { TradingStrategy } from './trading-strategy';
import PaperTrading from './paper-trading';

export class TradingBot {
  private strategy: TradingStrategy;
  private paperTrading: PaperTrading;
  private isRunning: boolean = false;
  private checkInterval: number = 300000; // Check every 5 minutes
  private intervalId: NodeJS.Timeout | null = null;
  public symbols: string[];
  private onUpdate: (update: { symbol: string; action: string; reason: string }) => void;

  constructor(
    symbols: string[] = ['BTCUSDT', 'ETHUSDT'],
    onUpdate: (update: { symbol: string; action: string; reason: string }) => void = () => {}
  ) {
    this.strategy = new TradingStrategy();
    this.paperTrading = PaperTrading.getInstance();
    this.symbols = symbols;
    this.onUpdate = onUpdate;
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Initial check
    await this.checkAllSymbols();

    // Set up interval for regular checks
    this.intervalId = setInterval(() => this.checkAllSymbols(), this.checkInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  private async checkAllSymbols() {
    for (const symbol of this.symbols) {
      try {
        console.log(`Checking symbol: ${symbol}`);
        const result = await this.strategy.analyze(symbol);
        if (result.action !== 'hold') {
          const quantity = this.calculateTradeQuantity(symbol, result.action);
          if (result.action === 'buy') {
            const success = await this.paperTrading.buy(symbol, quantity);
            if (success) {
              this.onUpdate({
                symbol,
                action: 'buy',
                reason: result.reason
              });
            }
          } else if (result.action === 'sell') {
            const success = await this.paperTrading.sell(symbol, quantity);
            if (success) {
              this.onUpdate({
                symbol,
                action: 'sell',
                reason: result.reason
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error checking ${symbol}:`, error);
        // Skip unsupported symbols gracefully
        continue;
      }
    }
  }

  private calculateTradeQuantity(symbol: string, action: 'buy' | 'sell'): number {
    // Base quantities for different asset types
    const baseQuantities: { [key: string]: number } = {
      'BTCUSDT': 0.01,  // Bitcoin
      'ETHUSDT': 0.1,   // Ethereum
      'BNBUSDT': 0.5,   // Binance Coin
      'ADAUSDT': 100,   // Cardano
      'DOGEUSDT': 1000, // Dogecoin
      'XRPUSDT': 100,   // Ripple
      'DOTUSDT': 10,    // Polkadot
      'LTCUSDT': 1,     // Litecoin
      'LINKUSDT': 5,    // Chainlink
      'UNIUSDT': 10,    // Uniswap
    };

    // Default quantity for unknown assets
    const defaultQuantity = 1;

    // Get the base quantity for the symbol, or use default if not found
    const baseQuantity = baseQuantities[symbol] || defaultQuantity;

    // Adjust quantity based on current balance and risk management
    const balance = this.paperTrading.getBalance();
    const maxTradeValue = balance * 0.1; // Maximum 10% of balance per trade

    // Get current price from paper trading
    const positions = this.paperTrading.getPositions();
    const currentPosition = positions.find(p => p.symbol === symbol);
    const currentPrice = currentPosition?.currentPrice || 0;

    if (currentPrice === 0) return baseQuantity;

    // Calculate maximum quantity based on balance
    const maxQuantity = maxTradeValue / currentPrice;

    // Return the smaller of base quantity and max quantity
    return Math.min(baseQuantity, maxQuantity);
  }

  getPositions() {
    return this.paperTrading.getPositions();
  }

  getBalance() {
    return this.paperTrading.getBalance();
  }

  getTransactions() {
    return this.paperTrading.getTransactions();
  }
} 