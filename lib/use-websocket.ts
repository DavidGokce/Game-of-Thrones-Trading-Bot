"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { WebSocketPriceMessage } from "./api-types"

interface UseWebSocketOptions {
  onMessage?: (data: WebSocketPriceMessage) => void
  onOpen?: () => void
  onClose?: () => void
  onError?: (error: Event) => void
}

// Modify the useWebSocket hook to handle connection failures gracefully
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Event | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [mockMode, setMockMode] = useState(false)
  const mockIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Function to simulate WebSocket messages with mock data
  const startMockUpdates = useCallback(() => {
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current)
    }

    // Send mock price updates every 3 seconds
    mockIntervalRef.current = setInterval(() => {
      if (options.onMessage) {
        const assets = ["bitcoin", "ethereum", "solana", "cardano", "polkadot"]
        const asset = assets[Math.floor(Math.random() * assets.length)]

        // Get a random price change between -1% and +1%
        const basePrice =
          {
            bitcoin: 68423.51,
            ethereum: 3521.78,
            solana: 142.65,
            cardano: 0.58,
            polkadot: 7.82,
          }[asset] || 100

        const priceChange = (Math.random() * 0.02 - 0.01) * basePrice
        const newPrice = basePrice + priceChange

        const mockMessage: WebSocketPriceMessage = {
          exchange: "mock",
          base: asset,
          quote: "usd",
          direction: "buy",
          price: newPrice.toString(),
          volume: "0",
          timestamp: Date.now(),
        }

        options.onMessage(mockMessage)
      }
    }, 3000)

    return () => {
      if (mockIntervalRef.current) {
        clearInterval(mockIntervalRef.current)
      }
    }
  }, [options])

  useEffect(() => {
    let connectionTimeout: NodeJS.Timeout

    const connectWebSocket = () => {
      try {
        // CoinCap WebSocket URL
        const wsUrl = "wss://ws.coincap.io/prices?assets=bitcoin,ethereum,solana,cardano,polkadot"

        // Set a timeout to detect connection failures
        connectionTimeout = setTimeout(() => {
          console.log("WebSocket connection timeout, switching to mock mode")
          setMockMode(true)
          startMockUpdates()
        }, 5000)

        // Create WebSocket connection
        const socket = new WebSocket(wsUrl)
        socketRef.current = socket

        // Connection opened
        socket.addEventListener("open", () => {
          clearTimeout(connectionTimeout)
          setIsConnected(true)
          setError(null)
          setMockMode(false)
          if (options.onOpen) options.onOpen()
        })

        // Listen for messages
        socket.addEventListener("message", (event) => {
          try {
            const data = JSON.parse(event.data)
            if (options.onMessage) {
              // Transform the data to match our expected format
              const messages: WebSocketPriceMessage[] = Object.entries(data).map(([asset, price]) => ({
                exchange: "coincap",
                base: asset,
                quote: "usd",
                direction: "buy",
                price: price as string,
                volume: "0",
                timestamp: Date.now(),
              }))

              // Call onMessage for each asset update
              messages.forEach((msg) => options.onMessage?.(msg))
            }
          } catch (e) {
            console.error("Error parsing WebSocket message:", e)
          }
        })

        // Connection closed
        socket.addEventListener("close", () => {
          clearTimeout(connectionTimeout)
          setIsConnected(false)
          if (options.onClose) options.onClose()

          // Try to reconnect after a delay
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
          }

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("Attempting to reconnect WebSocket...")
            connectWebSocket()
          }, 5000)
        })

        // Connection error
        socket.addEventListener("error", (event) => {
          clearTimeout(connectionTimeout)
          setError(event)
          setIsConnected(false)
          if (options.onError) options.onError(event)

          console.log("WebSocket error, switching to mock mode")
          setMockMode(true)
          startMockUpdates()
        })
      } catch (err) {
        console.error("Failed to create WebSocket:", err)
        setMockMode(true)
        startMockUpdates()
      }
    }

    // Start in mock mode immediately to ensure we have data
    setMockMode(true)
    startMockUpdates()

    // Also try to connect to the real WebSocket
    connectWebSocket()

    // Clean up on unmount
    return () => {
      clearTimeout(connectionTimeout)
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
  }, [options, startMockUpdates])

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
