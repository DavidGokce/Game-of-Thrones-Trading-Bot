import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
from dataclasses import dataclass
from typing import List, Dict, Optional
import json

logger = logging.getLogger(__name__)

@dataclass
class Position:
    symbol: str
    entry_price: float
    quantity: float
    entry_time: datetime
    side: str  # 'long' or 'short'
    take_profit: Optional[float] = None
    stop_loss: Optional[float] = None
    exit_price: Optional[float] = None
    exit_time: Optional[datetime] = None
    pnl: Optional[float] = None
    status: str = 'open'  # 'open' or 'closed'

    def to_dict(self):
        return {
            'symbol': self.symbol,
            'entry_price': self.entry_price,
            'quantity': self.quantity,
            'entry_time': self.entry_time.isoformat(),
            'side': self.side,
            'take_profit': self.take_profit,
            'stop_loss': self.stop_loss,
            'exit_price': self.exit_price,
            'exit_time': self.exit_time.isoformat() if self.exit_time else None,
            'pnl': self.pnl,
            'status': self.status
        }

class TradingSimulator:
    def __init__(self, initial_balance=100000, symbol="BTCUSDT", interval="1h", lookback_days=30):
        self.symbol = symbol
        self.interval = interval
        self.lookback_days = lookback_days
        self.historical_data = None
        self.current_index = 0
        self.balance = initial_balance
        self.positions: List[Position] = []
        self.closed_positions: List[Position] = []
        self.risk_per_trade = 0.02  # 2% risk per trade
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
        
        # Technical indicators
        df['SMA_20'] = df['close'].rolling(window=20).mean()
        df['SMA_50'] = df['close'].rolling(window=50).mean()
        df['RSI'] = self.calculate_rsi(df['close'])
        
        # MACD
        exp1 = df['close'].ewm(span=12, adjust=False).mean()
        exp2 = df['close'].ewm(span=26, adjust=False).mean()
        df['MACD'] = exp1 - exp2
        df['Signal'] = df['MACD'].ewm(span=9, adjust=False).mean()
        df['MACD_Hist'] = df['MACD'] - df['Signal']
        
        # Bollinger Bands
        df['BB_middle'] = df['close'].rolling(window=20).mean()
        df['BB_upper'] = df['BB_middle'] + 2 * df['close'].rolling(window=20).std()
        df['BB_lower'] = df['BB_middle'] - 2 * df['close'].rolling(window=20).std()
        
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
        current_price = data['close'].iloc[-1]
        
        # Update positions P&L
        self._update_positions(current_price)
        
        # Generate trading signals
        signal = self._generate_trading_signal(data)
        
        # Execute trades based on signals
        if signal != 'hold':
            self._execute_trade(signal, current_price)
        
        self.current_index += 1
        
        return {
            'timestamp': data['timestamp'].astype(str).tolist()[-100:],
            'close': data['close'].tolist()[-100:],
            'sma_20': data['SMA_20'].tolist()[-100:],
            'sma_50': data['SMA_50'].tolist()[-100:],
            'rsi': data['RSI'].tolist()[-100:],
            'macd': data['MACD'].tolist()[-100:],
            'signal': data['Signal'].tolist()[-100:],
            'bb_upper': data['BB_upper'].tolist()[-100:],
            'bb_lower': data['BB_lower'].tolist()[-100:],
            'symbol': self.symbol,
            'positions': [pos.to_dict() for pos in self.positions],
            'closed_positions': [pos.to_dict() for pos in self.closed_positions],
            'balance': self.balance
        }
    
    def _generate_trading_signal(self, data: pd.DataFrame) -> str:
        """Generate trading signals based on multiple indicators"""
        current = data.iloc[-1]
        
        # MACD Signal
        macd_signal = 'hold'
        if current['MACD'] > current['Signal'] and current['MACD_Hist'] > 0:
            macd_signal = 'buy'
        elif current['MACD'] < current['Signal'] and current['MACD_Hist'] < 0:
            macd_signal = 'sell'
            
        # RSI Signal
        rsi_signal = 'hold'
        if current['RSI'] < 30:
            rsi_signal = 'buy'
        elif current['RSI'] > 70:
            rsi_signal = 'sell'
            
        # Bollinger Bands Signal
        bb_signal = 'hold'
        if current['close'] < current['BB_lower']:
            bb_signal = 'buy'
        elif current['close'] > current['BB_upper']:
            bb_signal = 'sell'
            
        # Combine signals (conservative approach - only trade on agreement)
        if macd_signal == rsi_signal == 'buy' or (macd_signal == 'buy' and bb_signal == 'buy'):
            return 'buy'
        elif macd_signal == rsi_signal == 'sell' or (macd_signal == 'sell' and bb_signal == 'sell'):
            return 'sell'
        
        return 'hold'
    
    def _execute_trade(self, signal: str, current_price: float):
        """Execute trades based on signals and risk management"""
        # Calculate position size based on risk
        risk_amount = self.balance * self.risk_per_trade
        position_size = risk_amount / current_price
        
        if signal == 'buy' and not any(p.status == 'open' for p in self.positions):
            # Open long position
            take_profit = current_price * 1.03  # 3% profit target
            stop_loss = current_price * 0.98    # 2% stop loss
            
            position = Position(
                symbol=self.symbol,
                entry_price=current_price,
                quantity=position_size,
                entry_time=datetime.now(),
                side='long',
                take_profit=take_profit,
                stop_loss=stop_loss
            )
            self.positions.append(position)
            logger.info(f"Opened long position at {current_price}")
            
        elif signal == 'sell':
            # Close any open long positions
            for position in self.positions:
                if position.status == 'open' and position.side == 'long':
                    position.exit_price = current_price
                    position.exit_time = datetime.now()
                    position.status = 'closed'
                    position.pnl = (current_price - position.entry_price) * position.quantity
                    self.balance += position.pnl
                    self.closed_positions.append(position)
                    logger.info(f"Closed long position at {current_price}, PnL: {position.pnl}")
            
            self.positions = [p for p in self.positions if p.status == 'open']
    
    def _update_positions(self, current_price: float):
        """Update open positions and check for stop loss/take profit"""
        for position in self.positions:
            if position.status == 'open':
                # Check stop loss
                if position.side == 'long' and current_price <= position.stop_loss:
                    position.exit_price = position.stop_loss
                    position.exit_time = datetime.now()
                    position.status = 'closed'
                    position.pnl = (position.stop_loss - position.entry_price) * position.quantity
                    self.balance += position.pnl
                    self.closed_positions.append(position)
                    logger.info(f"Stop loss triggered at {position.stop_loss}, PnL: {position.pnl}")
                
                # Check take profit
                elif position.side == 'long' and current_price >= position.take_profit:
                    position.exit_price = position.take_profit
                    position.exit_time = datetime.now()
                    position.status = 'closed'
                    position.pnl = (position.take_profit - position.entry_price) * position.quantity
                    self.balance += position.pnl
                    self.closed_positions.append(position)
                    logger.info(f"Take profit triggered at {position.take_profit}, PnL: {position.pnl}")
        
        self.positions = [p for p in self.positions if p.status == 'open'] 