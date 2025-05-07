// Environment variables helper

// Function to get environment variables with fallbacks
export function getEnv(key: string, defaultValue = ""): string {
  if (typeof process !== "undefined" && process.env) {
    return process.env[key] || defaultValue
  }
  return defaultValue
}

// Function to check if we're in a development environment
export function isDev(): boolean {
  return process.env.NODE_ENV === "development"
}

// Binance API credentials
export const BINANCE_API_KEY = getEnv("BINANCE_API_KEY", "")
export const BINANCE_API_SECRET = getEnv("BINANCE_API_SECRET", "")

// Check if Binance API is configured
export function isBinanceConfigured(): boolean {
  return Boolean(BINANCE_API_KEY && BINANCE_API_SECRET)
}
