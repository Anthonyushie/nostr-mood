import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { placeBetSchema, type PlaceBetData, type PredictionMarket } from '@shared/schema';
import { Timer, TrendingUp, TrendingDown, DollarSign, Users, Clock, CheckCircle, Share2, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { NWCPaymentModal } from './NWCPaymentModal';
import { useNWCPayments } from '@/hooks/useNWCPayments';

interface MarketCardProps {
  market: PredictionMarket;
  onBetPlaced: (bet: any) => void;
  userPubkey?: string;
}

// Share bet to Nostr
const shareBetToNostr = async (bet: any, market: PredictionMarket) => {
  try {
    const shareText = `🎯 Just placed a ${bet.amount} sats bet on "${bet.position.toUpperCase()}" for: "${market.question}"
    
💰 Current odds: ${bet.position === 'yes' ? 
      `${((market.totalYesPool + market.totalNoPool) / Math.max(market.totalYesPool, 1)).toFixed(2)}x` : 
      `${((market.totalYesPool + market.totalNoPool) / Math.max(market.totalNoPool, 1)).toFixed(2)}x`}
    
⏰ Market expires: ${new Date(market.expiresAt).toLocaleString()}
    
#NostrMood #PredictionMarket #Lightning`;

    if (typeof window !== 'undefined' && (window as any).nostr) {
      const event = await (window as any).nostr.signEvent({
        kind: 1,
        content: shareText,
        tags: [
          ['t', 'nostrmood'],
          ['t', 'predictionmarket'],
          ['t', 'lightning'],
        ],
        created_at: Math.floor(Date.now() / 1000),
      });
      
      // In a real implementation, you'd publish this to relays
      console.log('Bet shared to Nostr:', event);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to share bet:', error);
    return false;
  }
};

const MarketCard = ({ market, onBetPlaced, userPubkey }: MarketCardProps) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<'yes' | 'no'>('yes');
  const [betAmount, setBetAmount] = useState(market.minStake);
  const { toast } = useToast();
  const { balance } = useNWCPayments();

  const form = useForm<PlaceBetData>({
    resolver: zodResolver(placeBetSchema),
    defaultValues: {
      marketId: market.id,
      position: 'yes',
      amount: market.minStake,
    },
  });

  // Calculate odds
  const totalPool = market.totalYesPool + market.totalNoPool;
  const yesOdds = totalPool > 0 ? (totalPool / Math.max(market.totalYesPool, 1)) : 2;
  const noOdds = totalPool > 0 ? (totalPool / Math.max(market.totalNoPool, 1)) : 2;
  const yesPercentage = totalPool > 0 ? (market.totalYesPool / totalPool) * 100 : 50;
  const noPercentage = totalPool > 0 ? (market.totalNoPool / totalPool) * 100 : 50;

  // Update countdown timer
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const expiryTime = new Date(market.expiresAt).getTime();
      const difference = expiryTime - now;

      if (difference <= 0) {
        setTimeLeft('Expired');
        setIsExpired(true);
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [market.expiresAt]);

  // Handle bet placement callback from payment modal
  const handleBetPlaced = (bet: any) => {
    onBetPlaced(bet);
    
    toast({
      title: "Bet Confirmed",
      description: `Successfully placed ${bet.amount} sats on "${bet.position.toUpperCase()}"`,
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            const shared = await shareBetToNostr(bet, market);
            if (shared) {
              toast({
                title: "Shared!",
                description: "Your bet has been shared to Nostr",
              });
            } else {
              toast({
                title: "Share Failed",
                description: "Could not share to Nostr. Make sure you have a Nostr extension.",
                variant: "destructive",
              });
            }
          }}
        >
          <Share2 className="h-3 w-3" />
        </Button>
      ),
    });
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium leading-tight">{market.question}</CardTitle>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {market.isSettled ? (
              <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10">
                <CheckCircle className="mr-1 h-3 w-3" />
                Settled
              </Badge>
            ) : isExpired ? (
              <Badge variant="outline" className="text-orange-500 border-orange-500/30 bg-orange-500/10">
                <Clock className="mr-1 h-3 w-3" />
                Expired
              </Badge>
            ) : (
              <Badge variant="outline" className="text-blue-500 border-blue-500/30 bg-blue-500/10">
                <Timer className="mr-1 h-3 w-3" />
                {timeLeft}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pool Information */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">YES Pool</div>
            <div className="font-bold text-green-500">{market.totalYesPool} sats</div>
            <div className="text-xs text-muted-foreground">{yesPercentage.toFixed(1)}%</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">NO Pool</div>
            <div className="font-bold text-red-500">{market.totalNoPool} sats</div>
            <div className="text-xs text-muted-foreground">{noPercentage.toFixed(1)}%</div>
          </div>
        </div>

        {/* Visual Pool Representation */}
        <div className="space-y-2">
          <Progress value={yesPercentage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>YES: {yesOdds.toFixed(2)}x</span>
            <span>NO: {noOdds.toFixed(2)}x</span>
          </div>
        </div>

        {/* Market Details */}
        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <div className="text-center">
            <div>Threshold</div>
            <div className="font-medium text-foreground">{market.threshold}</div>
          </div>
          <div className="text-center">
            <div>Stake Range</div>
            <div className="font-medium text-foreground">{market.minStake}-{market.maxStake}</div>
          </div>
          <div className="text-center">
            <div>Fee</div>
            <div className="font-medium text-foreground">{market.feePercentage}%</div>
          </div>
        </div>

        {/* Action Buttons */}
        {!market.isSettled && !isExpired && (
          <div className="flex gap-2">
            <Button 
              className="flex-1" 
              size="sm"
              onClick={() => {
                setSelectedPosition('yes');
                setBetAmount(market.minStake);
                setIsPaymentModalOpen(true);
              }}
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              YES ({yesOdds.toFixed(2)}x)
            </Button>
            <Button 
              variant="outline" 
              className="flex-1" 
              size="sm"
              onClick={() => {
                setSelectedPosition('no');
                setBetAmount(market.minStake);
                setIsPaymentModalOpen(true);
              }}
            >
              <TrendingDown className="mr-2 h-4 w-4" />
              NO ({noOdds.toFixed(2)}x)
            </Button>
          </div>
        )}

        {/* Wallet Balance Display */}
        {balance && (
          <div className="text-xs text-muted-foreground text-center">
            <Zap className="inline h-3 w-3 mr-1" />
            Wallet: {balance.availableBalanceSat} sats
            {balance.pendingReceiveSat > 0 && ` (${balance.pendingReceiveSat} pending)`}
          </div>
        )}

        {/* NWC Payment Modal */}
        <NWCPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          marketId={market.id}
          marketQuestion={market.question}
          position={selectedPosition}
          amount={betAmount}
          onPaymentSuccess={(bet) => {
            onBetPlaced(bet);
            setIsPaymentModalOpen(false);
          }}
        />
      </CardContent>
    </Card>
  );
};

export default MarketCard;