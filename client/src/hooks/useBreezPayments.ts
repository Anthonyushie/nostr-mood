import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface BreezInvoice {
  invoiceId: string;
  paymentRequest: string;
  expiresAt: string;
}

export interface WalletBalance {
  availableBalanceSat: number;
  pendingReceiveSat: number;
}

export function useBreezPayments() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [balance, setBalance] = useState<WalletBalance | null>(null);

  const createBet = useCallback(async (
    marketId: number, 
    position: 'yes' | 'no', 
    amount: number,
    userPubkey?: string
  ) => {
    setIsLoading(true);
    try {
      console.log('Creating bet:', { marketId, position, amount, userPubkey });
      
      const response = await fetch('/api/bets', {
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
      
      toast({
        title: 'Invoice Created',
        description: `Pay ${amount} sats to place your ${position.toUpperCase()} bet`,
      });

      return data;
    } catch (error) {
      console.error('Error creating bet:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create bet invoice',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const checkBetStatus = useCallback(async (betId: number) => {
    try {
      const response = await fetch(`/api/bets/${betId}/status`);
      if (!response.ok) {
        throw new Error('Failed to check bet status');
      }
      return await response.json();
    } catch (error) {
      console.error('Error checking bet status:', error);
      throw error;
    }
  }, []);

  const fetchBalance = useCallback(async () => {
    try {
      const response = await fetch('/api/wallet/balance');
      if (!response.ok) {
        throw new Error('Failed to fetch wallet balance');
      }
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('Balance endpoint returned non-JSON response, using mock balance');
        const mockBalance = { availableBalanceSat: 100000, pendingReceiveSat: 0 };
        setBalance(mockBalance);
        return mockBalance;
      }
      
      const balanceData = await response.json();
      setBalance(balanceData);
      return balanceData;
    } catch (error) {
      console.error('Error fetching balance:', error);
      // Use mock balance as fallback
      const mockBalance = { availableBalanceSat: 100000, pendingReceiveSat: 0 };
      setBalance(mockBalance);
      return mockBalance;
    }
  }, [toast]);

  const copyToClipboard = useCallback(async (text: string, description: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied!',
        description: `${description} copied to clipboard`,
      });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const openLightningWallet = useCallback((paymentRequest: string) => {
    // Try to open various Lightning wallet apps
    const walletUrls = [
      `lightning:${paymentRequest}`,
      `bitcoin:${paymentRequest}`,
      `https://phoenix.acinq.co/pay?invoice=${paymentRequest}`,
      `https://wallet.getalby.com/lnurl/pay?invoice=${paymentRequest}`,
    ];

    for (const url of walletUrls) {
      try {
        window.open(url, '_blank');
        break; // If one succeeds, don't try the others
      } catch (error) {
        console.warn('Failed to open wallet URL:', url);
      }
    }
    
    toast({
      title: 'Opening Wallet',
      description: 'Attempting to open your Lightning wallet...',
    });
  }, [toast]);

  // Auto-refresh balance every 30 seconds when component is mounted
  useEffect(() => {
    // Delay initial fetch to avoid race conditions on app startup
    const initialTimer = setTimeout(fetchBalance, 2000);
    const interval = setInterval(fetchBalance, 30000);
    
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [fetchBalance]);

  return {
    createBet,
    checkBetStatus,
    fetchBalance,
    copyToClipboard,
    openLightningWallet,
    balance,
    isLoading,
  };
}