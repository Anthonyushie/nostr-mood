import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { placeBetSchema, type PlaceBetData, type PredictionMarket } from '@shared/schema';
import { Timer, TrendingUp, TrendingDown, DollarSign, Users, Clock, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MarketCardProps {
  market: PredictionMarket;
  onBetPlaced: (bet: any) => void;
  userPubkey?: string;
}

const MarketCard = ({ market, onBetPlaced, userPubkey }: MarketCardProps) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const [isBetDialogOpen, setIsBetDialogOpen] = useState(false);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const { toast } = useToast();

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

  const onSubmit = async (data: PlaceBetData) => {
    if (!userPubkey) {
      toast({
        title: "Authentication Required",
        description: "Please connect your wallet to place bets",
        variant: "destructive",
      });
      return;
    }

    if (data.amount < market.minStake || data.amount > market.maxStake) {
      toast({
        title: "Invalid Amount",
        description: `Stake must be between ${market.minStake} and ${market.maxStake} sats`,
        variant: "destructive",
      });
      return;
    }

    setIsPlacingBet(true);
    try {
      // Simulate Lightning payment (in real app, this would use YakiHonne payment API)
      const paymentHash = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const bet = {
        id: Date.now(),
        marketId: market.id,
        userPubkey,
        position: data.position,
        amount: data.amount,
        createdAt: new Date().toISOString(),
        paymentHash,
        isPaid: true, // Simulated successful payment
        isSettled: false,
        payout: 0,
      };

      // Store bet in localStorage
      const bets = JSON.parse(localStorage.getItem('predictionBets') || '[]');
      bets.push(bet);
      localStorage.setItem('predictionBets', JSON.stringify(bets));

      // Update market pools
      const markets = JSON.parse(localStorage.getItem('predictionMarkets') || '[]');
      const marketIndex = markets.findIndex((m: any) => m.id === market.id);
      if (marketIndex !== -1) {
        if (data.position === 'yes') {
          markets[marketIndex].totalYesPool += data.amount;
        } else {
          markets[marketIndex].totalNoPool += data.amount;
        }
        localStorage.setItem('predictionMarkets', JSON.stringify(markets));
      }

      onBetPlaced(bet);
      
      toast({
        title: "Bet Placed",
        description: `Successfully placed ${data.amount} sats on "${data.position.toUpperCase()}"`,
      });

      setIsBetDialogOpen(false);
      form.reset({ marketId: market.id, position: 'yes', amount: market.minStake });
    } catch (error) {
      console.error('Error placing bet:', error);
      toast({
        title: "Bet Failed",
        description: "Failed to place bet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPlacingBet(false);
    }
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
          <Dialog open={isBetDialogOpen} onOpenChange={setIsBetDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" size="sm">
                <DollarSign className="mr-2 h-4 w-4" />
                Place Bet
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Place Bet</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Position</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select position" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="yes">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-green-500" />
                                YES ({yesOdds.toFixed(2)}x)
                              </div>
                            </SelectItem>
                            <SelectItem value="no">
                              <div className="flex items-center gap-2">
                                <TrendingDown className="h-4 w-4 text-red-500" />
                                NO ({noOdds.toFixed(2)}x)
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (sats)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder={market.minStake.toString()}
                            min={market.minStake}
                            max={market.maxStake}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <div className="text-xs text-muted-foreground">
                          Min: {market.minStake} sats, Max: {market.maxStake} sats
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsBetDialogOpen(false)}
                      disabled={isPlacingBet}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isPlacingBet}>
                      {isPlacingBet ? 'Placing...' : 'Place Bet'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
};

export default MarketCard;