import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { nwcService } from "./nwcService";
import { insertPredictionBetSchema, placeBetSchema, insertPredictionMarketSchema, createMarketSchema, type InsertPredictionMarket } from "../shared/schema";
import OpenAI from 'openai';

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize NWC service (optional for development)
  try {
    const nwcConnectionString = process.env.NWC_CONNECTION_STRING;
    await nwcService.initialize(nwcConnectionString);
    console.log('✓ NWC Service initialized successfully');
  } catch (error) {
    console.warn('⚠ NWC Service not available (this is normal in development without connection):');
    console.warn('  Add NWC_CONNECTION_STRING to environment variables to enable Lightning payments');
    console.warn('  App will continue to work with mock payments for development');
  }

  // Set up payment event listeners
  nwcService.addEventListener('payment-handler', (event) => {
    if (event.type === 'payment_received' || event.type === 'invoice_created') {
      handlePaymentReceived(event.payment || event.invoice);
    }
  });

  // Create prediction market
  app.post("/api/markets", async (req, res) => {
    try {
      // Use the client-side schema for validation, then add server fields
      const clientData = createMarketSchema.parse(req.body);
      
      // Add server-side fields that are auto-generated or have defaults
      const marketData: InsertPredictionMarket = {
        ...clientData,
        postId: req.body.postId || `generated_${Date.now()}`,
        creatorPubkey: req.body.creatorPubkey || 'anonymous',
        expiresAt: new Date(Date.now() + clientData.duration * 60 * 1000), // duration in minutes
        feePercentage: clientData.feePercentage || 5.0
      };
      
      const market = await storage.createPredictionMarket(marketData);
      res.json(market);
    } catch (error) {
      console.error('Error creating market:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Get all markets
  app.get("/api/markets", async (req, res) => {
    try {
      const markets = await storage.getAllMarkets();
      res.json(markets);
    } catch (error) {
      console.error('Error fetching markets:', error);
      res.status(500).json({ error: 'Failed to fetch markets' });
    }
  });

  // Get specific market
  app.get("/api/markets/:id", async (req, res) => {
    try {
      const marketId = parseInt(req.params.id);
      const market = await storage.getMarketById(marketId);
      if (!market) {
        return res.status(404).json({ error: 'Market not found' });
      }
      res.json(market);
    } catch (error) {
      console.error('Error fetching market:', error);
      res.status(500).json({ error: 'Failed to fetch market' });
    }
  });

  // Place bet - creates Breez invoice
  app.post("/api/bets", async (req, res) => {
    try {
      console.log('Received bet request:', JSON.stringify(req.body, null, 2));
      const betData = placeBetSchema.parse(req.body);
      const { marketId, position, amount } = betData;
      const userPubkey = req.body.userPubkey || 'anonymous';
      
      console.log('Parsed bet data:', { marketId, position, amount, userPubkey });
      console.log('Looking for market with ID:', marketId, 'type:', typeof marketId);

      // Check if market exists and is still active
      const market = await storage.getMarketById(marketId);
      console.log('Found market:', market ? `ID ${market.id}` : 'null');
      
      if (!market) {
        console.log('Available markets:', await storage.getAllMarkets());
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

      // Create NWC invoice (with fallback for development)
      let invoice;
      try {
        invoice = await nwcService.createInvoice(
          amount,
          `NostrMood bet: ${position} on ${market.question}`
        );
      } catch (error) {
        console.warn('NWC not available, using mock invoice for development');
        // Mock invoice for development when NWC is not available
        invoice = {
          invoiceId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          paymentRequest: `lnbc${amount}u1p...mock_invoice_for_development_testing`,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
          paymentHash: `mock_hash_${Date.now()}`
        };
      }

      // Store bet with invoice details
      const bet = await storage.createBet({
        marketId,
        userPubkey,
        position,
        amount,
        invoiceId: invoice.invoiceId,
        paymentRequest: invoice.paymentRequest,
        paymentHash: '', // Will be populated when payment is received
        expiresAt: invoice.expiresAt
      });

      const response = {
        bet,
        paymentRequest: invoice.paymentRequest,
        invoiceId: invoice.invoiceId,
        expiresAt: invoice.expiresAt
      };
      
      console.log('Sending bet response:', JSON.stringify(response, null, 2));
      res.json(response);
    } catch (error) {
      console.error('Error creating bet:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Get bets for a market
  app.get("/api/markets/:id/bets", async (req, res) => {
    try {
      const marketId = parseInt(req.params.id);
      const bets = await storage.getBetsByMarket(marketId);
      res.json(bets);
    } catch (error) {
      console.error('Error fetching bets:', error);
      res.status(500).json({ error: 'Failed to fetch bets' });
    }
  });

  // Settle market and process payouts
  app.post("/api/markets/:id/settle", async (req, res) => {
    try {
      const marketId = parseInt(req.params.id);
      const { result } = req.body; // true for yes, false for no
      
      const market = await storage.getMarketById(marketId);
      if (!market) {
        return res.status(404).json({ error: 'Market not found' });
      }

      if (market.isSettled) {
        return res.status(400).json({ error: 'Market already settled' });
      }

      // Get all bets for the market before settling
      const bets = await storage.getBetsByMarket(marketId);
      const paidBets = bets.filter(bet => bet.isPaid);
      
      // Calculate winners and payouts
      const winningPosition = result ? 'yes' : 'no';
      const losingPosition = result ? 'no' : 'yes';
      
      const winningBets = paidBets.filter(bet => bet.position === winningPosition);
      const losingBets = paidBets.filter(bet => bet.position === losingPosition);
      
      const totalWinningAmount = winningBets.reduce((sum, bet) => sum + bet.amount, 0);
      const totalLosingAmount = losingBets.reduce((sum, bet) => sum + bet.amount, 0);
      
      // Calculate fee and distribution
      const feeAmount = Math.floor(totalLosingAmount * (market.feePercentage / 100));
      const distributionPool = totalLosingAmount - feeAmount;
      
      let totalPayout = 0;
      const payoutDetails = [];
      
      // Calculate individual payouts for winners
      if (totalWinningAmount > 0 && distributionPool > 0) {
        for (const bet of winningBets) {
          const proportion = bet.amount / totalWinningAmount;
          const winnings = Math.floor(distributionPool * proportion);
          const totalReturn = bet.amount + winnings; // Original bet + winnings
          
          totalPayout += totalReturn;
          payoutDetails.push({
            betId: bet.id,
            userPubkey: bet.userPubkey,
            originalBet: bet.amount,
            winnings: winnings,
            totalReturn: totalReturn
          });
          
          // Update bet with payout info
          await storage.updateBetPayout(bet.id, totalReturn);
        }
      }
      
      // Settle the market
      await storage.settleMarket(marketId, result);
      
      // Process payouts asynchronously (simulate Lightning payouts)
      processMarketPayouts(marketId, result).catch(console.error);

      console.log(`💰 Market ${marketId} settlement complete:`, {
        result: result ? 'YES wins' : 'NO wins',
        winnerCount: winningBets.length,
        totalPayout: totalPayout,
        feeCollected: feeAmount,
        distributionPool: distributionPool
      });

      res.json({ 
        success: true, 
        result,
        winnerCount: winningBets.length,
        totalPayout: totalPayout,
        feeCollected: feeAmount,
        payoutDetails: payoutDetails
      });
    } catch (error) {
      console.error('Error settling market:', error);
      res.status(500).json({ error: 'Failed to settle market' });
    }
  });

  // Get wallet balance
  app.get("/api/wallet/balance", async (req, res) => {
    try {
      const balance = await nwcService.getWalletInfo();
      res.json(balance);
    } catch (error) {
      console.warn('NWC not available, returning mock balance for development');
      // Mock balance for development
      res.json({
        availableBalanceSat: 100000, // 100k sats
        pendingReceiveSat: 0
      });
    }
  });

  // Check bet payment status
  app.get("/api/bets/:id/status", async (req, res) => {
    try {
      const betId = parseInt(req.params.id);
      const bet = await storage.getBetById(betId);
      
      if (!bet) {
        return res.status(404).json({ error: 'Bet not found' });
      }

      // Check if invoice is expired
      if (bet.expiresAt && nwcService.isInvoiceExpired(bet.expiresAt)) {
        await storage.updateBetStatus(betId, { paymentStatus: 'expired' });
        return res.json({ ...bet, paymentStatus: 'expired' });
      }

      res.json(bet);
    } catch (error) {
      console.error('Error checking bet status:', error);
      res.status(500).json({ error: 'Failed to check bet status' });
    }
  });

  // Test API endpoint for connectivity
  app.post("/api/test", async (req, res) => {
    try {
      console.log('Test API called:', req.body);
      res.json({ success: true, message: 'API is working', timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('Error in test API:', error);
      res.status(500).json({ error: 'Test API failed' });
    }
  });

  // Initialize OpenAI client
  let openai: OpenAI | null = null;
  const initializeOpenAI = () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      openai = new OpenAI({ apiKey });
      return true;
    }
    return false;
  };
  initializeOpenAI();

  // ChatGPT API routes
  app.get('/api/chatgpt/check', (req, res) => {
    const hasApiKey = !!process.env.OPENAI_API_KEY && !!openai;
    res.json({ hasApiKey });
  });

  app.post('/api/chatgpt/chat', async (req, res) => {
    try {
      if (!openai) {
        const initialized = initializeOpenAI();
        if (!initialized) {
          return res.status(400).json({ 
            error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.' 
          });
        }
      }

      const { messages, context } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages array is required' });
      }

      // Create system message with context
      const systemMessage = {
        role: 'system' as const,
        content: `You are an AI assistant integrated into NostrMood, a Lightning-powered prediction market app that analyzes sentiment of Nostr posts. 

Key features of NostrMood:
- Analyzes sentiment of Nostr social media posts
- Users can bet on whether posts are positive/negative
- Uses Lightning Network for instant payments
- Threshold for positive sentiment: > 0.6
- Threshold for negative sentiment: ≤ 0.6

Your role:
- Provide insights about sentiment analysis results
- Suggest trading strategies for prediction markets
- Explain sentiment patterns and market psychology
- Help users understand their analysis results
- Be helpful, accurate, and focused on sentiment/trading topics

${context?.analysisResult ? `
Current Analysis Context:
- Post content: "${context.postContent}"
- Sentiment score: ${context.analysisResult.sentiment.comparative}
- Classification: ${context.analysisResult.sentiment.comparative > 0.6 ? 'Positive' : context.analysisResult.sentiment.comparative < -0.6 ? 'Negative' : 'Neutral'}
- Positive words: ${context.analysisResult.sentiment.positive.join(', ') || 'None'}
- Negative words: ${context.analysisResult.sentiment.negative.join(', ') || 'None'}
` : ''}

Keep responses helpful, concise, and relevant to sentiment analysis and prediction markets.`
      };

      const completion = await openai!.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [systemMessage, ...messages],
        max_tokens: 500,
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content;

      if (!response) {
        return res.status(500).json({ error: 'No response from OpenAI' });
      }

      res.json({ response });

    } catch (error) {
      console.error('ChatGPT API error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          return res.status(401).json({ error: 'Invalid OpenAI API key. Please check your key at https://platform.openai.com/api-keys' });
        }
        if (error.message.includes('quota') || error.message.includes('insufficient_quota')) {
          return res.status(429).json({ 
            error: 'OpenAI API quota exceeded. Please check your billing and usage at https://platform.openai.com/usage',
            code: 'quota_exceeded',
            suggestion: 'Add credits to your OpenAI account or wait for your quota to reset.'
          });
        }
        if (error.message.includes('rate limit')) {
          return res.status(429).json({ error: 'Rate limit exceeded. Please try again in a few minutes.' });
        }
      }

      res.status(500).json({ 
        error: 'Failed to get response from ChatGPT. Please try again.' 
      });
    }
  });

  // Add endpoint to check for expired markets
  app.get("/api/markets/expired", async (req, res) => {
    try {
      const markets = await storage.getAllMarkets();
      const now = new Date();
      
      const expiredMarkets = markets.filter(market => 
        !market.isSettled && new Date(market.expiresAt) <= now
      );
      
      res.json(expiredMarkets);
    } catch (error) {
      console.error('Error fetching expired markets:', error);
      res.status(500).json({ error: 'Failed to fetch expired markets' });
    }
  });

  // Auto-settle endpoint (can be called by cron or manually)
  app.post("/api/markets/auto-settle", async (req, res) => {
    try {
      const markets = await storage.getAllMarkets();
      const now = new Date();
      let settledCount = 0;
      const results = [];
      
      for (const market of markets) {
        if (!market.isSettled && new Date(market.expiresAt) <= now) {
          try {
            console.log(`⏰ Auto-settling expired market ${market.id}: "${market.question}"`);
            
            // Re-analyze sentiment to determine winner
            const analysis = new (require('sentiment'))().analyze(market.postContent);
            const sentimentScore = analysis.comparative;
            const result = sentimentScore > 0.6; // Use same threshold as original analysis
            
            // Get bets and calculate payouts
            const bets = await storage.getBetsByMarket(market.id);
            const paidBets = bets.filter(bet => bet.isPaid);
            
            const winningPosition = result ? 'yes' : 'no';
            const winningBets = paidBets.filter(bet => bet.position === winningPosition);
            const losingBets = paidBets.filter(bet => bet.position !== winningPosition);
            
            const totalWinningAmount = winningBets.reduce((sum, bet) => sum + bet.amount, 0);
            const totalLosingAmount = losingBets.reduce((sum, bet) => sum + bet.amount, 0);
            
            const feeAmount = Math.floor(totalLosingAmount * (market.feePercentage / 100));
            const distributionPool = totalLosingAmount - feeAmount;
            
            let totalPayout = 0;
            
            // Calculate and update payouts for winners
            if (totalWinningAmount > 0 && distributionPool > 0) {
              for (const bet of winningBets) {
                const proportion = bet.amount / totalWinningAmount;
                const winnings = Math.floor(distributionPool * proportion);
                const totalReturn = bet.amount + winnings;
                
                totalPayout += totalReturn;
                await storage.updateBetPayout(bet.id, totalReturn);
              }
            }
            
            // Settle the market
            await storage.settleMarket(market.id, result);
            
            const settlementResult = {
              marketId: market.id,
              question: market.question,
              result: result ? 'YES (Positive)' : 'NO (Negative/Neutral)',
              sentimentScore: sentimentScore.toFixed(3),
              winnerCount: winningBets.length,
              totalPayout: totalPayout,
              feeCollected: feeAmount
            };
            
            results.push(settlementResult);
            settledCount++;
            
            console.log(`✅ Auto-settled market ${market.id}:`, settlementResult);
            
          } catch (error) {
            console.error(`❌ Failed to auto-settle market ${market.id}:`, error);
            results.push({
              marketId: market.id,
              error: error.message
            });
          }
        }
      }
      
      console.log(`🎯 Auto-settlement complete: ${settledCount} markets processed`);
      
      res.json({
        success: true,
        settledCount: settledCount,
        results: results
      });
      
    } catch (error) {
      console.error('Error in auto-settlement:', error);
      res.status(500).json({ error: 'Auto-settlement failed' });
    }
  });

  const httpServer = createServer(app);
  
  // Start automatic settlement checking every 60 seconds
  setInterval(async () => {
    try {
      const response = await fetch('http://localhost:5000/api/markets/auto-settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.settledCount > 0) {
          console.log(`🔄 Automatic settlement: ${data.settledCount} markets settled`);
        }
      }
    } catch (error) {
      // Silently ignore errors during automatic settlement checks
    }
  }, 60000); // Check every 60 seconds
  
  return httpServer;
}

// Handle payment received events from Breez
async function handlePaymentReceived(payment: any) {
  try {
    console.log('Payment received:', payment);
    
    // Find the bet by invoice ID
    const bet = await storage.getBetByInvoiceId(payment.invoiceId);
    if (!bet) {
      console.error('No bet found for invoice:', payment.invoiceId);
      return;
    }

    // Update bet as paid
    await storage.updateBetPayment(bet.id, {
      isPaid: true,
      paymentHash: payment.paymentHash,
    });

    // Update market pools
    await storage.updateMarketPool(bet.marketId, bet.position, bet.amount);

    console.log(`Bet ${bet.id} payment confirmed for ${bet.amount} sats`);
  } catch (error) {
    console.error('Error handling payment received:', error);
  }
}

// Process payouts for settled market
async function processMarketPayouts(marketId: number, winningPosition: boolean) {
  try {
    const market = await storage.getMarketById(marketId);
    const bets = await storage.getBetsByMarket(marketId);
    const paidBets = bets.filter(bet => bet.isPaid);
    
    if (paidBets.length === 0) {
      console.log('No paid bets to process for market:', marketId);
      return;
    }

    const winningBets = paidBets.filter(bet => 
      (winningPosition && bet.position === 'yes') || 
      (!winningPosition && bet.position === 'no')
    );

    const totalPool = market.totalYesPool + market.totalNoPool;
    const fee = Math.floor(totalPool * (market.feePercentage / 100));
    const payoutPool = totalPool - fee;

    if (winningBets.length === 0) {
      // No winners - refund all bets
      console.log('No winners - processing refunds');
      for (const bet of paidBets) {
        await processRefund(bet);
      }
      return;
    }

    // Calculate and process payouts
    const winningPool = winningPosition ? market.totalYesPool : market.totalNoPool;
    
    for (const bet of winningBets) {
      const payout = Math.floor((bet.amount / winningPool) * payoutPool);
      await processPayout(bet, payout);
    }

    console.log(`Processed payouts for market ${marketId}`);
  } catch (error) {
    console.error('Error processing market payouts:', error);
  }
}

async function processPayout(bet: any, payoutAmount: number) {
  try {
    if (!bet.payoutInvoice) {
      console.log(`No payout invoice provided for bet ${bet.id}`);
      await storage.updateBetPayout(bet.id, {
        payout: payoutAmount,
        payoutStatus: 'awaiting_invoice'
      });
      return;
    }

    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        const result = await breezService.sendPayout(bet.payoutInvoice);
        
        await storage.updateBetPayout(bet.id, {
          payout: payoutAmount,
          payoutTxId: result.paymentId,
          payoutStatus: 'completed',
          isSettled: true
        });

        console.log(`Payout sent for bet ${bet.id}: ${payoutAmount} sats`);
        break;
      } catch (error) {
        attempt++;
        console.error(`Payout attempt ${attempt} failed for bet ${bet.id}:`, error);
        
        if (attempt >= maxRetries) {
          await storage.updateBetPayout(bet.id, {
            payout: payoutAmount,
            payoutStatus: 'failed',
            payoutError: error.message,
            payoutRetries: attempt
          });
        } else {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
  } catch (error) {
    console.error(`Error processing payout for bet ${bet.id}:`, error);
    await storage.updateBetPayout(bet.id, {
      payoutStatus: 'failed',
      payoutError: error.message
    });
  }
}

async function processRefund(bet: any) {
  // Similar to processPayout but refunds the original bet amount
  await processPayout(bet, bet.amount);
}
