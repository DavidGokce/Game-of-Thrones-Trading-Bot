from flask import Flask, render_template, jsonify
from binance.client import Client
import os
import logging
from dotenv import load_dotenv
import time
from functools import wraps
from simulation import TradingSimulator

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)

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

# Initialize Binance client with demo API keys and retry mechanism
@retry_on_error(max_retries=3)
def init_client():
    return Client("demo", "demo")

try:
    client = init_client()
    simulator = TradingSimulator(client)
    logger.info("Binance client and simulator initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Binance client: {e}")
    client = None
    simulator = None

@retry_on_error(max_retries=2)
def get_crypto_prices():
    if not client:
        raise Exception("Binance client not initialized")
    btc_price = client.get_symbol_ticker(symbol="BTCUSDT")
    eth_price = client.get_symbol_ticker(symbol="ETHUSDT")
    return {
        'BTC': float(btc_price['price']),
        'ETH': float(eth_price['price'])
    }

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
    try:
        prices = get_crypto_prices()
        logger.info("Successfully fetched prices via API")
        return jsonify({
            'success': True,
            'data': prices
        })
    except Exception as e:
        logger.error(f"Error in prices API: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 503  # Service Unavailable

@app.route('/api/simulation/data')
def get_simulation_data():
    try:
        if not simulator:
            raise Exception("Simulator not initialized")
        
        data = simulator.get_current_simulation_data()
        return jsonify({
            'success': True,
            'data': data
        })
    except Exception as e:
        logger.error(f"Error in simulation API: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 503

if __name__ == '__main__':
    try:
        logger.info("Starting Flask application...")
        port = int(os.environ.get('PORT', 7000))
        app.run(host='0.0.0.0', port=port, debug=False)
    except Exception as e:
        logger.error(f"Failed to start Flask: {e}") 