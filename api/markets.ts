import { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory storage for Vercel (this would normally be a database)
const markets = [
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    res.json(markets);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}