import { 
  users, 
  predictionMarkets, 
  predictionBets,
  type User, 
  type InsertUser, 
  type PredictionMarket, 
  type InsertPredictionMarket, 
  type PredictionBet, 
  type InsertPredictionBet 
} from "@shared/schema";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Prediction markets
  createPredictionMarket(market: InsertPredictionMarket): Promise<PredictionMarket>;
  getAllMarkets(): Promise<PredictionMarket[]>;
  getMarketById(id: number): Promise<PredictionMarket | undefined>;
  settleMarket(id: number, result: boolean): Promise<void>;
  updateMarketPool(marketId: number, position: string, amount: number): Promise<void>;
  
  // Prediction bets with Breez integration
  createBet(bet: InsertPredictionBet): Promise<PredictionBet>;
  getBetById(id: number): Promise<PredictionBet | undefined>;
  getBetsByMarket(marketId: number): Promise<PredictionBet[]>;
  getBetByInvoiceId(invoiceId: string): Promise<PredictionBet | undefined>;
  updateBetPayment(betId: number, updates: { isPaid: boolean; paymentHash: string }): Promise<void>;
  updateBetPayout(betId: number, updates: { 
    payout?: number; 
    payoutTxId?: string; 
    payoutStatus?: string;
    payoutError?: string;
    payoutRetries?: number;
    isSettled?: boolean;
  }): Promise<void>;
  updateBetStatus(betId: number, updates: { paymentStatus?: string }): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private markets: Map<number, PredictionMarket>;
  private bets: Map<number, PredictionBet>;
  private currentUserId: number;
  private currentMarketId: number;
  private currentBetId: number;

  constructor() {
    this.users = new Map();
    this.markets = new Map();
    this.bets = new Map();
    this.currentUserId = 1;
    this.currentMarketId = 1;
    this.currentBetId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Market methods
  async createPredictionMarket(insertMarket: InsertPredictionMarket): Promise<PredictionMarket> {
    const id = this.currentMarketId++;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + insertMarket.duration * 60 * 1000);
    
    const market: PredictionMarket = {
      ...insertMarket,
      id,
      createdAt: now,
      expiresAt,
      isSettled: false,
      settlementResult: null,
      totalYesPool: 0,
      totalNoPool: 0,
    };
    
    this.markets.set(id, market);
    return market;
  }

  async getAllMarkets(): Promise<PredictionMarket[]> {
    return Array.from(this.markets.values());
  }

  async getMarketById(id: number): Promise<PredictionMarket | undefined> {
    return this.markets.get(id);
  }

  async settleMarket(id: number, result: boolean): Promise<void> {
    const market = this.markets.get(id);
    if (market) {
      market.isSettled = true;
      market.settlementResult = result;
      this.markets.set(id, market);
    }
  }

  async updateMarketPool(marketId: number, position: string, amount: number): Promise<void> {
    const market = this.markets.get(marketId);
    if (market) {
      if (position === 'yes') {
        market.totalYesPool += amount;
      } else {
        market.totalNoPool += amount;
      }
      this.markets.set(marketId, market);
    }
  }

  // Bet methods
  async createBet(insertBet: InsertPredictionBet): Promise<PredictionBet> {
    const id = this.currentBetId++;
    const now = new Date();
    
    const bet: PredictionBet = {
      ...insertBet,
      id,
      createdAt: now,
      isPaid: false,
      isSettled: false,
      payout: 0,
      payoutStatus: 'pending',
      payoutRetries: 0,
      payoutError: null,
      payoutTxId: null,
      payoutInvoice: null,
    };
    
    this.bets.set(id, bet);
    return bet;
  }

  async getBetById(id: number): Promise<PredictionBet | undefined> {
    return this.bets.get(id);
  }

  async getBetsByMarket(marketId: number): Promise<PredictionBet[]> {
    return Array.from(this.bets.values()).filter(bet => bet.marketId === marketId);
  }

  async getBetByInvoiceId(invoiceId: string): Promise<PredictionBet | undefined> {
    return Array.from(this.bets.values()).find(bet => bet.invoiceId === invoiceId);
  }

  async updateBetPayment(betId: number, updates: { isPaid: boolean; paymentHash: string }): Promise<void> {
    const bet = this.bets.get(betId);
    if (bet) {
      bet.isPaid = updates.isPaid;
      bet.paymentHash = updates.paymentHash;
      this.bets.set(betId, bet);
    }
  }

  async updateBetPayout(betId: number, updates: { 
    payout?: number; 
    payoutTxId?: string; 
    payoutStatus?: string;
    payoutError?: string;
    payoutRetries?: number;
    isSettled?: boolean;
  }): Promise<void> {
    const bet = this.bets.get(betId);
    if (bet) {
      if (updates.payout !== undefined) bet.payout = updates.payout;
      if (updates.payoutTxId !== undefined) bet.payoutTxId = updates.payoutTxId;
      if (updates.payoutStatus !== undefined) bet.payoutStatus = updates.payoutStatus;
      if (updates.payoutError !== undefined) bet.payoutError = updates.payoutError;
      if (updates.payoutRetries !== undefined) bet.payoutRetries = updates.payoutRetries;
      if (updates.isSettled !== undefined) bet.isSettled = updates.isSettled;
      this.bets.set(betId, bet);
    }
  }

  async updateBetStatus(betId: number, updates: { paymentStatus?: string }): Promise<void> {
    const bet = this.bets.get(betId);
    if (bet) {
      // For now, we'll use payoutStatus as a general status field
      if (updates.paymentStatus !== undefined) {
        bet.payoutStatus = updates.paymentStatus;
      }
      this.bets.set(betId, bet);
    }
  }
}

export const storage = new MemStorage();
