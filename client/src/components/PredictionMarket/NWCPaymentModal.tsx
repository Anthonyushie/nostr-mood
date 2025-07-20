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
  const { 
    createBet, 
    walletConnection, 
    connectNWC, 
    checkWeblnEnabled,
    nwcConnected,
    setNwcConnectionString: setHookNwcConnectionString
  } = useNWCPayments();
  
  const [currentInvoice, setCurrentInvoice] = useState<NWCInvoice | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'creating' | 'pending' | 'paid' | 'expired' | 'failed'>('idle');
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
      // Update both local and hook state
      setHookNwcConnectionString(nwcConnectionString);
      setNwcConnectionString(''); // Clear the input for security
      // After successful connection, create the bet
      setPaymentStatus('creating');
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
      // After successful connection, create the bet
      setPaymentStatus('creating');
    } catch (error) {
      toast({
        title: "WebLN Connection Failed",
        description: "Please install a WebLN-compatible wallet extension",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    console.log('Create bet effect:', { isOpen, paymentStatus, walletConnection });
    if (isOpen && paymentStatus === 'creating') {
      console.log('Triggering handleCreateBet');
      handleCreateBet();
    }
  }, [isOpen, paymentStatus]);

  useEffect(() => {
    console.log('Modal state change:', { isOpen, walletConnection, paymentStatus });
    if (!isOpen) {
      // Reset state when modal closes
      setCurrentInvoice(null);
      setPaymentStatus('idle');
    } else {
      // When modal opens, set initial state based on wallet connection
      if (walletConnection !== 'none') {
        console.log('Wallet connected, setting status to creating');
        setPaymentStatus('creating');
      } else {
        console.log('No wallet connected, setting status to idle');
        setPaymentStatus('idle'); // Wait for wallet connection
      }
    }
  }, [isOpen, walletConnection]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            Lightning Payment
          </DialogTitle>
          <DialogDescription>
            Pay {amount} sats to bet {position.toUpperCase()} on: {marketQuestion}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {walletConnection === 'none' && paymentStatus === 'idle' && (
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

          {walletConnection !== 'none' && paymentStatus !== 'idle' && (
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
                      Scan the QR code or copy the Lightning invoice to complete payment
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* QR Code placeholder - in real implementation would use qrcode library */}
                    <div className="flex justify-center">
                      <div className="w-48 h-48 bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <Zap className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Lightning Invoice QR
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {amount} sats
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Invoice details */}
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs text-gray-600 dark:text-gray-400">Lightning Invoice</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            readOnly
                            value={currentInvoice.paymentRequest}
                            className="text-xs font-mono"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(currentInvoice.paymentRequest)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span>Amount: {amount} sats</span>
                        <span>Expires: {new Date(currentInvoice.expiresAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={onClose} className="flex-1">
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => setPaymentStatus('paid')} 
                        className="flex-1"
                        variant="default"
                      >
                        Mark as Paid
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {paymentStatus === 'paid' && (
                <Card>
                  <CardContent className="flex items-center justify-center p-6">
                    <div className="text-center">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                      <h3 className="font-semibold text-green-700 dark:text-green-400">Payment Successful!</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Your {position.toUpperCase()} bet has been placed
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {paymentStatus === 'failed' && (
                <Card>
                  <CardContent className="flex items-center justify-center p-6">
                    <div className="text-center">
                      <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                      <h3 className="font-semibold text-red-700 dark:text-red-400">Payment Failed</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Please try again or use a different wallet
                      </p>
                      <Button 
                        onClick={() => setPaymentStatus('creating')} 
                        className="mt-4"
                        size="sm"
                      >
                        Retry Payment
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Connected wallet status */}
              {(walletConnection === 'nwc' && nwcConnected) && (
                <div className="text-center">
                  <p className="text-sm text-green-600 dark:text-green-400 flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    NWC Wallet Connected
                  </p>
                </div>
              )}
            </>
          )}

          {/* No wallet connected and idle state */}
          {walletConnection === 'none' && paymentStatus === 'idle' && (
            <div className="text-center text-gray-600 dark:text-gray-400">
              <p className="text-sm mb-4">Choose a wallet connection method to proceed with payment:</p>
              
              {/* Development mode shortcut */}
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-2">
                  Development Mode: Skip wallet connection for testing
                </p>
                <Button 
                  onClick={() => {
                    console.log('Skipping wallet connection for testing');
                    setPaymentStatus('creating');
                  }}
                  variant="outline"
                  size="sm"
                >
                  Create Test Invoice
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}