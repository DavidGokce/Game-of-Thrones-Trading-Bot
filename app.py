from flask import Flask, render_template, jsonify, Response, request
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
from flask_cors import CORS
from datetime import datetime
import ccxt
import pandas as pd
from apscheduler.schedulers.background import BackgroundScheduler
from logging.handlers import RotatingFileHandler
import secrets
from decimal import Decimal
import re
from flask_socketio import SocketIO, emit
from threading import Lock

# Load environment variables
load_dotenv()

# Configure logging with rotation
if not os.path.exists('logs'):
    os.makedirs('logs')

file_handler = RotatingFileHandler(
    'logs/trading_bot.log',
    maxBytes=10485760,  # 10MB
    backupCount=5
)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
))
file_handler.setLevel(logging.INFO)

logger = logging.getLogger('trading_bot')
logger.setLevel(logging.INFO)
logger.addHandler(file_handler)

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', secrets.token_hex(32))
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Configure CORS with specific origins and security headers
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
        "supports_credentials": True,
        "max_age": 3600
    }
})

# Add security headers
@app.after_request
def add_security_headers(response):
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Content-Security-Policy'] = "default-src 'self'; connect-src 'self' wss://ws.coincap.io; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
    return response

# Rate limiting
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",
    strategy="fixed-window",
    headers_enabled=True,
    fail_on_first_breach=True,
    swallow_errors=False,
    on_breach=lambda limit: Response(
        json.dumps({
            "error": "Rate limit exceeded",
            "retry_after": int(limit.reset_at - time.time())
        }),
        status=429,
        mimetype="application/json"
    )
)

# Initialize trading simulator
simulator = TradingSimulator(initial_balance=100000)
simulator_lock = Lock()

def background_update():
    """Background task to update trading data and emit via WebSocket"""
    with simulator_lock:
        try:
            data = simulator.get_current_simulation_data()
            socketio.emit('market_update', data)
        except Exception as e:
            logger.error(f"Error in background update: {str(e)}")
            traceback.print_exc()

# Initialize scheduler
scheduler = BackgroundScheduler()
scheduler.add_job(func=background_update, trigger="interval", seconds=1)
scheduler.start()

@app.route('/')
def home():
    try:
        with simulator_lock:
            data = simulator.get_current_simulation_data()
        return render_template('index.html', 
                             initial_data=data,
                             error=None)
    except Exception as e:
        logger.error(f"Error in home route: {str(e)}")
        return render_template('index.html',
                             initial_data=None,
                             error="Error loading initial data")

@limiter.limit("60 per minute")
@app.route('/api/market-data', methods=['GET'])
def get_market_data():
    try:
        with simulator_lock:
            data = simulator.get_current_simulation_data()
        return jsonify(data)
    except Exception as e:
        logger.error(f"Error fetching market data: {str(e)}")
        return jsonify({'error': str(e)}), 500

@limiter.limit("60 per minute")
@app.route('/api/positions', methods=['GET'])
def get_positions():
    try:
        with simulator_lock:
            data = simulator.get_current_simulation_data()
            return jsonify({
                'positions': data['positions'],
                'closed_positions': data['closed_positions'],
                'balance': data['balance']
            })
    except Exception as e:
        logger.error(f"Error fetching positions: {str(e)}")
        return jsonify({'error': str(e)}), 500

@limiter.limit("5 per minute")
@app.route("/api/trade", methods=["POST"])
def execute_trade():
    try:
        data = request.get_json()
        if not data or 'action' not in data:
            return jsonify({'error': 'Invalid request data'}), 400
            
        action = data['action'].lower()
        if action not in ['buy', 'sell']:
            return jsonify({'error': 'Invalid trade action'}), 400
            
        with simulator_lock:
            current_data = simulator.get_current_simulation_data()
            current_price = current_data['close'][-1]
            simulator._execute_trade(action, current_price)
            
            return jsonify({
                'success': True,
                'message': f'Successfully executed {action} trade',
                'positions': current_data['positions'],
                'balance': current_data['balance']
            })
            
    except Exception as e:
        logger.error(f"Error executing trade: {str(e)}")
        return jsonify({'error': str(e)}), 500

@socketio.on('connect')
def handle_connect():
    logger.info(f"Client connected: {request.sid}")
    with simulator_lock:
        try:
            data = simulator.get_current_simulation_data()
            emit('market_update', data)
        except Exception as e:
            logger.error(f"Error sending initial data: {str(e)}")

@socketio.on('disconnect')
def handle_disconnect():
    logger.info(f"Client disconnected: {request.sid}")

@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({
        "error": "Rate limit exceeded",
        "retry_after": int(e.description.split('in ', 1)[1].split(' second')[0])
    }), 429

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000) 