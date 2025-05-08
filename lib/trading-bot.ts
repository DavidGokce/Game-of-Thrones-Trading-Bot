import { TradingStrategy } from './trading-strategy';
import PaperTrading, { Position, OrderParameters } from './paper-trading';
import { fetchAsset } from './api';
import { TransformedAsset } from './api-types';

export interface TradeUpdate {
  symbol: string;
  action: 'buy' | 'sell' | 'error';
  reason: string;
  confidence?: number;
  stopLoss?: number;
  takeProfit?: number;
  positionSize?: number;
}

export interface Balance {
  usd: number;
  [key: string]: number;
}

export interface RiskParameters {
  maxPositionSize: number;  // Maximum position size as percentage of portfolio
  maxDrawdown: number;      // Maximum allowed drawdown percentage
  minConfidence: number;    // Minimum confidence level to execute trade
}

export interface ExtendedPosition extends Position {
  unrealizedPnL: number;
  cost: number;
}

export class TradingBot {
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly strategy: TradingStrategy;
  private readonly paperTrading: PaperTrading;
  private readonly symbols: string[];
  private readonly checkInterval: number;
  private readonly onUpdate: (update: TradeUpdate) => void;
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 1000;
  private readonly riskParams: RiskParameters;

  constructor(
    symbols: string[],
    checkInterval: number = 300000, // 5 minutes
    onUpdate: (update: TradeUpdate) => void,
    riskParams: Partial<RiskParameters> = {}
  ) {
    this.symbols = symbols;
    this.checkInterval = checkInterval;
    this.strategy = new TradingStrategy();
    this.paperTrading = PaperTrading.getInstance();
    this.onUpdate = onUpdate;
    this.riskParams = {
      maxPositionSize: riskParams.maxPositionSize || 0.1,  // 10% max position size
      maxDrawdown: riskParams.maxDrawdown || 0.2,          // 20% max drawdown
      minConfidence: riskParams.minConfidence || 0.6       // 60% minimum confidence
    };
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      // Initial check
      await this.checkAllSymbols();

      // Set up interval for regular checks
      this.intervalId = setInterval(() => this.checkAllSymbols(), this.checkInterval);
    } catch (error) {
      console.error('Error starting trading bot:', error);
      this.stop();
      throw error;
    }
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, attempt)));
        }
      }
    }
    
    throw lastError || new Error('Operation failed after retries');
  }

  private async checkAllSymbols() {
    let hasError = false;
    const portfolioValue = await this.calculatePortfolioValue();

    for (const symbol of this.symbols) {
      try {
        console.log(`Checking symbol: ${symbol}`);
        const result = await this.retryOperation(() => this.strategy.analyze(symbol));
        
        // Skip if confidence is too low
        if (result.confidence < this.riskParams.minConfidence) {
          console.log(`Skipping ${symbol}: Low confidence (${result.confidence})`);
          continue;
        }

        if (result.action !== 'hold') {
          const quantity = await this.calculateTradeQuantity(
            symbol,
            result.action,
            result.suggestedPosition,
            portfolioValue
          );

          if (quantity === 0) {
            console.warn(`Skipping ${result.action} for ${symbol}: Invalid quantity calculated`);
            continue;
          }
          
          const orderParams: OrderParameters = {
            stopLoss: result.stopLoss,
            takeProfit: result.takeProfit
          };

          if (result.action === 'buy') {
            const success = await this.retryOperation(() => 
              this.paperTrading.buy(symbol, quantity, orderParams)
            );
            
            if (success) {
              this.onUpdate({
                symbol,
                action: 'buy',
                reason: result.reason,
                confidence: result.confidence,
                stopLoss: result.stopLoss,
                takeProfit: result.takeProfit,
                positionSize: quantity
              });
            } else {
              console.error(`Failed to execute buy order for ${symbol}`);
            }
          } else if (result.action === 'sell') {
            const success = await this.retryOperation(() => 
              this.paperTrading.sell(symbol, quantity, 'market')
            );
            
            if (success) {
              this.onUpdate({
                symbol,
                action: 'sell',
                reason: result.reason,
                confidence: result.confidence,
                stopLoss: result.stopLoss,
                takeProfit: result.takeProfit,
                positionSize: quantity
              });
            } else {
              console.error(`Failed to execute sell order for ${symbol}`);
            }
          }
        }
      } catch (error) {
        hasError = true;
        console.error(`Error processing symbol ${symbol}:`, error);
        
        this.onUpdate({
          symbol,
          action: 'error',
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    if (hasError) {
      console.warn('Some symbols failed to process in this iteration');
    }
  }

  private async calculatePortfolioValue(): Promise<number> {
    const positions = this.paperTrading.getPositions();
    const balance = this.paperTrading.getBalance();
    
    let totalValue = balance;
    
    for (const position of positions) {
      try {
        const asset = await this.retryOperation(() => fetchAsset(position.symbol.toLowerCase()));
        if (asset) {
          totalValue += position.quantity * asset.price;
        }
      } catch (error) {
        console.error(`Error calculating position value for ${position.symbol}:`, error);
      }
    }
    
    return totalValue;
  }

  private async calculateTradeQuantity(
    symbol: string,
    action: string,
    suggestedPosition: number,
    portfolioValue: number
  ): Promise<number> {
    try {
      const asset = await this.retryOperation(() => fetchAsset(symbol.toLowerCase()));
      const position = this.paperTrading.getPositions().find(p => p.symbol === symbol);
      
      if (!asset || !asset.price || asset.price <= 0) {
        throw new Error(`Invalid price for ${symbol}`);
      }

      if (action === 'buy') {
        // Calculate position size based on portfolio value and risk parameters
        const maxPositionValue = portfolioValue * Math.min(suggestedPosition, this.riskParams.maxPositionSize);
        return Math.floor(maxPositionValue / asset.price * 1e8) / 1e8;
      } else {
        // Sell all available quantity
        return position ? position.quantity : 0;
      }
    } catch (error) {
      console.error(`Error calculating trade quantity for ${symbol}:`, error);
      return 0;
    }
  }

  private checkDrawdown(): boolean {
    const positions = this.paperTrading.getPositions() as ExtendedPosition[];
    let totalDrawdown = 0;
    
    for (const position of positions) {
      const unrealizedPnL = position.pnl;
      const cost = position.quantity * position.entryPrice;
      
      if (cost > 0) {
        totalDrawdown += Math.min(0, unrealizedPnL / cost);
      }
    }
    
    return Math.abs(totalDrawdown) <= this.riskParams.maxDrawdown;
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