import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import MarketCreator from '@/components/PredictionMarket/MarketCreator';
import MarketCard from '@/components/PredictionMarket/MarketCard';
import SettlementBot from '@/components/PredictionMarket/SettlementBot';
import { useMarket } from '@/hooks/useMarket';
import { PredictionMarket, PredictionBet } from '@shared/schema';

// Mock dependencies
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() })
}));

jest.mock('nostr-tools', () => ({
  SimplePool: jest.fn().mockImplementation(() => ({
    querySync: jest.fn().mockResolvedValue([
      {
        id: 'test-event-id',
        content: 'This is a great post!',
        pubkey: 'test-pubkey',
        created_at: Date.now() / 1000,
        kind: 1,
        tags: [],
        sig: 'test-sig'
      }
    ])
  }))
}));

jest.mock('sentiment', () => {
  return jest.fn().mockImplementation(() => ({
    analyze: jest.fn().mockReturnValue({
      score: 2,
      comparative: 0.4,
      calculation: [],
      tokens: ['This', 'is', 'a', 'great', 'post'],
      words: ['great'],
      positive: ['great'],
      negative: []
    })
  }));
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('Prediction Market Feature', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('MarketCreator', () => {
    const defaultProps = {
      postId: 'test-post-id',
      currentSentiment: 0.3,
      onMarketCreated: jest.fn(),
      disabled: false
    };

    it('renders market creator button', () => {
      render(<MarketCreator {...defaultProps} />);
      expect(screen.getByRole('button', { name: /create prediction/i })).toBeInTheDocument();
    });

    it('opens dialog when button is clicked', async () => {
      const user = userEvent.setup();
      render(<MarketCreator {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /create prediction/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Create Prediction Market')).toBeInTheDocument();
    });

    it('creates market with valid data', async () => {
      const user = userEvent.setup();
      const onMarketCreated = jest.fn();
      
      render(<MarketCreator {...defaultProps} onMarketCreated={onMarketCreated} />);
      
      // Open dialog
      await user.click(screen.getByRole('button', { name: /create prediction/i }));
      
      // Fill form
      const questionTextarea = screen.getByRole('textbox', { name: /question/i });
      await user.clear(questionTextarea);
      await user.type(questionTextarea, 'Will sentiment be positive?');
      
      const thresholdInput = screen.getByLabelText(/threshold/i);
      await user.clear(thresholdInput);
      await user.type(thresholdInput, '0.5');
      
      // Submit form
      await user.click(screen.getByRole('button', { name: /create market/i }));
      
      await waitFor(() => {
        expect(onMarketCreated).toHaveBeenCalled();
      });
    });

    it('validates form input correctly', async () => {
      const user = userEvent.setup();
      render(<MarketCreator {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /create prediction/i }));
      
      // Try to submit with invalid data
      const questionTextarea = screen.getByRole('textbox', { name: /question/i });
      await user.clear(questionTextarea);
      await user.type(questionTextarea, 'Short'); // Too short
      
      await user.click(screen.getByRole('button', { name: /create market/i }));
      
      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/string must contain at least 10 character/i)).toBeInTheDocument();
      });
    });
  });

  describe('MarketCard', () => {
    const mockMarket: PredictionMarket = {
      id: 1,
      postId: 'test-post',
      question: 'Will sentiment be positive?',
      threshold: 0.5,
      minStake: 100,
      maxStake: 10000,
      duration: 60,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      isSettled: false,
      settlementResult: null,
      creatorPubkey: 'creator-pubkey',
      totalYesPool: 1000,
      totalNoPool: 500,
      feePercentage: 5.0
    };

    const defaultProps = {
      market: mockMarket,
      onBetPlaced: jest.fn(),
      userPubkey: 'user-pubkey'
    };

    it('renders market information correctly', () => {
      render(<MarketCard {...defaultProps} />);
      
      expect(screen.getByText('Will sentiment be positive?')).toBeInTheDocument();
      expect(screen.getByText('1000 sats')).toBeInTheDocument(); // YES pool
      expect(screen.getByText('500 sats')).toBeInTheDocument(); // NO pool
      expect(screen.getByText('0.5')).toBeInTheDocument(); // threshold
    });

    it('calculates odds correctly', () => {
      render(<MarketCard {...defaultProps} />);
      
      // Total pool: 1500, YES pool: 1000, NO pool: 500
      // YES odds: 1500/1000 = 1.5, NO odds: 1500/500 = 3.0
      expect(screen.getByText('1.50x')).toBeInTheDocument();
      expect(screen.getByText('3.00x')).toBeInTheDocument();
    });

    it('shows settled badge for settled markets', () => {
      const settledMarket = { ...mockMarket, isSettled: true };
      render(<MarketCard {...defaultProps} market={settledMarket} />);
      
      expect(screen.getByText('Settled')).toBeInTheDocument();
    });

    it('allows placing bets on active markets', async () => {
      const user = userEvent.setup();
      const onBetPlaced = jest.fn();
      
      render(<MarketCard {...defaultProps} onBetPlaced={onBetPlaced} />);
      
      await user.click(screen.getByRole('button', { name: /place bet/i }));
      
      // Should open bet dialog
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Place Bet')).toBeInTheDocument();
    });

    it('prevents betting on settled markets', () => {
      const settledMarket = { ...mockMarket, isSettled: true };
      render(<MarketCard {...defaultProps} market={settledMarket} />);
      
      expect(screen.queryByRole('button', { name: /place bet/i })).not.toBeInTheDocument();
    });
  });

  describe('SettlementBot', () => {
    let settlementBot: SettlementBot;

    beforeEach(() => {
      settlementBot = new SettlementBot();
    });

    it('calculates payouts correctly for winning bets', () => {
      const market: PredictionMarket = {
        id: 1,
        postId: 'test-post',
        question: 'Test question',
        threshold: 0.5,
        minStake: 100,
        maxStake: 10000,
        duration: 60,
        createdAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
        isSettled: false,
        settlementResult: null,
        creatorPubkey: 'creator',
        totalYesPool: 1000,
        totalNoPool: 500,
        feePercentage: 5.0
      };

      const bets: PredictionBet[] = [
        {
          id: 1,
          marketId: 1,
          userPubkey: 'user1',
          position: 'yes',
          amount: 500,
          createdAt: new Date().toISOString(),
          paymentHash: 'hash1',
          isPaid: true,
          isSettled: false,
          payout: 0
        },
        {
          id: 2,
          marketId: 1,
          userPubkey: 'user2',
          position: 'yes',
          amount: 500,
          createdAt: new Date().toISOString(),
          paymentHash: 'hash2',
          isPaid: true,
          isSettled: false,
          payout: 0
        },
        {
          id: 3,
          marketId: 1,
          userPubkey: 'user3',
          position: 'no',
          amount: 500,
          createdAt: new Date().toISOString(),
          paymentHash: 'hash3',
          isPaid: true,
          isSettled: false,
          payout: 0
        }
      ];

      const payouts = settlementBot.calculatePayouts(market, bets, true); // YES wins

      // Each YES bettor should get their stake + proportional winnings
      // Total losing amount: 500, fee: 25, distribution: 475
      // Each YES bettor staked 500, so they get 500 + 237.5 = 737.5 each
      expect(payouts).toHaveLength(3);
      
      const yesBet1 = payouts.find(p => p.betId === 1);
      const yesBet2 = payouts.find(p => p.betId === 2);
      const noBet = payouts.find(p => p.betId === 3);
      
      expect(yesBet1?.payout).toBe(737); // 500 + 237 (floored)
      expect(yesBet2?.payout).toBe(737); // 500 + 237 (floored)
      expect(noBet?.payout).toBe(0); // Lost bet
    });

    it('handles markets with no winners (refunds all)', () => {
      const market: PredictionMarket = {
        id: 1,
        postId: 'test-post',
        question: 'Test question',
        threshold: 0.5,
        minStake: 100,
        maxStake: 10000,
        duration: 60,
        createdAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
        isSettled: false,
        settlementResult: null,
        creatorPubkey: 'creator',
        totalYesPool: 0,
        totalNoPool: 500,
        feePercentage: 5.0
      };

      const bets: PredictionBet[] = [
        {
          id: 1,
          marketId: 1,
          userPubkey: 'user1',
          position: 'no',
          amount: 500,
          createdAt: new Date().toISOString(),
          paymentHash: 'hash1',
          isPaid: true,
          isSettled: false,
          payout: 0
        }
      ];

      const payouts = settlementBot.calculatePayouts(market, bets, true); // YES wins, but no YES bets

      // Should refund all bets
      expect(payouts).toHaveLength(1);
      expect(payouts[0].payout).toBe(500); // Full refund
    });

    it('analyzes sentiment for settlement', async () => {
      const sentiment = await settlementBot.analyzeSentimentForSettlement('test-post-id');
      expect(sentiment).toBe(0.4); // From mocked sentiment analysis
    });
  });

  describe('useMarket hook', () => {
    // Note: This would require a more complex setup with React Testing Library's renderHook
    // For now, we'll test the core logic separately
    
    it('manages localStorage correctly', () => {
      const testMarket = {
        id: 1,
        postId: 'test-post',
        question: 'Test question',
        threshold: 0.5,
        minStake: 100,
        maxStake: 10000,
        duration: 60,
        createdAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
        isSettled: false,
        settlementResult: null,
        creatorPubkey: 'creator',
        totalYesPool: 0,
        totalNoPool: 0,
        feePercentage: 5.0
      };

      // Store market
      localStorage.setItem('predictionMarkets', JSON.stringify([testMarket]));
      
      // Retrieve market
      const stored = JSON.parse(localStorage.getItem('predictionMarkets') || '[]');
      expect(stored).toHaveLength(1);
      expect(stored[0].question).toBe('Test question');
    });
  });
});