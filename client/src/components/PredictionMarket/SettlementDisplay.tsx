import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Trophy, DollarSign, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Settlement {
  marketId: number;
  question: string;
  result: string;
  sentimentScore: string;
  winnerCount: number;
  totalPayout: number;
  feeCollected: number;
}

interface SettlementDisplayProps {
  marketId?: number;
}

const SettlementDisplay: React.FC<SettlementDisplayProps> = ({ marketId }) => {
  const [expiredMarkets, setExpiredMarkets] = useState<any[]>([]);
  const [isSettling, setIsSettling] = useState(false);
  const [lastSettlement, setLastSettlement] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchExpiredMarkets = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/markets/expired');
      if (response.ok) {
        const data = await response.json();
        setExpiredMarkets(data);
      }
    } catch (error) {
      console.error('Error fetching expired markets:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerAutoSettlement = async () => {
    try {
      setIsSettling(true);
      const response = await fetch('/api/markets/auto-settle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Settlement failed');
      }

      const data = await response.json();
      setLastSettlement(data.results.filter((r: any) => !r.error));
      
      toast({
        title: "Settlement Complete",
        description: `${data.settledCount} markets settled successfully`,
      });

      // Refresh expired markets
      await fetchExpiredMarkets();

    } catch (error) {
      console.error('Error during settlement:', error);
      toast({
        title: "Settlement Failed",
        description: "Failed to settle markets. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSettling(false);
    }
  };

  useEffect(() => {
    fetchExpiredMarkets();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchExpiredMarkets, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      {/* Expired Markets Alert */}
      {expiredMarkets.length > 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            {expiredMarkets.length} market{expiredMarkets.length > 1 ? 's' : ''} expired and ready for settlement.
          </AlertDescription>
        </Alert>
      )}

      {/* Settlement Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Market Settlement
          </CardTitle>
          <CardDescription>
            Automatic settlement processes expired markets and distributes funds to winners
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                Expired Markets: {loading ? '...' : expiredMarkets.length}
              </p>
              <p className="text-xs text-muted-foreground">
                Markets automatically settle 60 seconds after expiry
              </p>
            </div>
            <Button 
              onClick={triggerAutoSettlement}
              disabled={isSettling || expiredMarkets.length === 0}
              variant={expiredMarkets.length > 0 ? "default" : "outline"}
            >
              {isSettling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Settling...
                </>
              ) : (
                'Settle Now'
              )}
            </Button>
          </div>

          {expiredMarkets.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Pending Settlement:</p>
              {expiredMarkets.slice(0, 3).map((market) => (
                <div key={market.id} className="p-2 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium truncate max-w-[200px]">
                        {market.question}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expired: {new Date(market.expiresAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  </div>
                </div>
              ))}
              {expiredMarkets.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{expiredMarkets.length - 3} more markets pending...
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Settlements */}
      {lastSettlement.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Recent Settlements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lastSettlement.map((settlement) => (
                <div key={settlement.marketId} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{settlement.question}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Result: <span className="font-medium">{settlement.result}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Sentiment: {settlement.sentimentScore}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm">
                        <Trophy className="h-3 w-3" />
                        {settlement.winnerCount} winners
                      </div>
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <DollarSign className="h-3 w-3" />
                        {settlement.totalPayout} sats paid
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SettlementDisplay;