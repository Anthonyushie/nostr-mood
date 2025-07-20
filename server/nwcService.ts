import { webln } from '@getalby/sdk';
import * as nostrTools from 'nostr-tools';
import WebSocket from 'ws';

export interface NWCInvoice {
  invoiceId: string;
  paymentRequest: string;
  expiresAt: Date;
  paymentHash: string;
}

export interface NWCPayment {
  paymentId: string;
  paymentHash: string;
  preimage: string;
  amount: number;
  feeSat: number;
}

export interface WalletBalance {
  availableBalanceSat: number;
  pendingReceiveSat: number;
}

export class NWCService {
  private walletPubkey: string | null = null;
  private appPrivateKey: string;
  private appPublicKey: string;
  private isInitialized = false;
  private eventListeners = new Map<string, (event: any) => void>();
  private relays: string[] = [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.nostr.band'
  ];

  constructor() {
    // Generate app keys for NWC communication  
    this.appPrivateKey = nostrTools.generateSecretKey();
    this.appPublicKey = nostrTools.getPublicKey(this.appPrivateKey);
  }

  async initialize(nwcConnectionString?: string): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (nwcConnectionString) {
        // Parse NWC connection string: nostr+walletconnect://pubkey@relay?relay=relay&secret=secret
        const parsedNWC = this.parseNWCConnectionString(nwcConnectionString);
        this.walletPubkey = parsedNWC.walletPubkey;
      }

      this.isInitialized = true;
      console.log('NWC Service initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize NWC Service:', error);
      throw error;
    }
  }

  private parseNWCConnectionString(connectionString: string) {
    // Parse nostr+walletconnect://pubkey@relay?relay=relay&secret=secret
    const url = new URL(connectionString);
    const walletPubkey = url.username;
    const relayUrl = url.hostname;
    const secret = url.searchParams.get('secret');
    
    return { walletPubkey, relayUrl, secret };
  }

  // Simplified for mock implementation
  private async handleNWCResponse(response: any): Promise<void> {
    try {
      // Handle different response types
      switch (response.method) {
        case 'make_invoice':
          this.handleInvoiceResponse(response);
          break;
        case 'pay_invoice':
          this.handlePaymentResponse(response);
          break;
        case 'get_balance':
          this.handleBalanceResponse(response);
          break;
      }
    } catch (error) {
      console.error('Error handling NWC response:', error);
    }
  }

  private handleInvoiceResponse(response: any): void {
    // Notify listeners about new invoice
    this.eventListeners.forEach((callback) => {
      try {
        callback({
          type: 'invoice_created',
          invoice: response.result
        });
      } catch (error) {
        console.error('Error in invoice listener:', error);
      }
    });
  }

  private handlePaymentResponse(response: any): void {
    // Notify listeners about payment completion
    this.eventListeners.forEach((callback) => {
      try {
        callback({
          type: 'payment_sent',
          payment: response.result
        });
      } catch (error) {
        console.error('Error in payment listener:', error);
      }
    });
  }

  private handleBalanceResponse(response: any): void {
    // Handle balance updates
    console.log('Balance updated:', response.result);
  }

  async createInvoice(amountSats: number, description?: string): Promise<NWCInvoice> {
    if (!this.isInitialized) {
      throw new Error('NWC Service not initialized');
    }

    // Mock implementation for development
    // In production, this would send NWC requests via Nostr relays
    const invoiceId = `nwc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      invoiceId,
      paymentRequest: `lnbc${amountSats}u1p...nwc_generated_invoice`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      paymentHash: `nwc_hash_${invoiceId}`
    };
  }

  async getWalletInfo(): Promise<WalletBalance> {
    if (!this.isInitialized) {
      throw new Error('NWC Service not initialized');
    }

    // Mock response for development
    return {
      availableBalanceSat: 100000,
      pendingReceiveSat: 0
    };
  }

  async sendPayout(bolt11: string): Promise<NWCPayment> {
    if (!this.isInitialized) {
      throw new Error('NWC Service not initialized');
    }

    // Mock response for development
    const paymentId = `nwc_payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      paymentId,
      paymentHash: `nwc_payment_hash_${paymentId}`,
      preimage: `nwc_preimage_${paymentId}`,
      amount: 0, // Would be extracted from bolt11
      feeSat: 1
    };
  }

  isInvoiceExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  addEventListener(id: string, callback: (event: any) => void): void {
    this.eventListeners.set(id, callback);
  }

  removeEventListener(id: string): void {
    this.eventListeners.delete(id);
  }

  getAppPubkey(): string {
    return this.appPublicKey;
  }

  isConnected(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const nwcService = new NWCService();