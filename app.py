from flask import Flask, render_template, jsonify
from binance.client import Client
import os
import logging
from dotenv import load_dotenv
import time
from functools import wraps
from simulation import TradingSimulator
import random

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Mock price data for testing
MOCK_BTC_PRICE = 50000.0
MOCK_ETH_PRICE = 3000.0

def retry_on_error(max_retries=3, delay=1):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    logger.error(f"Attempt {attempt + 1} failed: {e}")
                    if attempt == max_retries - 1:
                        raise
                    time.sleep(delay)
            return None
        return wrapper
    return decorator

def get_mock_prices():
    """Generate slightly varying mock prices to simulate market movement"""
    global MOCK_BTC_PRICE, MOCK_ETH_PRICE
    
    # Add small random variations to simulate price movement
    btc_variation = random.uniform(-100, 100)
    eth_variation = random.uniform(-10, 10)
    
    MOCK_BTC_PRICE = max(10000, MOCK_BTC_PRICE + btc_variation)
    MOCK_ETH_PRICE = max(1000, MOCK_ETH_PRICE + eth_variation)
    
    return {
        'BTC': round(MOCK_BTC_PRICE, 2),
        'ETH': round(MOCK_ETH_PRICE, 2)
    }

# Initialize Binance client with API keys
@retry_on_error(max_retries=3)
def init_client():
    api_key = os.getenv('BINANCE_API_KEY')
    api_secret = os.getenv('BINANCE_API_SECRET')
    
    if not api_key or not api_secret:
        logger.info("No API keys found. Using mock data mode.")
        return None
    
    return Client(api_key, api_secret)

try:
    client = init_client()
except Exception as e:
    logger.error(f"Failed to initialize client: {e}")
    client = None

# Always initialize the simulator, even if client is None
simulator = TradingSimulator(client)
logger.info("Simulator initialized (client may be None in mock mode)")

@retry_on_error(max_retries=2)
def get_crypto_prices():
    try:
        if not client:
            # Use mock data if no client is available
            prices = get_mock_prices()
            logger.info(f"Returning mock prices: {prices}")
            return prices
        # Get BTC price
        btc_ticker = client.get_symbol_ticker(symbol="BTCUSDT")
        btc_price = float(btc_ticker['price'])
        # Get ETH price
        eth_ticker = client.get_symbol_ticker(symbol="ETHUSDT")
        eth_price = float(eth_ticker['price'])
        logger.info(f"Successfully fetched prices - BTC: {btc_price}, ETH: {eth_price}")
        return {
            'BTC': btc_price,
            'ETH': eth_price
        }
    except Exception as e:
        logger.error(f"Error fetching prices, returning mock data: {e}")
        prices = get_mock_prices()
        logger.info(f"Returning fallback mock prices: {prices}")
        return prices

@app.route('/')
def home():
    try:
        prices = get_crypto_prices()
        logger.info("Successfully fetched crypto prices")
        return render_template('index.html', 
                             btc_price=prices['BTC'],
                             eth_price=prices['ETH'],
                             error=None)
    except Exception as e:
        logger.error(f"Error in home route: {e}")
        return render_template('index.html',
                             btc_price=0,
                             eth_price=0,
                             error="Unable to fetch prices. Retrying...")

@app.route('/api/prices')
def get_prices():
    prices = get_crypto_prices()
    logger.info(f"/api/prices returning: {prices}")
    return jsonify({
        'success': True,
        'data': prices
    })

@app.route('/api/simulation/data')
def get_simulation_data():
    global simulator
    global client
    try:
        logger.info(f"Simulator object: {simulator}")
        if simulator is None:
            logger.warning("Simulator was None, re-initializing.")
            simulator = TradingSimulator(client)
        data = simulator.get_current_simulation_data()
        logger.info(f"Simulation data returned: {data if data else 'No data'}")
        return jsonify({
            'success': True,
            'data': data
        })
    except Exception as e:
        logger.error(f"Error in simulation API: {e}")
        return jsonify({
            'success': False,
            'error': f"Simulation error: {str(e)}"
        }), 503

if __name__ == '__main__':
    try:
        logger.info("Starting Flask application...")
        port = int(os.environ.get('PORT', 7000))
        app.run(host='0.0.0.0', port=port, debug=False)
    except Exception as e:
        logger.error(f"Failed to start Flask: {e}") 