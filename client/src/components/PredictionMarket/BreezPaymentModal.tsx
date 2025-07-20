import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, ExternalLink, Zap, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useBreezPayments } from '@/hooks/useBreezPayments';
import { formatDistanceToNow } from 'date-fns';

interface BreezPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketId: number;
  marketQuestion: string;
  position: 'yes' | 'no';
  amount: number;
  userPubkey?: string;
}

export function BreezPaymentModal({
  isOpen,
  onClose,
  marketId,
  marketQuestion,
  position,
  amount,
  userPubkey
}: BreezPaymentModalProps) {
  const { createBet, checkBetStatus, copyToClipboard, openLightningWallet, isLoading } = useBreezPayments();
  const [invoice, setInvoice] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'expired' | 'failed'>('pending');
  const [statusCheckInterval, setStatusCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Create invoice when modal opens
  useEffect(() => {
    if (isOpen && !invoice) {
      handleCreateInvoice();
    }
  }, [isOpen]);

  // Start status checking when invoice is created
  useEffect(() => {
    if (invoice && paymentStatus === 'pending') {
      const interval = setInterval(() => {
        checkPaymentStatus();
      }, 2000); // Check every 2 seconds
      
      setStatusCheckInterval(interval);
      return () => clearInterval(interval);
    }
  }, [invoice, paymentStatus]);

  // Update countdown timer
  useEffect(() => {
    if (invoice?.expiresAt) {
      const updateTimer = () => {
        const expiryTime = new Date(invoice.expiresAt);
        const now = new Date();
        
        if (now >= expiryTime) {
          setPaymentStatus('expired');
          setTimeRemaining('Expired');
          return;
        }
        
        setTimeRemaining(formatDistanceToNow(expiryTime, { addSuffix: true }));
      };

      updateTimer();
      const timerInterval = setInterval(updateTimer, 1000);
      return () => clearInterval(timerInterval);
    }
  }, [invoice?.expiresAt]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);

  const handleCreateInvoice = async () => {
    try {
      console.log('Creating invoice for:', { marketId, position, amount, userPubkey });
      if (!marketId) {
        throw new Error('Market ID is required');
      }
      const result = await createBet(marketId, position, amount, userPubkey);
      setInvoice(result);
      setPaymentStatus('pending');
    } catch (error) {
      console.error('Failed to create invoice:', error);
      setPaymentStatus('failed');
    }
  };

  const checkPaymentStatus = async () => {
    if (!invoice?.bet?.id) return;

    try {
      const status = await checkBetStatus(invoice.bet.id);
      if (status.isPaid) {
        setPaymentStatus('paid');
        if (statusCheckInterval) {
          clearInterval(statusCheckInterval);
          setStatusCheckInterval(null);
        }
      } else if (status.paymentStatus === 'expired') {
        setPaymentStatus('expired');
        if (statusCheckInterval) {
          clearInterval(statusCheckInterval);
          setStatusCheckInterval(null);
        }
      }
    } catch (error) {
      console.error('Failed to check payment status:', error);
    }
  };

  const handleClose = () => {
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
      setStatusCheckInterval(null);
    }
    setInvoice(null);
    setPaymentStatus('pending');
    onClose();
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'paid':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'expired':
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusBadge = () => {
    switch (paymentStatus) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Awaiting Payment</Badge>;
      case 'paid':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Payment Confirmed</Badge>;
      case 'expired':
        return <Badge variant="destructive">Invoice Expired</Badge>;
      case 'failed':
        return <Badge variant="destructive">Payment Failed</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            Lightning Payment
          </DialogTitle>
          <DialogDescription>
            Pay {amount} sats to place your {position.toUpperCase()} bet on this market
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Market Info */}
          <div className="p-3 bg-muted rounded-lg">
            <h4 className="font-medium text-sm mb-1">Market Question</h4>
            <p className="text-sm text-muted-foreground">{marketQuestion}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">Your Position:</span>
              <Badge variant={position === 'yes' ? 'default' : 'secondary'}>
                {position.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* Payment Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="font-medium">{amount} sats</span>
            </div>
            {getStatusBadge()}
          </div>

          {invoice && (
            <>
              {/* Expiry Timer */}
              {paymentStatus === 'pending' && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Expires:</span>
                  <span className="font-mono">{timeRemaining}</span>
                </div>
              )}

              <Separator />

              {/* Payment Request */}
              {paymentStatus !== 'paid' && (
                <div className="space-y-2">
                  <Label htmlFor="payment-request">Lightning Invoice</Label>
                  <div className="flex gap-2">
                    <Input
                      id="payment-request"
                      value={invoice.paymentRequest}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(invoice.paymentRequest, 'Lightning invoice')}
                      disabled={paymentStatus === 'expired'}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {paymentStatus === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => openLightningWallet(invoice.paymentRequest)}
                    className="flex-1"
                    disabled={isLoading}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Wallet
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(invoice.paymentRequest, 'Lightning invoice')}
                    disabled={isLoading}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {paymentStatus === 'expired' && (
                <Button
                  onClick={handleCreateInvoice}
                  className="w-full"
                  disabled={isLoading}
                >
                  Generate New Invoice
                </Button>
              )}

              {paymentStatus === 'paid' && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Payment Confirmed!</span>
                  </div>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    Your {position.toUpperCase()} bet has been placed successfully.
                  </p>
                </div>
              )}

              {paymentStatus === 'failed' && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                    <XCircle className="h-4 w-4" />
                    <span className="font-medium">Payment Failed</span>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    Please try creating a new invoice.
                  </p>
                  <Button
                    onClick={handleCreateInvoice}
                    className="w-full mt-2"
                    variant="outline"
                    disabled={isLoading}
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Instructions */}
          {paymentStatus === 'pending' && (
            <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
              <p className="font-medium mb-1">How to pay:</p>
              <ul className="space-y-1">
                <li>• Use any Lightning wallet app</li>
                <li>• Scan QR code or copy the invoice</li>
                <li>• Payment confirms automatically</li>
                <li>• Invoice expires in 1 hour</li>
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}