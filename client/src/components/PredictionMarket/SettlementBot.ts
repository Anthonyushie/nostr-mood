import { SimplePool, Event } from 'nostr-tools';
import Sentiment from 'sentiment';
import { PredictionMarket, PredictionBet } from '@shared/schema';

export interface SettlementResult {
  marketId: number;
  currentSentiment: number;
  threshold: number;
  result: boolean;
  winningPosition: 'yes' | 'no';
  payouts: Array<{
    betId: number;
    userPubkey: string;
    payout: number;
  }>;
  totalFeesCollected: number;
}

class SettlementBot {
  private relays = [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.nostr.band',
    'wss://nostr-pub.wellorder.net',
    'wss://relay.current.fyi'
  ];

  private sentiment = new Sentiment();

  /**
   * Re-analyzes the sentiment of a post to determine settlement result
   */
  async analyzeSentimentForSettlement(postId: string): Promise<number> {
    try {
      const pool = new SimplePool();
      
      const events = await pool.querySync(this.relays, {
        ids: [postId],
        kinds: [1] // Text notes
      });

      if (events.length === 0) {
        throw new Error('Post not found for settlement analysis');
      }

      const event = events[0] as Event;
      const sentimentResult = this.sentiment.analyze(event.content);
      
      return sentimentResult.comparative;
    } catch (error) {
      console.error('Error analyzing sentiment for settlement:', error);
      throw error;
    }
  }

  /**
   * Calculates payouts for all bets in a market based on the settlement result
   */
  calculatePayouts(
    market: PredictionMarket, 
    bets: PredictionBet[], 
    settlementResult: boolean
  ): SettlementResult['payouts'] {
    const winningPosition = settlementResult ? 'yes' : 'no';
    const losingPosition = settlementResult ? 'no' : 'yes';
    
    const winningBets = bets.filter(bet => bet.position === winningPosition && bet.isPaid);
    const losingBets = bets.filter(bet => bet.position === losingPosition && bet.isPaid);
    
    const totalWinningAmount = winningBets.reduce((sum, bet) => sum + bet.amount, 0);
    const totalLosingAmount = losingBets.reduce((sum, bet) => sum + bet.amount, 0);
    
    // Calculate fee
    const feeAmount = Math.floor(totalLosingAmount * (market.feePercentage / 100));
    const distributionPool = totalLosingAmount - feeAmount;
    
    const payouts: SettlementResult['payouts'] = [];
    
    if (totalWinningAmount === 0) {
      // No winners, refund all bets
      bets.forEach(bet => {
        if (bet.isPaid) {
          payouts.push({
            betId: bet.id,
            userPubkey: bet.userPubkey,
            payout: bet.amount, // Full refund
          });
        }
      });
    } else {
      // Distribute winnings proportionally
      winningBets.forEach(bet => {
        const proportion = bet.amount / totalWinningAmount;
        const winnings = Math.floor(distributionPool * proportion);
        const totalPayout = bet.amount + winnings; // Original stake + winnings
        
        payouts.push({
          betId: bet.id,
          userPubkey: bet.userPubkey,
          payout: totalPayout,
        });
      });
      
      // Losing bets get no payout (they lose their stake)
      losingBets.forEach(bet => {
        payouts.push({
          betId: bet.id,
          userPubkey: bet.userPubkey,
          payout: 0,
        });
      });
    }
    
    return payouts;
  }

  /**
   * Settles a prediction market
   */
  async settleMarket(marketId: number): Promise<SettlementResult> {
    try {
      // Load market and bets from storage
      const markets: PredictionMarket[] = JSON.parse(localStorage.getItem('predictionMarkets') || '[]');
      const bets: PredictionBet[] = JSON.parse(localStorage.getItem('predictionBets') || '[]');
      
      const market = markets.find(m => m.id === marketId);
      if (!market) {
        throw new Error(`Market ${marketId} not found`);
      }
      
      if (market.isSettled) {
        throw new Error(`Market ${marketId} is already settled`);
      }
      
      // Check if market has expired
      const now = new Date();
      const expiryTime = new Date(market.expiresAt);
      if (now < expiryTime) {
        throw new Error(`Market ${marketId} has not expired yet`);
      }
      
      // Re-analyze sentiment
      const currentSentiment = await this.analyzeSentimentForSettlement(market.postId);
      const settlementResult = currentSentiment >= market.threshold;
      
      // Get all bets for this market
      const marketBets = bets.filter(bet => bet.marketId === marketId);
      
      // Calculate payouts
      const payouts = this.calculatePayouts(market, marketBets, settlementResult);
      
      // Update market as settled
      const marketIndex = markets.findIndex(m => m.id === marketId);
      if (marketIndex !== -1) {
        markets[marketIndex].isSettled = true;
        markets[marketIndex].settlementResult = settlementResult;
        localStorage.setItem('predictionMarkets', JSON.stringify(markets));
      }
      
      // Update bets with payouts
      payouts.forEach(payout => {
        const betIndex = bets.findIndex(bet => bet.id === payout.betId);
        if (betIndex !== -1) {
          bets[betIndex].isSettled = true;
          bets[betIndex].payout = payout.payout;
        }
      });
      localStorage.setItem('predictionBets', JSON.stringify(bets));
      
      // Calculate total fees collected
      const totalLosingAmount = marketBets
        .filter(bet => bet.position !== (settlementResult ? 'yes' : 'no') && bet.isPaid)
        .reduce((sum, bet) => sum + bet.amount, 0);
      const totalFeesCollected = Math.floor(totalLosingAmount * (market.feePercentage / 100));
      
      const result: SettlementResult = {
        marketId,
        currentSentiment,
        threshold: market.threshold,
        result: settlementResult,
        winningPosition: settlementResult ? 'yes' : 'no',
        payouts,
        totalFeesCollected,
      };
      
      console.log('Market settled:', result);
      return result;
      
    } catch (error) {
      console.error('Error settling market:', error);
      throw error;
    }
  }

  /**
   * Checks for expired markets and automatically settles them
   */
  async checkAndSettleExpiredMarkets(): Promise<SettlementResult[]> {
    try {
      const markets: PredictionMarket[] = JSON.parse(localStorage.getItem('predictionMarkets') || '[]');
      const now = new Date();
      
      const expiredMarkets = markets.filter(market => 
        !market.isSettled && new Date(market.expiresAt) <= now
      );
      
      const settlementResults: SettlementResult[] = [];
      
      for (const market of expiredMarkets) {
        try {
          const result = await this.settleMarket(market.id);
          settlementResults.push(result);
        } catch (error) {
          console.error(`Failed to settle market ${market.id}:`, error);
        }
      }
      
      return settlementResults;
    } catch (error) {
      console.error('Error checking for expired markets:', error);
      return [];
    }
  }

  /**
   * Starts automatic settlement monitoring
   */
  startAutomaticSettlement(intervalMs: number = 30000): () => void {
    const interval = setInterval(async () => {
      try {
        await this.checkAndSettleExpiredMarkets();
      } catch (error) {
        console.error('Error in automatic settlement:', error);
      }
    }, intervalMs);

    // Return cleanup function
    return () => clearInterval(interval);
  }
}

export default SettlementBot;