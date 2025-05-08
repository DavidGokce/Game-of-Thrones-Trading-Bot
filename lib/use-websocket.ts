"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { WebSocketPriceMessage } from "./api-types"

export interface UseWebSocketOptions {
  onOpen?: () => void;
  onMessage?: (message: WebSocketPriceMessage) => void;
  onError?: (error: Event | Error) => void;
  onClose?: () => void;
}

// Modify the useWebSocket hook to handle connection failures gracefully
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Event | Error | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [mockMode, setMockMode] = useState(false)
  const mockIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const maxReconnectAttempts = 5
  const reconnectAttempts = useRef(0)
  const backoffTime = useRef(1000) // Start with 1 second

  // Function to simulate WebSocket messages with mock data
  const startMockUpdates = useCallback(() => {
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current)
    }

    // Send mock price updates every second
    mockIntervalRef.current = setInterval(() => {
      const onMessage = options.onMessage
      if (onMessage) {
        const assets = ["bitcoin", "ethereum", "solana", "cardano", "polkadot"]
        
        // Update all assets each time to ensure consistent updates
        assets.forEach(asset => {
          const basePrice =
            {
              bitcoin: 68423.51,
              ethereum: 3521.78,
              solana: 142.65,
              cardano: 0.58,
              polkadot: 7.82,
            }[asset] || 100

          // Get a random price change between -0.5% and +0.5%
          const priceChange = (Math.random() * 0.01 - 0.005) * basePrice
          const newPrice = basePrice + priceChange

          const mockMessage: WebSocketPriceMessage = {
            exchange: "mock",
            base: asset,
            quote: "usd",
            direction: "buy",
            price: newPrice.toString(),
            volume: Math.floor(Math.random() * 1000000).toString(),
            timestamp: Date.now(),
          }

          onMessage(mockMessage)
        })
      }
    }, 1000) // Update every second

    return () => {
      if (mockIntervalRef.current) {
        clearInterval(mockIntervalRef.current)
      }
    }
  }, [options])

  // Function to validate WebSocket URL
  const validateUrl = (url: string): boolean => {
    try {
      const wsUrl = new URL(url)
      return wsUrl.protocol === 'wss:' || wsUrl.protocol === 'ws:'
    } catch {
      return false
    }
  }

  // Enhanced WebSocket connection with security checks
  const connectWebSocket = useCallback(() => {
    try {
      const wsUrl = "wss://ws.coincap.io/prices?assets=bitcoin,ethereum,solana,cardano,polkadot"
      
      if (!validateUrl(wsUrl)) {
        throw new Error("Invalid WebSocket URL")
      }

      // Set a timeout to detect connection failures
      const connectionTimeout = setTimeout(() => {
        console.log("WebSocket connection timeout, switching to mock mode")
        setMockMode(true)
        startMockUpdates()
      }, 10000) // Increase timeout to 10 seconds

      // Create WebSocket connection with proper error handling
      const socket = new WebSocket(wsUrl)
      socketRef.current = socket

      socket.addEventListener("open", () => {
        clearTimeout(connectionTimeout)
        setIsConnected(true)
        setError(null)
        setMockMode(false)
        reconnectAttempts.current = 0
        backoffTime.current = 1000
        if (options.onOpen) options.onOpen()
      })

      socket.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(event.data)
          if (options.onMessage) {
            // Transform and validate the data to match our expected format
            const messages: WebSocketPriceMessage[] = Object.entries(data)
              .filter(([asset, price]) => {
                // Validate price format and value
                const numPrice = typeof price === 'string' ? parseFloat(price) : (typeof price === 'number' ? price as number : NaN);
                return !isNaN(numPrice) && numPrice > 0 && asset.length > 0;
              })
              .map(([asset, price]) => {
                const numPrice = typeof price === 'string' ? parseFloat(price) : price as number;
                return {
                  exchange: "coincap",
                  base: asset,
                  quote: "usd",
                  direction: "buy",
                  price: numPrice.toString(),
                  volume: "0",
                  timestamp: Date.now(),
                };
              });

            // Only emit valid messages
            if (messages.length > 0) {
              messages.forEach((msg) => options.onMessage?.(msg));
            }
          }
        } catch (e) {
          console.error("Error parsing WebSocket message:", e)
          setError(e as Error)
        }
      })

      socket.addEventListener("error", (event) => {
        console.error("WebSocket error:", event)
        setError(event)
        setIsConnected(false)
        
        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++
            backoffTime.current *= 2 // Exponential backoff
            connectWebSocket()
          }, backoffTime.current)
        } else {
          setMockMode(true)
          startMockUpdates()
        }
      })

      socket.addEventListener("close", () => {
        setIsConnected(false)
        clearTimeout(connectionTimeout)
        
        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++
            backoffTime.current *= 2 // Exponential backoff
            connectWebSocket()
          }, backoffTime.current)
        } else {
          setMockMode(true)
          startMockUpdates()
        }
      })

    } catch (e) {
      console.error("Error creating WebSocket connection:", e)
      setError(e as Error)
      setMockMode(true)
      startMockUpdates()
    }
  }, [options])

  useEffect(() => {
    // Start in mock mode immediately to ensure we have data
    setMockMode(true)
    startMockUpdates()

    // Also try to connect to the real WebSocket
    connectWebSocket()

    // Clean up on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (mockIntervalRef.current) {
        clearInterval(mockIntervalRef.current)
      }
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close()
      }
    }
  }, [options, startMockUpdates, connectWebSocket])

  // Function to manually close the connection
  const disconnect = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.close()
    }
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current)
    }
  }

  return { isConnected, error, disconnect, mockMode }
}
