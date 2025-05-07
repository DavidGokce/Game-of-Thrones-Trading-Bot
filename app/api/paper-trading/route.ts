import { NextResponse } from 'next/server';
import PaperTrading from '../../../lib/paper-trading';

const paperTrading = PaperTrading.getInstance();

export async function GET() {
  await paperTrading.updatePrices();
  return NextResponse.json({
    balance: paperTrading.getBalance(),
    positions: paperTrading.getPositions(),
    transactions: paperTrading.getTransactions(),
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action, symbol, quantity } = body;

  if (!action || !symbol || !quantity) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  let success = false;
  if (action === 'buy') {
    success = await paperTrading.buy(symbol, quantity);
  } else if (action === 'sell') {
    success = await paperTrading.sell(symbol, quantity);
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  if (!success) {
    return NextResponse.json({ error: 'Trade failed' }, { status: 400 });
  }

  return NextResponse.json({
    balance: paperTrading.getBalance(),
    positions: paperTrading.getPositions(),
    transactions: paperTrading.getTransactions(),
  });
} 