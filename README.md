# Game of Cryptos Trading Bot

A Game of Thrones themed cryptocurrency price tracking application.

## Features
- Real-time price tracking for Bitcoin and Ethereum
- Game of Thrones themed UI
- Auto-refreshing prices every 10 seconds
- Responsive design

## Setup

1. Install the required dependencies:
```bash
pip install -r requirements.txt
```

2. Run the application:
```bash
python app.py
```

3. Open your browser and navigate to:
```
http://localhost:8042
```

## Note
This application uses Binance's API in test mode. For real trading, you would need to:
1. Create a Binance account
2. Generate API keys
3. Replace the demo credentials in app.py with your actual API keys

## Security Notice
Never commit your actual API keys to version control. Use environment variables or a .env file in production. 