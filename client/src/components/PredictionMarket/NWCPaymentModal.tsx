import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Clock, Copy, AlertCircle, Zap, Wallet, Link } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNWCPayments, type NWCInvoice } from '@/hooks/useNWCPayments';

interface NWCPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  position: 'yes' | 'no';
  marketId: number;
  marketQuestion: string;
  onPaymentSuccess?: (bet: any) => void;
}

export function NWCPaymentModal({
  isOpen,
  onClose,
  amount,
  position,
  marketId,
  marketQuestion,
  onPaymentSuccess
}: NWCPaymentModalProps) {
  const { toast } = useToast();
  const { createBet, walletConnection, connectNWC, checkWeblnEnabled } = useNWCPayments();
  
  const [currentInvoice, setCurrentInvoice] = useState<NWCInvoice | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'creating' | 'pending' | 'paid' | 'expired' | 'failed'>('creating');
  const [nwcConnectionString, setNwcConnectionString] = useState('');

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "Payment request copied successfully",
      });
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleCreateBet = async () => {
    try {
      setPaymentStatus('creating');
      console.log('Creating invoice for:', { marketId, position, amount });
      
      const result = await createBet(marketId, position, amount);
      
      if (result && result.paymentRequest) {
        setCurrentInvoice({
          invoiceId: result.invoiceId,
          paymentRequest: result.paymentRequest,
          expiresAt: result.expiresAt,
          paymentHash: result.bet?.paymentHash || ''
        });
        setPaymentStatus('pending');

        if (onPaymentSuccess) {
          onPaymentSuccess(result.bet);
        }
      }
    } catch (error) {
      console.error('Failed to create invoice:', error);
      setPaymentStatus('failed');
    }
  };

  const handleConnectNWC = async () => {
    if (!nwcConnectionString.trim()) {
      toast({
        title: "Connection Required",
        description: "Please enter your NWC connection string",
        variant: "destructive",
      });
      return;
    }

    try {
      await connectNWC(nwcConnectionString);
      setNwcConnectionString(''); // Clear the input for security
    } catch (error) {
      console.error('NWC connection failed:', error);
    }
  };

  const handleConnectWebLN = async () => {
    try {
      await checkWeblnEnabled();
      toast({
        title: "WebLN Connected",
        description: "Successfully connected to your Lightning wallet",
      });
    } catch (error) {
      toast({
        title: "WebLN Connection Failed",
        description: "Please install a WebLN-compatible wallet extension",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (isOpen && paymentStatus === 'creating') {
      handleCreateBet();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setCurrentInvoice(null);
      setPaymentStatus('creating');
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            Lightning Payment
          </DialogTitle>
          <DialogDescription>
            Pay {amount} sats to bet <Badge variant={position === 'yes' ? 'default' : 'secondary'}>{position.toUpperCase()}</Badge> on: {marketQuestion}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {walletConnection === 'none' && (
            <Tabs defaultValue="webln" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="webln">WebLN</TabsTrigger>
                <TabsTrigger value="nwc">Nostr Wallet Connect</TabsTrigger>
              </TabsList>
              
              <TabsContent value="webln">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      WebLN Wallet
                    </CardTitle>
                    <CardDescription>
                      Connect using a WebLN-compatible browser extension (Alby, Zeus, etc.)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={handleConnectWebLN} className="w-full">
                      Connect WebLN Wallet
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="nwc">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Link className="h-4 w-4" />
                      Nostr Wallet Connect
                    </CardTitle>
                    <CardDescription>
                      Connect using your NWC connection string from Alby, Zeus, or other NWC-compatible wallets
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="nwc-connection">NWC Connection String</Label>
                      <Input
                        id="nwc-connection"
                        type="password"
                        placeholder="nostr+walletconnect://..."
                        value={nwcConnectionString}
                        onChange={(e) => setNwcConnectionString(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleConnectNWC} className="w-full">
                      Connect NWC Wallet
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {walletConnection !== 'none' && (
            <>
              {paymentStatus === 'creating' && (
                <Card>
                  <CardContent className="flex items-center justify-center p-6">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 animate-spin" />
                      Creating Lightning invoice...
                    </div>
                  </CardContent>
                </Card>
              )}

              {paymentStatus === 'pending' && currentInvoice && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-500" />
                      Payment Pending
                    </CardTitle>
                    <CardDescription>
                      Scan the QR code or copy the payment request to complete your bet
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-xs font-mono break-all">
                        {currentInvoice.paymentRequest}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(currentInvoice.paymentRequest)}
                        className="flex-1"
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy Invoice
                      </Button>
                      
                      {walletConnection === 'webln' && window.webln && (
                        <Button
                          size="sm"
                          onClick={async () => {
                            try {
                              await window.webln!.sendPayment(currentInvoice.paymentRequest);
                              setPaymentStatus('paid');
                              toast({
                                title: "Payment Sent!",
                                description: `Successfully paid ${amount} sats for ${position.toUpperCase()} bet`,
                              });
                            } catch (error) {
                              toast({
                                title: "Payment Failed",
                                description: "Could not send payment through WebLN",
                                variant: "destructive",
                              });
                            }
                          }}
                          className="flex-1"
                        >
                          <Zap className="h-4 w-4 mr-1" />
                          Pay Now
                        </Button>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Invoice expires: {new Date(currentInvoice.expiresAt).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              )}

              {paymentStatus === 'paid' && (
                <Card>
                  <CardContent className="flex items-center justify-center p-6">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      Payment successful! Your bet has been placed.
                    </div>
                  </CardContent>
                </Card>
              )}

              {paymentStatus === 'failed' && (
                <Card>
                  <CardContent className="flex items-center justify-center p-6">
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-5 w-5" />
                      Payment failed. Please try again.
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {paymentStatus === 'failed' && (
              <Button onClick={handleCreateBet}>
                Retry Payment
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}