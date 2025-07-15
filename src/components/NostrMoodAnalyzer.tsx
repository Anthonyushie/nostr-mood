import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, MessageCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { SimplePool, Event } from 'nostr-tools';
import Sentiment from 'sentiment';

interface SentimentResult {
  score: number;
  comparative: number;
  calculation: Array<{ [key: string]: number }>;
  tokens: string[];
  words: string[];
  positive: string[];
  negative: string[];
}

interface AnalysisResult {
  sentiment: SentimentResult;
  postContent: string;
  postAuthor: string;
  postId: string;
}

const NostrMoodAnalyzer = () => {
  const [postId, setPostId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  const sentiment = new Sentiment();

  const relays = [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.nostr.band',
    'wss://nostr-pub.wellorder.net',
    'wss://relay.current.fyi'
  ];

  const validateEventId = (id: string): boolean => {
    return /^[a-f0-9]{64}$/i.test(id);
  };

  const analyzeSentiment = async () => {
    if (!postId.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid Nostr post ID",
        variant: "destructive",
      });
      return;
    }

    if (!validateEventId(postId.trim())) {
      toast({
        title: "Invalid Post ID",
        description: "Please enter a valid 64-character hex string",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const pool = new SimplePool();
      
      const events = await pool.querySync(relays, {
        ids: [postId.trim()],
        kinds: [1] // Text notes
      });

      if (events.length === 0) {
        toast({
          title: "Post Not Found",
          description: "Could not find a post with that ID on Nostr relays",
          variant: "destructive",
        });
        return;
      }

      const event = events[0] as Event;
      const sentimentResult = sentiment.analyze(event.content);

      setResult({
        sentiment: sentimentResult,
        postContent: event.content,
        postAuthor: event.pubkey.slice(0, 16) + '...',
        postId: event.id
      });

      toast({
        title: "Analysis Complete",
        description: "Sentiment analysis has been performed successfully!",
      });

    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to fetch or analyze the post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSentimentLabel = (score: number): string => {
    if (score > 0) return 'Positive';
    if (score < 0) return 'Negative';
    return 'Neutral';
  };

  const getSentimentColor = (score: number): string => {
    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  };

  const getSentimentIcon = (score: number) => {
    if (score > 0) return <TrendingUp className="h-4 w-4" />;
    if (score < 0) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card className="border-border bg-card shadow-[var(--shadow-card)]">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            NostrMood
          </CardTitle>
          <CardDescription className="text-lg">
            Analyze the sentiment of any Nostr post using AI-powered sentiment analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Enter Nostr post ID (64-character hex string)"
              value={postId}
              onChange={(e) => setPostId(e.target.value)}
              className="flex-1 bg-input border-border"
              disabled={isLoading}
            />
            <Button 
              onClick={analyzeSentiment}
              disabled={isLoading || !postId.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Analyze
                </>
              )}
            </Button>
          </div>
          
          {result && (
            <Card className="mt-6 border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Analysis Result
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">Sentiment:</span>
                  <Badge 
                    variant="outline" 
                    className={`border-${getSentimentColor(result.sentiment.score)} text-${getSentimentColor(result.sentiment.score)} bg-${getSentimentColor(result.sentiment.score)}/10 flex items-center gap-1`}
                  >
                    {getSentimentIcon(result.sentiment.score)}
                    {getSentimentLabel(result.sentiment.score)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Score: {result.sentiment.score} | Comparative: {result.sentiment.comparative.toFixed(3)}
                  </span>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Post Content:</h4>
                  <div className="p-3 bg-muted rounded-md text-sm">
                    {result.postContent}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Author:</span>
                    <p className="text-muted-foreground font-mono">{result.postAuthor}</p>
                  </div>
                  <div>
                    <span className="font-medium">Post ID:</span>
                    <p className="text-muted-foreground font-mono break-all">{result.postId}</p>
                  </div>
                </div>

                {(result.sentiment.positive.length > 0 || result.sentiment.negative.length > 0) && (
                  <div className="space-y-3">
                    {result.sentiment.positive.length > 0 && (
                      <div>
                        <h5 className="font-medium text-positive mb-2">Positive Words:</h5>
                        <div className="flex flex-wrap gap-1">
                          {result.sentiment.positive.map((word, index) => (
                            <Badge key={index} variant="outline" className="text-positive border-positive/30 bg-positive/10">
                              {word}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {result.sentiment.negative.length > 0 && (
                      <div>
                        <h5 className="font-medium text-negative mb-2">Negative Words:</h5>
                        <div className="flex flex-wrap gap-1">
                          {result.sentiment.negative.map((word, index) => (
                            <Badge key={index} variant="outline" className="text-negative border-negative/30 bg-negative/10">
                              {word}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NostrMoodAnalyzer;