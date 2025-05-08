'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  Title,
  Text,
  Tab,
  TabList,
  TabGroup,
  TabPanel,
  TabPanels,
  Grid,
  Badge,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Button,
} from '@tremor/react';
import { TransformedAsset } from '@/lib/api-types';
import { Position, Transaction } from '@/lib/paper-trading';
import { fetchTopAssets } from '@/lib/api';
import { TradingBot, TradeUpdate } from '@/lib/trading-bot';

export default function Home() {
  const [assets, setAssets] = useState<TransformedAsset[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [botRunning, setBotRunning] = useState(false);
  const [tradingBot, setTradingBot] = useState<TradingBot | null>(null);
  const [updates, setUpdates] = useState<TradeUpdate[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch market data
        const marketData = await fetchTopAssets(8);
        setAssets(marketData);

        // Fetch trading positions and history
        const response = await fetch('/api/paper-trading');
        if (!response.ok) {
          throw new Error(`Failed to fetch trading data: ${response.status}`);
        }
        const data = await response.json();
        console.log('Trading data:', data); // Debug log
        setPositions(data.positions || []);
        setTransactions(data.transactions || []);
        
        setError(null);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to fetch data: ' + (error instanceof Error ? error.message : String(error)));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 1000); // Update every second
    return () => clearInterval(interval);
  }, []);

  // Initialize trading bot
  useEffect(() => {
    if (assets.length > 0 && !tradingBot) {
      const symbols = assets.map(asset => asset.symbol);
      const bot = new TradingBot(
        symbols,
        60000, // Check every minute
        (update) => {
          console.log('Trade update:', update);
          setUpdates(prev => [...prev, update].slice(-10)); // Keep last 10 updates
        }
      );
      setTradingBot(bot);
    }
  }, [assets, tradingBot]);

  const toggleBot = async () => {
    if (!tradingBot) return;
    
    try {
      if (botRunning) {
        tradingBot.stop();
        setBotRunning(false);
      } else {
        await tradingBot.start();
        setBotRunning(true);
      }
    } catch (error) {
      console.error('Error toggling bot:', error);
      setError('Failed to toggle bot: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Title>Crypto Trading Bot Dashboard</Title>
          <Text>Real-time cryptocurrency trading signals and positions</Text>
        </div>
        <Button
          onClick={toggleBot}
          color={botRunning ? "red" : "emerald"}
          disabled={!tradingBot}
        >
          {botRunning ? "Stop Bot" : "Start Bot"}
        </Button>
      </div>

      <TabGroup className="mt-6">
        <TabList>
          <Tab>Market Overview</Tab>
          <Tab>Trading History</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Grid numItems={1} numItemsSm={2} numItemsLg={3} className="gap-6 mt-6">
              {assets.map((asset) => {
                const position = positions.find(p => p.symbol.toLowerCase() === asset.symbol.toLowerCase());
                return (
                  <Card key={asset.symbol}>
                    <div className="flex items-center justify-between">
                      <Title>{asset.name}</Title>
                      <Badge color={position ? 'emerald' : 'gray'}>
                        {position ? `Position: ${position.quantity}` : 'No Position'}
                      </Badge>
                    </div>
                    <Text className="mt-4">
                      Price: ${asset.price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                    <Text>24h Change: {asset.change.toFixed(2)}%</Text>
                    <Text>Volume: {asset.volume}</Text>
                    {position && (
                      <>
                        <Text>
                          Entry Price: ${position.entryPrice.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </Text>
                        <Text color={position.pnl >= 0 ? 'emerald' : 'rose'}>
                          P/L: ${position.pnl.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </Text>
                      </>
                    )}
                  </Card>
                );
              })}
            </Grid>
          </TabPanel>
          <TabPanel>
            <Card>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Symbol</TableHeaderCell>
                    <TableHeaderCell>Type</TableHeaderCell>
                    <TableHeaderCell>Quantity</TableHeaderCell>
                    <TableHeaderCell>Price</TableHeaderCell>
                    <TableHeaderCell>Reason</TableHeaderCell>
                    <TableHeaderCell>Time</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((trade, index) => (
                    <TableRow key={index}>
                      <TableCell>{trade.symbol}</TableCell>
                      <TableCell>
                        <Badge color={trade.type === 'buy' ? 'emerald' : 'rose'}>
                          {trade.type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{trade.quantity}</TableCell>
                      <TableCell>
                        ${trade.price.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>{trade.reason || 'market'}</TableCell>
                      <TableCell>
                        {new Date(trade.timestamp).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabPanel>
        </TabPanels>
      </TabGroup>

      {loading && <Text>Loading...</Text>}
      {error && <Text color="red">{error}</Text>}

      {updates.length > 0 && (
        <Card className="mt-6">
          <Title>Recent Bot Updates</Title>
          <div className="space-y-2 mt-4">
            {updates.map((update, index) => (
              <Text key={index} color={update.action === 'error' ? 'red' : undefined}>
                {update.symbol}: {update.action.toUpperCase()} - {update.reason}
              </Text>
            ))}
          </div>
        </Card>
      )}
    </main>
  );
}
