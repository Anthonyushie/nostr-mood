import { VercelRequest, VercelResponse } from '@vercel/node';
import { placeBetSchema } from '../shared/schema';

// In-memory storage for Vercel (this would normally be a database)
let markets = [
  {
    id: 1,
    postId: 'test_post_123',
    question: 'Will Bitcoin reach $100k by end of 2025?',
    threshold: 0.5,
    minStake: 100,
    maxStake: 10000,
    duration: 60,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    isSettled: false,
    settlementResult: null,
    creatorPubkey: 'test_creator',
    totalYesPool: 0,
    totalNoPool: 0,
    feePercentage: 5.0,
  }
];

let bets = [];
let currentBetId = 1;

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const betData = placeBetSchema.parse(req.body);
      const { marketId, position, amount } = betData;
      const userPubkey = req.body.userPubkey || 'anonymous';

      // Check if market exists and is still active
      const market = markets.find(m => m.id === marketId);
      if (!market) {
        return res.status(404).json({ error: 'Market not found' });
      }
      
      if (market.isSettled || new Date() > market.expiresAt) {
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

      // Store bet with invoice details
      const bet = {
        id: currentBetId++,
        marketId,
        userPubkey,
        position,
        amount,
        invoiceId: invoice.invoiceId,
        paymentRequest: invoice.paymentRequest,
        paymentHash: '',
        expiresAt: invoice.expiresAt,
        createdAt: new Date(),
        isPaid: false,
        isSettled: false,
        payout: 0,
        payoutStatus: 'pending',
        payoutRetries: 0,
        payoutError: null,
        payoutTxId: null,
        payoutInvoice: null,
      };

      bets.push(bet);

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