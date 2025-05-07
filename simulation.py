import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class TradingSimulator:
    def __init__(self, client=None, symbol="BTCUSDT", interval="1h", lookback_days=30):
        self.symbol = symbol
        self.interval = interval
        self.lookback_days = lookback_days
        self.historical_data = None
        self.current_index = 0
        self._generate_mock_data()
        
    def _generate_mock_data(self):
        # Generate 200 mock hourly data points
        now = datetime.now()
        timestamps = [now - timedelta(hours=i) for i in range(200)][::-1]
        close_prices = np.cumsum(np.random.randn(200)) + 50000
        df = pd.DataFrame({
            'timestamp': timestamps,
            'close': close_prices,
        })
        df['open'] = df['close'] + np.random.uniform(-50, 50, size=200)
        df['high'] = df[['open', 'close']].max(axis=1) + np.random.uniform(0, 100, size=200)
        df['low'] = df[['open', 'close']].min(axis=1) - np.random.uniform(0, 100, size=200)
        df['volume'] = np.random.uniform(10, 100, size=200)
        df['SMA_20'] = df['close'].rolling(window=20).mean()
        df['SMA_50'] = df['close'].rolling(window=50).mean()
        df['RSI'] = self.calculate_rsi(df['close'])
        self.historical_data = df
    
    def calculate_rsi(self, prices, period=14):
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs))
    
    def get_current_simulation_data(self):
        if self.historical_data is None:
            self._generate_mock_data()
        if self.current_index >= len(self.historical_data):
            self.current_index = 0
        data = self.historical_data.iloc[max(0, self.current_index-100):self.current_index+1]
        self.current_index += 1
        # Limit to last 100 points
        return {
            'timestamp': data['timestamp'].astype(str).tolist()[-100:],
            'close': data['close'].tolist()[-100:],
            'sma_20': data['SMA_20'].tolist()[-100:],
            'sma_50': data['SMA_50'].tolist()[-100:],
            'rsi': data['RSI'].tolist()[-100:],
            'symbol': self.symbol
        } 