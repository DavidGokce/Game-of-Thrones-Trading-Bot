import { fetchAssetHistory } from './api';
import type { PricePoint } from './api-types';

interface StrategyResult {
  action: 'buy' | 'sell' | 'hold';
  reason: string;
  confidence: number;  // 0-1 scale
  suggestedPosition: number;  // Suggested position size
  stopLoss: number;  // Suggested stop loss price
  takeProfit: number;  // Suggested take profit price
}

interface IndicatorValues {
  sma: { short: number; long: number; };
  rsi: number;
  macd: { line: number; signal: number; histogram: number; };
  volume: { current: number; average: number; };
}

export class TradingStrategy {
  private shortPeriod: number;
  private longPeriod: number;
  private rsiPeriod: number;
  private volumePeriod: number;
  private lastAction: 'buy' | 'sell' | 'hold' = 'hold';
  private maxPositionSize: number = 0.1;  // Maximum position size as percentage of available capital
  private stopLossPercentage: number = 0.02;  // 2% stop loss
  private takeProfitPercentage: number = 0.06;  // 6% take profit

  constructor(
    shortPeriod: number = 9,
    longPeriod: number = 21,
    rsiPeriod: number = 14,
    volumePeriod: number = 20
  ) {
    this.shortPeriod = shortPeriod;
    this.longPeriod = longPeriod;
    this.rsiPeriod = rsiPeriod;
    this.volumePeriod = volumePeriod;
  }

  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return 0;
    const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
  }

  private calculateRSI(prices: number[]): number {
    if (prices.length < this.rsiPeriod + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= this.rsiPeriod; i++) {
      const difference = prices[prices.length - i] - prices[prices.length - i - 1];
      if (difference >= 0) {
        gains += difference;
      } else {
        losses -= difference;
      }
    }
    
    if (losses === 0) return 100;
    const relativeStrength = gains / losses;
    return 100 - (100 / (1 + relativeStrength));
  }

  private calculateMACD(prices: number[]): { line: number; signal: number; histogram: number; } {
    if (prices.length < 26) {
      return { line: 0, signal: 0, histogram: 0 };
    }

    const shortEMA = this.calculateEMA(prices, 12);
    const longEMA = this.calculateEMA(prices, 26);
    const macdLine = shortEMA - longEMA;
    
    // Calculate signal line using the last 9 MACD values
    const macdValues = prices.map((_, i, arr) => {
      if (i < 25) return 0;
      const slice = arr.slice(0, i + 1);
      const shortEMA = this.calculateEMA(slice, 12);
      const longEMA = this.calculateEMA(slice, 26);
      return shortEMA - longEMA;
    }).slice(-9);
    
    const signalLine = this.calculateEMA(macdValues, 9);
    const histogram = macdLine - signalLine;
    
    return { line: macdLine, signal: signalLine, histogram };
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0;
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }
    
    return ema;
  }

  private calculateIndicators(history: PricePoint[]): IndicatorValues {
    const prices = history.map(point => point.price);
    const volumes = history.map(point => point.volume || 0);

    return {
      sma: {
        short: this.calculateSMA(prices, this.shortPeriod),
        long: this.calculateSMA(prices, this.longPeriod)
      },
      rsi: this.calculateRSI(prices),
      macd: this.calculateMACD(prices),
      volume: {
        current: volumes[volumes.length - 1],
        average: this.calculateSMA(volumes, this.volumePeriod)
      }
    };
  }

  private calculateConfidence(indicators: IndicatorValues, crossoverUp: boolean, crossoverDown: boolean): number {
    let confidence = 0.5;  // Base confidence

    // SMA trend strength
    const trendStrength = Math.abs(indicators.sma.short - indicators.sma.long) / indicators.sma.long;
    confidence += trendStrength * 0.1;

    // RSI confirmation
    if (crossoverUp && indicators.rsi < 70) confidence += 0.1;
    if (crossoverDown && indicators.rsi > 30) confidence += 0.1;
    if (indicators.rsi > 80 || indicators.rsi < 20) confidence -= 0.1;

    // MACD confirmation
    if (crossoverUp && indicators.macd.histogram > 0) confidence += 0.1;
    if (crossoverDown && indicators.macd.histogram < 0) confidence += 0.1;

    // Volume confirmation
    if (indicators.volume.current > indicators.volume.average) confidence += 0.1;

    return Math.min(Math.max(confidence, 0), 1);  // Ensure confidence is between 0 and 1
  }

  private calculatePositionSize(confidence: number, currentPrice: number): number {
    // Scale position size based on confidence
    return this.maxPositionSize * confidence;
  }

  async analyze(symbol: string): Promise<StrategyResult> {
    try {
      console.log(`Analyzing symbol in strategy: ${symbol}`);
      const history = await fetchAssetHistory(symbol.toLowerCase(), '1h');
      
      if (!history || history.length < Math.max(this.longPeriod, this.rsiPeriod)) {
        return {
          action: 'hold',
          reason: 'Insufficient price data',
          confidence: 0,
          suggestedPosition: 0,
          stopLoss: 0,
          takeProfit: 0
        };
      }

      const currentPrice = history[history.length - 1].price;
      const indicators = this.calculateIndicators(history);
      
      const previousShortMA = this.calculateSMA(
        history.slice(0, -1).map(h => h.price),
        this.shortPeriod
      );
      const previousLongMA = this.calculateSMA(
        history.slice(0, -1).map(h => h.price),
        this.longPeriod
      );

      const crossoverUp = previousShortMA <= previousLongMA && indicators.sma.short > indicators.sma.long;
      const crossoverDown = previousShortMA >= previousLongMA && indicators.sma.short < indicators.sma.long;

      let result: StrategyResult;
      const confidence = this.calculateConfidence(indicators, crossoverUp, crossoverDown);
      const positionSize = this.calculatePositionSize(confidence, currentPrice);

      if (crossoverUp && this.lastAction !== 'buy' && indicators.rsi < 70) {
        this.lastAction = 'buy';
        result = {
          action: 'buy',
          reason: `Buy signal: SMA crossover up, RSI: ${indicators.rsi.toFixed(2)}, MACD hist: ${indicators.macd.histogram.toFixed(4)}`,
          confidence,
          suggestedPosition: positionSize,
          stopLoss: currentPrice * (1 - this.stopLossPercentage),
          takeProfit: currentPrice * (1 + this.takeProfitPercentage)
        };
      } else if (crossoverDown && this.lastAction !== 'sell' && indicators.rsi > 30) {
        this.lastAction = 'sell';
        result = {
          action: 'sell',
          reason: `Sell signal: SMA crossover down, RSI: ${indicators.rsi.toFixed(2)}, MACD hist: ${indicators.macd.histogram.toFixed(4)}`,
          confidence,
          suggestedPosition: positionSize,
          stopLoss: currentPrice * (1 + this.stopLossPercentage),
          takeProfit: currentPrice * (1 - this.takeProfitPercentage)
        };
      } else {
        result = {
          action: 'hold',
          reason: `No clear signal. RSI: ${indicators.rsi.toFixed(2)}, MACD hist: ${indicators.macd.histogram.toFixed(4)}`,
          confidence: 0,
          suggestedPosition: 0,
          stopLoss: 0,
          takeProfit: 0
        };
      }

      console.log(`Strategy result for ${symbol}:`, result);
      return result;
    } catch (error) {
      console.error('Error analyzing trading strategy:', error);
      return {
        action: 'hold',
        reason: 'Error analyzing market data: ' + (error instanceof Error ? error.message : String(error)),
        confidence: 0,
        suggestedPosition: 0,
        stopLoss: 0,
        takeProfit: 0
      };
    }
  }
} 