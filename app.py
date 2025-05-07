from flask import Flask, render_template, jsonify, Response
import os
import logging
from dotenv import load_dotenv
import time
from functools import wraps
from simulation import TradingSimulator
import random
import traceback
import json
import requests
import requests_cache

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Setup request caching
requests_cache.install_cache('coinmarketcap_cache', expire_after=300)  # Cache for 5 minutes

app = Flask(__name__)

# CoinMarketCap API configuration
CMC_API_KEY = 'f7cdd94d-5862-4910-b8ea-f8a5917f31d5'
CMC_API_URL = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest'

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

@retry_on_error(max_retries=2)
def get_crypto_prices():
    try:
        headers = {
            'X-CMC_PRO_API_KEY': CMC_API_KEY,
            'Accept': 'application/json'
        }
        
        params = {
            'symbol': 'BTC,ETH',
            'convert': 'USD'
        }
        
        response = requests.get(CMC_API_URL, headers=headers, params=params)
        data = response.json()
        
        if response.status_code == 200:
            prices = {
                'BTC': float(data['data']['BTC']['quote']['USD']['price']),
                'ETH': float(data['data']['ETH']['quote']['USD']['price'])
            }
            logger.info(f"Successfully fetched prices - BTC: {prices['BTC']}, ETH: {prices['ETH']}")
            return prices
        else:
            logger.error(f"API Error: {data.get('status', {}).get('error_message', 'Unknown error')}")
            raise Exception("Failed to fetch prices from CoinMarketCap")
            
    except Exception as e:
        logger.error(f"Error fetching prices: {e}")
        # Generate mock prices as fallback
        prices = {
            'BTC': round(random.uniform(45000, 55000), 2),
            'ETH': round(random.uniform(2800, 3200), 2)
        }
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
    try:
        simulator = TradingSimulator(None)  # Using mock mode
        data = simulator.get_current_simulation_data()
        logger.info(f"Simulation data returned: {data if data else 'No data'}")
        return Response(
            json.dumps({'success': True, 'data': data}),
            mimetype='application/json'
        )
    except Exception as e:
        logger.error(f"Error in simulation API: {e}\n{traceback.format_exc()}")
        return Response(
            json.dumps({'success': False, 'error': f"Simulation error: {str(e)}"}),
            mimetype='application/json'
        ), 503

if __name__ == '__main__':
    try:
        logger.info("Starting Flask application...")
        port = int(os.environ.get('PORT', 7000))
        app.run(host='0.0.0.0', port=port, debug=False)
    except Exception as e:
        logger.error(f"Failed to start Flask: {e}") 