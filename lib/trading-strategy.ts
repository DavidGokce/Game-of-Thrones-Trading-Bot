import { fetchAssetHistory } from './api';
import type { PricePoint } from './api-types';

interface StrategyResult {
  action: 'buy' | 'sell' | 'hold';
  reason: string;
}

export class TradingStrategy {
  private shortPeriod: number;
  private longPeriod: number;
  private lastAction: 'buy' | 'sell' | 'hold' = 'hold';

  constructor(shortPeriod: number = 2, longPeriod: number = 3) {
    this.shortPeriod = shortPeriod;
    this.longPeriod = longPeriod;
  }

  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return 0;
    const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
  }

  async analyze(symbol: string): Promise<StrategyResult> {
    try {
      console.log(`Analyzing symbol in strategy: ${symbol}`);
      // Fetch recent price history
      const history = await fetchAssetHistory(symbol.toLowerCase(), '1h');
      
      if (!history || history.length === 0) {
        return {
          action: 'hold',
          reason: 'Insufficient price data'
        };
      }

      // Extract prices
      const prices = history.map(point => point.price);

      // Calculate moving averages
      const shortMA = this.calculateSMA(prices, this.shortPeriod);
      const longMA = this.calculateSMA(prices, this.longPeriod);
      const previousShortMA = this.calculateSMA(prices.slice(0, -1), this.shortPeriod);
      const previousLongMA = this.calculateSMA(prices.slice(0, -1), this.longPeriod);

      // Check for crossover
      const currentPrice = prices[prices.length - 1];
      const crossoverUp = previousShortMA <= previousLongMA && shortMA > longMA;
      const crossoverDown = previousShortMA >= previousLongMA && shortMA < longMA;

      // Generate trading signal
      let result: StrategyResult;
      if (crossoverUp && this.lastAction !== 'buy') {
        this.lastAction = 'buy';
        result = {
          action: 'buy',
          reason: `Short MA (${shortMA.toFixed(2)}) crossed above Long MA (${longMA.toFixed(2)})`
        };
      } else if (crossoverDown && this.lastAction !== 'sell') {
        this.lastAction = 'sell';
        result = {
          action: 'sell',
          reason: `Short MA (${shortMA.toFixed(2)}) crossed below Long MA (${longMA.toFixed(2)})`
        };
      } else {
        result = {
          action: 'hold',
          reason: `No crossover detected. Short MA: ${shortMA.toFixed(2)}, Long MA: ${longMA.toFixed(2)}`
        };
      }
      console.log(`Strategy result for ${symbol}:`, result);
      return result;
    } catch (error) {
      console.error('Error analyzing trading strategy:', error);
      return {
        action: 'hold',
        reason: 'Error analyzing market data'
      };
    }
  }
} 