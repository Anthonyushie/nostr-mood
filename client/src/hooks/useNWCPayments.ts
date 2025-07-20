import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface NWCInvoice {
  invoiceId: string;
  paymentRequest: string;
  expiresAt: string;
  paymentHash: string;
}

export interface WalletBalance {
  availableBalanceSat: number;
  pendingReceiveSat: number;
}

declare global {
  interface Window {
    webln?: {
      enable(): Promise<void>;
      makeInvoice(args: { amount: number; defaultMemo?: string }): Promise<{ paymentRequest: string }>;
      sendPayment(paymentRequest: string): Promise<{ preimage: string }>;
      getBalance(): Promise<{ balance: number }>;
      isEnabled: boolean;
    };
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: any): Promise<any>;
      nip04?: {
        encrypt(pubkey: string, plaintext: string): Promise<string>;
        decrypt(pubkey: string, ciphertext: string): Promise<string>;
      };
    };
  }
}

export function useNWCPayments() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [isWeblnEnabled, setIsWeblnEnabled] = useState(false);
  const [walletConnection, setWalletConnection] = useState<'none' | 'webln' | 'nwc'>('none');
  const [nwcConnected, setNwcConnected] = useState(false);
  const [nwcConnectionString, setNwcConnectionString] = useState('');

  useEffect(() => {
    // Check for existing NWC connection first
    const savedNwc = localStorage.getItem('nwc_connection');
    if (savedNwc) {
      setNwcConnectionString(savedNwc);
      setNwcConnected(true);
      setWalletConnection('nwc');
      return;
    }
    
    // Check for WebLN availability if no NWC
    if (window.webln && window.webln.isEnabled) {
      setWalletConnection('webln');
      setIsWeblnEnabled(true);
    }
  }, []);

  const checkWeblnEnabled = async () => {
    try {
      if (window.webln) {
        await window.webln.enable();
        setIsWeblnEnabled(true);
        setWalletConnection('webln');
      }
    } catch (error) {
      console.log('WebLN not available or user denied access');
      setIsWeblnEnabled(false);
    }
  };



  const createBet = useCallback(async (
    marketId: number, 
    position: 'yes' | 'no', 
    amount: number,
    userPubkey?: string
  ) => {
    setIsLoading(true);
    try {
      console.log('Creating bet:', { marketId, position, amount, userPubkey });
      console.log('MarketId type:', typeof marketId, 'value:', marketId);
      
      // First test the API connectivity
      const apiBaseUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '';
      console.log('Using API base URL:', apiBaseUrl);
      try {
        const testResponse = await fetch(`${apiBaseUrl}/api/test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: 'connectivity' })
        });
        console.log('Test API response:', await testResponse.json());
      } catch (testError) {
        console.error('Test API failed:', testError);
      }
      
      const response = await fetch(`${apiBaseUrl}/api/bets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          marketId,
          position,
          amount,
          userPubkey: userPubkey || 'anonymous'
        }),
      });

      console.log('Response status:', response.status, response.statusText);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorMessage = `Failed to create bet (${response.status})`;
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch (jsonError) {
          console.warn('Failed to parse error response as JSON:', jsonError);
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Expected JSON response, got ${contentType}`);
      }

      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      if (!responseText.trim()) {
        throw new Error('Empty response from server');
      }

      const data = JSON.parse(responseText);
      
      // If WebLN is available, attempt to pay the invoice automatically
      if (isWeblnEnabled && window.webln && data.paymentRequest) {
        try {
          await window.webln.sendPayment(data.paymentRequest);
          toast({
            title: "Payment Sent!",
            description: `Successfully paid ${amount} sats for ${position.toUpperCase()} bet`,
          });
        } catch (weblnError) {
          console.log('WebLN payment failed, user can pay manually:', weblnError);
        }
      }

      return data;
    } catch (error) {
      console.error('Error creating bet:', error);
      toast({
        title: "Bet Creation Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isWeblnEnabled, toast]);

  const checkBetStatus = useCallback(async (betId: number) => {
    try {
      const response = await fetch(`/api/bets/${betId}/status`);
      if (!response.ok) {
        throw new Error('Failed to check bet status');
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to check bet status:', error);
      throw error;
    }
  }, []);

  const fetchBalance = useCallback(async () => {
    try {
      // Try WebLN first if available
      if (isWeblnEnabled && window.webln) {
        try {
          const weblnBalance = await window.webln.getBalance();
          const balance = {
            availableBalanceSat: weblnBalance.balance,
            pendingReceiveSat: 0
          };
          setBalance(balance);
          return balance;
        } catch (weblnError) {
          console.log('WebLN balance fetch failed, falling back to API');
        }
      }

      // Fallback to API
      const response = await fetch('/api/wallet/balance');
      if (!response.ok) {
        throw new Error('Failed to fetch wallet balance');
      }
      const balance = await response.json();
      setBalance(balance);
      return balance;
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      throw error;
    }
  }, [isWeblnEnabled]);

  const connectNWC = useCallback(async (connectionString: string) => {
    try {
      // Basic validation of NWC connection string format
      if (!connectionString.startsWith('nostr+walletconnect://')) {
        throw new Error('Invalid NWC connection string format. Must start with nostr+walletconnect://');
      }

      // Parse the connection string
      const url = new URL(connectionString);
      const relay = url.searchParams.get('relay');
      const secret = url.searchParams.get('secret');
      const pubkey = url.hostname;

      if (!relay || !secret || !pubkey) {
        throw new Error('Missing required NWC parameters (relay, secret, or pubkey)');
      }

      // Store connection (in real implementation, this would establish WebSocket connection)
      localStorage.setItem('nwc_connection', connectionString);
      setNwcConnectionString(connectionString);
      setNwcConnected(true);
      setWalletConnection('nwc');
      
      toast({
        title: "NWC Connected",
        description: `Successfully connected to wallet: ${pubkey.substring(0, 10)}...`,
      });

      console.log('NWC connected:', { pubkey: pubkey.substring(0, 10) + '...', relay });
      
      // Fetch balance after connecting
      await fetchBalance();
    } catch (error) {
      console.error('NWC connection failed:', error);
      toast({
        title: "NWC Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to wallet",
        variant: "destructive",
      });
      throw error;
    }
  }, [fetchBalance, toast]);

  const disconnectWallet = useCallback(() => {
    localStorage.removeItem('nwc_connection');
    setWalletConnection('none');
    setBalance(null);
    
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected",
    });
  }, [toast]);

  return {
    // Methods
    createBet,
    checkBetStatus,
    fetchBalance,
    connectNWC,
    disconnectWallet,
    checkWeblnEnabled,
    setNwcConnectionString,
    
    // State
    isLoading,
    balance,
    walletConnection,
    isWeblnEnabled,
    nwcConnected,
    nwcConnectionString
  };
}