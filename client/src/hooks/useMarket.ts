import { useState, useEffect, useCallback } from 'react';
import { PredictionMarket, PredictionBet } from '@shared/schema';
import SettlementBot, { SettlementResult } from '@/components/PredictionMarket/SettlementBot';
import { useToast } from '@/hooks/use-toast';

export interface MarketData {
  markets: PredictionMarket[];
  bets: PredictionBet[];
  userBets: PredictionBet[];
  isLoading: boolean;
  error: string | null;
}

export interface MarketActions {
  refreshMarkets: () => void;
  getMarketsByPostId: (postId: string) => PredictionMarket[];
  getBetsByMarketId: (marketId: number) => PredictionBet[];
  getUserBetsByMarketId: (marketId: number, userPubkey: string) => PredictionBet[];
  onMarketCreated: (market: PredictionMarket) => void;
  onBetPlaced: (bet: PredictionBet) => void;
  onMarketSettled: (result: SettlementResult) => void;
}

export const useMarket = (userPubkey?: string): MarketData & MarketActions => {
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [bets, setBets] = useState<PredictionBet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Initialize settlement bot
  const [settlementBot] = useState(() => new SettlementBot());

  // Load data from localStorage
  const loadData = useCallback(() => {
    try {
      setIsLoading(true);
      setError(null);
      
      const storedMarkets = localStorage.getItem('predictionMarkets');
      const storedBets = localStorage.getItem('predictionBets');
      
      const parsedMarkets = storedMarkets ? JSON.parse(storedMarkets) : [];
      const parsedBets = storedBets ? JSON.parse(storedBets) : [];
      
      setMarkets(parsedMarkets);
      setBets(parsedBets);
    } catch (err) {
      console.error('Error loading market data:', err);
      setError('Failed to load market data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize data loading and settlement monitoring
  useEffect(() => {
    loadData();
    
    // Also fetch from API if localStorage is empty
    const checkApiMarkets = async () => {
      try {
        const response = await fetch('/api/markets');
        if (response.ok) {
          const apiMarkets = await response.json();
          if (apiMarkets.length > 0 && markets.length === 0) {
            console.log('Loading markets from API:', apiMarkets);
            setMarkets(apiMarkets);
            localStorage.setItem('predictionMarkets', JSON.stringify(apiMarkets));
          }
        }
      } catch (error) {
        console.warn('Failed to fetch markets from API:', error);
      }
    };
    
    checkApiMarkets();
    
    // Start automatic settlement monitoring
    const stopSettlement = settlementBot.startAutomaticSettlement(30000); // Check every 30 seconds
    
    // Set up storage event listener for cross-tab synchronization
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'predictionMarkets' || e.key === 'predictionBets') {
        loadData();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      stopSettlement();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadData, settlementBot]);

  // Derived data
  const userBets = userPubkey ? bets.filter(bet => bet.userPubkey === userPubkey) : [];

  // Helper functions
  const getMarketsByPostId = useCallback((postId: string): PredictionMarket[] => {
    return markets.filter(market => market.postId === postId);
  }, [markets]);

  const getBetsByMarketId = useCallback((marketId: number): PredictionBet[] => {
    return bets.filter(bet => bet.marketId === marketId);
  }, [bets]);

  const getUserBetsByMarketId = useCallback((marketId: number, userPubkey: string): PredictionBet[] => {
    return bets.filter(bet => bet.marketId === marketId && bet.userPubkey === userPubkey);
  }, [bets]);

  // Event handlers
  const onMarketCreated = useCallback((market: PredictionMarket) => {
    setMarkets(prev => [...prev, market]);
    toast({
      title: "Market Created",
      description: "Your prediction market is now live!",
    });
  }, [toast]);

  const onBetPlaced = useCallback((bet: PredictionBet) => {
    // Update bets
    setBets(prev => [...prev, bet]);
    
    // Update market pools
    setMarkets(prev => prev.map(market => {
      if (market.id === bet.marketId) {
        const updatedMarket = { ...market };
        if (bet.position === 'yes') {
          updatedMarket.totalYesPool += bet.amount;
        } else {
          updatedMarket.totalNoPool += bet.amount;
        }
        return updatedMarket;
      }
      return market;
    }));

    toast({
      title: "Bet Placed",
      description: `Successfully placed ${bet.amount} sats on "${bet.position.toUpperCase()}"`,
    });
  }, [toast]);

  const onMarketSettled = useCallback((result: SettlementResult) => {
    // Update market as settled
    setMarkets(prev => prev.map(market => {
      if (market.id === result.marketId) {
        return {
          ...market,
          isSettled: true,
          settlementResult: result.result,
        };
      }
      return market;
    }));
    
    // Update bets with payouts
    setBets(prev => prev.map(bet => {
      const payout = result.payouts.find(p => p.betId === bet.id);
      if (payout) {
        return {
          ...bet,
          isSettled: true,
          payout: payout.payout,
        };
      }
      return bet;
    }));

    // Show settlement notification
    const market = markets.find(m => m.id === result.marketId);
    if (market) {
      toast({
        title: "Market Settled",
        description: `"${market.question}" has been settled. Result: ${result.winningPosition.toUpperCase()}`,
      });
      
      // Show user-specific payout notifications
      if (userPubkey) {
        const userPayouts = result.payouts.filter(p => p.userPubkey === userPubkey);
        userPayouts.forEach(payout => {
          if (payout.payout > 0) {
            toast({
              title: "Payout Received",
              description: `You received ${payout.payout} sats from the settled market!`,
            });
          }
        });
      }
    }
  }, [markets, userPubkey, toast]);

  const refreshMarkets = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    // Data
    markets,
    bets,
    userBets,
    isLoading,
    error,
    
    // Actions
    refreshMarkets,
    getMarketsByPostId,
    getBetsByMarketId,
    getUserBetsByMarketId,
    onMarketCreated,
    onBetPlaced,
    onMarketSettled,
  };
};

export default useMarket;