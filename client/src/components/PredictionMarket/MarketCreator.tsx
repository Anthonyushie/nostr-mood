import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createMarketSchema, type CreateMarketData } from '@shared/schema';
import { TrendingUp, Plus, Timer, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MarketCreatorProps {
  postId: string;
  currentSentiment: number;
  onMarketCreated: (market: any) => void;
  disabled?: boolean;
}

const MarketCreator = ({ postId, currentSentiment, onMarketCreated, disabled }: MarketCreatorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreateMarketData>({
    resolver: zodResolver(createMarketSchema),
    defaultValues: {
      question: `Will this post's sentiment score be ≥ ${(currentSentiment + 0.5).toFixed(1)} in the next hour?`,
      threshold: Number((currentSentiment + 0.5).toFixed(1)),
      minStake: 100,
      maxStake: 10000,
      duration: 1,
    },
  });

  const durationOptions = [
    { value: 1, label: '1 minute (testing)' },
    { value: 5, label: '5 minutes' },
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' },
    { value: 360, label: '6 hours' },
    { value: 720, label: '12 hours' },
    { value: 1440, label: '24 hours' },
  ];

  const onSubmit = async (data: CreateMarketData) => {
    if (!postId) {
      toast({
        title: "Error",
        description: "Please analyze a post first before creating a prediction market",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      // Calculate expiration time
      const expiresAt = new Date(Date.now() + data.duration * 60 * 1000);
      
      const marketData = {
        ...data,
        postId,
        expiresAt: expiresAt.toISOString(),
        creatorPubkey: 'temp-pubkey', // This would come from user context
      };

      // Create market via API - use localhost for development, relative for production
      const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000/api/markets' : '/api/markets';
      console.log('Creating market with URL:', apiUrl);
      console.log('Current hostname:', window.location.hostname);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(marketData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create market: ${response.statusText}`);
      }

      const newMarket = await response.json();
      
      // Also update localStorage for cross-tab sync
      const markets = JSON.parse(localStorage.getItem('predictionMarkets') || '[]');
      markets.push(newMarket);
      localStorage.setItem('predictionMarkets', JSON.stringify(markets));

      onMarketCreated(newMarket);
      
      toast({
        title: "Market Created",
        description: "Your prediction market has been created successfully!",
      });

      setIsOpen(false);
      form.reset();
    } catch (error) {
      console.error('Error creating market:', error);
      toast({
        title: "Creation Failed",
        description: "Failed to create prediction market. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !postId}
          className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20 hover:from-blue-500/20 hover:to-purple-500/20"
        >
          <TrendingUp className="mr-2 h-4 w-4" />
          Create Prediction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Prediction Market
          </DialogTitle>
          <DialogDescription>
            Create a Lightning-powered prediction market based on sentiment analysis of the current post.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Will this post's sentiment score be ≥ 0.5 in the next hour?"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="threshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Threshold</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="0.5"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      Duration
                    </FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {durationOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="minStake"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Min Stake (sats)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="100"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxStake"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Stake (sats)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="10000"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Market'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default MarketCreator;