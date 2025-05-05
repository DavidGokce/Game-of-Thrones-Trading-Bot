import pandas as pd
import numpy as np
from binance.client import Client
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class TradingSimulator:
    def __init__(self, client, symbol="BTCUSDT", interval="1h", lookback_days=30):
        self.client = client
        self.symbol = symbol
        self.interval = interval
        self.lookback_days = lookback_days
        self.historical_data = None
        self.current_index = 0
        
    def fetch_historical_data(self):
        try:
            # Calculate start time
            end_time = datetime.now()
            start_time = end_time - timedelta(days=self.lookback_days)
            
            # Fetch klines (candlestick data)
            klines = self.client.get_historical_klines(
                self.symbol,
                self.interval,
                start_time.strftime("%d %b %Y %H:%M:%S"),
                end_time.strftime("%d %b %Y %H:%M:%S")
            )
            
            # Convert to DataFrame
            df = pd.DataFrame(klines, columns=[
                'timestamp', 'open', 'high', 'low', 'close', 'volume',
                'close_time', 'quote_volume', 'trades', 'taker_buy_base',
                'taker_buy_quote', 'ignored'
            ])
            
            # Convert timestamp to datetime
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            
            # Convert relevant columns to float
            for col in ['open', 'high', 'low', 'close', 'volume']:
                df[col] = df[col].astype(float)
            
            # Add indicators
            df['SMA_20'] = df['close'].rolling(window=20).mean()
            df['SMA_50'] = df['close'].rolling(window=50).mean()
            df['RSI'] = self.calculate_rsi(df['close'])
            
            self.historical_data = df
            logger.info(f"Successfully fetched {len(df)} data points")
            return df
            
        except Exception as e:
            logger.error(f"Error fetching historical data: {e}")
            raise
    
    def calculate_rsi(self, prices, period=14):
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs))
    
    def get_current_simulation_data(self):
        if self.historical_data is None:
            self.fetch_historical_data()
        
        if self.current_index >= len(self.historical_data):
            self.current_index = 0
        
        data = self.historical_data.iloc[max(0, self.current_index-100):self.current_index+1]
        self.current_index += 1
        
        return {
            'timestamp': data['timestamp'].tolist(),
            'close': data['close'].tolist(),
            'sma_20': data['SMA_20'].tolist(),
            'sma_50': data['SMA_50'].tolist(),
            'rsi': data['RSI'].tolist(),
            'symbol': self.symbol
        } 