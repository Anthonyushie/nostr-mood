import { VercelRequest, VercelResponse } from '@vercel/node';

// Inline schema validation for Vercel deployment
const placeBetSchema = {
  parse: (data: any) => {
    if (!data.marketId || typeof data.marketId !== 'number') {
      throw new Error('Invalid marketId');
    }
    if (!data.position || !['yes', 'no'].includes(data.position)) {
      throw new Error('Invalid position');
    }
    if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) {
      throw new Error('Invalid amount');
    }
    return data;
  }
};

// Use same global storage as markets.ts for consistency
const globalForMarkets = globalThis as unknown as { 
  vercelMarkets: any[] | undefined 
};

if (!globalForMarkets.vercelMarkets) {
  globalForMarkets.vercelMarkets = [
    {
      id: 1,
      postId: 'test_post_123',
      question: 'Will Bitcoin reach $100k by end of 2025?',
      threshold: 0.5,
      minStake: 100,
      maxStake: 10000,
      duration: 60,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      isSettled: false,
      settlementResult: null,
      creatorPubkey: 'test_creator',
      totalYesPool: 0,
      totalNoPool: 0,
      feePercentage: 5.0,
    }
  ];
}

const getMarkets = () => globalForMarkets.vercelMarkets || [];

// Generate a random bet ID for each request (simulating database auto-increment)
const generateBetId = () => Math.floor(Math.random() * 1000000);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    // Handle GET requests - return some example bets for demonstration
    try {
      const exampleBets = [
        {
          id: 1,
          marketId: 1,
          userPubkey: 'demo_user',
          position: 'yes',
          amount: 1000,
          invoiceId: 'demo_invoice_1',
          paymentRequest: 'lnbc1000u1p...demo_payment_request',
          paymentHash: '',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          isPaid: true,
          isSettled: false,
          payout: 0,
          payoutStatus: 'pending',
          payoutRetries: 0,
          payoutError: null,
          payoutTxId: null,
          payoutInvoice: null,
        }
      ];
      
      res.json(exampleBets);
    } catch (error) {
      console.error('Error fetching bets:', error);
      res.status(500).json({ error: 'Failed to fetch bets' });
    }
  } else if (req.method === 'POST') {
    try {
      console.log('=== BETS API REQUEST ===');
      console.log('Method:', req.method);
      console.log('Headers:', req.headers);
      console.log('Body:', req.body);
      console.log('========================');
      
      const betData = placeBetSchema.parse(req.body);
      const { marketId, position, amount } = betData;
      const userPubkey = req.body.userPubkey || 'anonymous';

      // Check if market exists and is still active
      const markets = getMarkets();
      const market = markets.find(m => m.id === marketId);
      
      console.log('Available markets:', markets.map(m => ({ id: m.id, question: m.question })));
      console.log('Looking for market ID:', marketId);
      
      if (!market) {
        return res.status(404).json({ error: 'Market not found' });
      }
      
      if (market.isSettled || new Date() > new Date(market.expiresAt)) {
        return res.status(400).json({ error: 'Market is closed' });
      }

      if (amount < market.minStake || amount > market.maxStake) {
        return res.status(400).json({ 
          error: `Bet amount must be between ${market.minStake} and ${market.maxStake} sats` 
        });
      }

      // Create mock invoice for Vercel deployment
      const invoice = {
        invoiceId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        paymentRequest: `lnbc${amount}u1p...mock_invoice_for_vercel_deployment`,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
      };

      // Create bet with invoice details (mock storage for Vercel)
      const bet = {
        id: generateBetId(),
        marketId,
        userPubkey,
        position,
        amount,
        invoiceId: invoice.invoiceId,
        paymentRequest: invoice.paymentRequest,
        paymentHash: '',
        expiresAt: invoice.expiresAt,
        createdAt: new Date().toISOString(),
        isPaid: false,
        isSettled: false,
        payout: 0,
        payoutStatus: 'pending',
        payoutRetries: 0,
        payoutError: null,
        payoutTxId: null,
        payoutInvoice: null,
      };

      console.log('Created bet:', bet);

      const response = {
        bet,
        paymentRequest: invoice.paymentRequest,
        invoiceId: invoice.invoiceId,
        expiresAt: invoice.expiresAt
      };
      
      res.json(response);
    } catch (error) {
      console.error('Error creating bet:', error);
      res.status(400).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}