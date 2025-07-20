import { VercelRequest, VercelResponse } from '@vercel/node';

// Simple in-memory storage for Vercel demo (would normally be a database)
// Using global to persist between API calls within the same Vercel instance
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
const addMarket = (market: any) => {
  if (!globalForMarkets.vercelMarkets) globalForMarkets.vercelMarkets = [];
  globalForMarkets.vercelMarkets.push(market);
  return market;
};

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
    const markets = getMarkets();
    console.log('Serving markets:', markets);
    res.json(markets);
  } else if (req.method === 'POST') {
    try {
      console.log('Creating market on Vercel:', req.body);
      
      // Simple validation
      const { question, threshold, minStake, maxStake, duration, postId } = req.body;
      
      if (!question || !postId) {
        return res.status(400).json({ error: 'Question and postId are required' });
      }
      
      // Create new market (in production this would use a database)
      const newMarket = {
        id: Date.now(), // Use timestamp as ID for demo
        postId,
        question,
        threshold: threshold || 0.5,
        minStake: minStake || 100,
        maxStake: maxStake || 10000,
        duration: duration || 60,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + (duration || 60) * 60 * 1000).toISOString(),
        isSettled: false,
        settlementResult: null,
        creatorPubkey: req.body.creatorPubkey || 'anonymous',
        totalYesPool: 0,
        totalNoPool: 0,
        feePercentage: req.body.feePercentage || 5.0,
      };
      
      addMarket(newMarket);
      console.log('Created market:', newMarket);
      console.log('Total markets now:', getMarkets().length);
      res.json(newMarket);
    } catch (error) {
      console.error('Error creating market on Vercel:', error);
      res.status(500).json({ error: 'Failed to create market' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}