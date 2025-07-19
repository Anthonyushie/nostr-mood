import init, { connect, defaultConfig, type LiquidSdk } from '@breeztech/breez-sdk-liquid/node';

export class BreezService {
  private sdk: LiquidSdk | null = null;
  private isInitialized = false;
  private eventListeners = new Map<string, (event: any) => void>();

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const apiKey = process.env.BREEZ_API_KEY;
      if (!apiKey) {
        throw new Error('BREEZ_API_KEY environment variable is required');
      }

      await init();

      const config = defaultConfig('testnet', apiKey);
      config.workingDir = './.breez';
      
      this.sdk = await connect({ config });
      this.isInitialized = true;

      // Set up global event listener
      this.sdk.addEventListener(this.handleBreezEvent.bind(this));
      
      console.log('Breez SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Breez SDK:', error);
      throw error;
    }
  }

  private handleBreezEvent(event: any): void {
    console.log('Breez event received:', event.type, event);
    
    // Notify specific listeners
    this.eventListeners.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }

  addEventListener(id: string, callback: (event: any) => void): void {
    this.eventListeners.set(id, callback);
  }

  removeEventListener(id: string): void {
    this.eventListeners.delete(id);
  }

  async createInvoice(amountSats: number, description?: string): Promise<{
    invoiceId: string;
    paymentRequest: string;
    expiresAt: Date;
  }> {
    if (!this.sdk) {
      throw new Error('Breez SDK not initialized');
    }

    try {
      const response = await this.sdk.receivePayment({ 
        amount_msat: amountSats * 1000,
        description: description || `NostrMood prediction market bet - ${amountSats} sats`
      });

      // Invoice typically expires in 1 hour
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      return {
        invoiceId: response.invoiceId,
        paymentRequest: response.paymentRequest,
        expiresAt
      };
    } catch (error) {
      console.error('Failed to create invoice:', error);
      throw new Error(`Failed to create invoice: ${error.message}`);
    }
  }

  async getWalletInfo(): Promise<{
    availableBalanceSat: number;
    pendingReceiveSat: number;
  }> {
    if (!this.sdk) {
      throw new Error('Breez SDK not initialized');
    }

    try {
      const info = await this.sdk.getInfo();
      return {
        availableBalanceSat: info.walletInfo.balanceSat,
        pendingReceiveSat: info.walletInfo.pendingReceiveSat
      };
    } catch (error) {
      console.error('Failed to get wallet info:', error);
      throw new Error(`Failed to get wallet info: ${error.message}`);
    }
  }

  async sendPayout(bolt11: string): Promise<{
    paymentId: string;
    feeSat: number;
  }> {
    if (!this.sdk) {
      throw new Error('Breez SDK not initialized');
    }

    try {
      // Prepare the payment to get fee estimate
      const prepareRes = await this.sdk.prepareSendPayment({ 
        destination: bolt11 
      });

      console.log('Payout fee estimate:', prepareRes.feesSat, 'sats');

      // Send the payment
      const sendRes = await this.sdk.sendPayment({ 
        prepareResponse: prepareRes 
      });

      return {
        paymentId: sendRes.payment.id,
        feeSat: prepareRes.feesSat
      };
    } catch (error) {
      console.error('Failed to send payout:', error);
      throw new Error(`Failed to send payout: ${error.message}`);
    }
  }

  async getPaymentStatus(paymentId: string): Promise<any> {
    if (!this.sdk) {
      throw new Error('Breez SDK not initialized');
    }

    try {
      const payments = await this.sdk.listPayments({});
      return payments.find(p => p.id === paymentId);
    } catch (error) {
      console.error('Failed to get payment status:', error);
      throw error;
    }
  }

  // Utility method to check if invoice is expired
  isInvoiceExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }
}

// Singleton instance
export const breezService = new BreezService();