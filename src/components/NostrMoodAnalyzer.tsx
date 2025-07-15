import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, MessageCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { SimplePool, Event, nip19 } from 'nostr-tools';
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

  const validateAndExtractEventId = (input: string): string | null => {
    const trimmedInput = input.trim();
    
    // Check if it's a raw hex string (64 characters)
    if (/^[a-f0-9]{64}$/i.test(trimmedInput)) {
      return trimmedInput;
    }
    
    // Check if it's a nevent string
    if (trimmedInput.startsWith('nevent1')) {
      try {
        const decoded = nip19.decode(trimmedInput);
        if (decoded.type === 'nevent' && decoded.data.id) {
          return decoded.data.id;
        }
      } catch (error) {
        console.error('Failed to decode nevent:', error);
        return null;
      }
    }
    
    // Check if it's a note string
    if (trimmedInput.startsWith('note1')) {
      try {
        const decoded = nip19.decode(trimmedInput);
        if (decoded.type === 'note') {
          return decoded.data;
        }
      } catch (error) {
        console.error('Failed to decode note:', error);
        return null;
      }
    }
    
    return null;
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

    const eventId = validateAndExtractEventId(postId);
    
    if (!eventId) {
      toast({
        title: "Invalid Post ID",
        description: "Please enter a valid Nostr event ID (64-character hex, nevent1..., or note1...)",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const pool = new SimplePool();
      
      const events = await pool.querySync(relays, {
        ids: [eventId],
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
    <div className="w-full max-w-2xl mx-auto space-y-4 p-2">
      <Card className="border-border bg-card shadow-[var(--shadow-card)]">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            NostrMood
          </CardTitle>
          <CardDescription className="text-base md:text-lg">
            Analyze sentiment of Nostr posts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-col gap-2">
            <Input
              placeholder="Enter Nostr post ID (nevent1..., note1..., or 64-char hex)"
              value={postId}
              onChange={(e) => setPostId(e.target.value)}
              className="flex-1 bg-input border-border text-sm"
              disabled={isLoading}
            />
            <Button 
              onClick={analyzeSentiment}
              disabled={isLoading || !postId.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto"
              size="sm"
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
            <Card className="mt-4 border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageCircle className="h-4 w-4" />
                  Analysis Result
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-sm text-muted-foreground">Sentiment:</span>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`border-${getSentimentColor(result.sentiment.score)} text-${getSentimentColor(result.sentiment.score)} bg-${getSentimentColor(result.sentiment.score)}/10 flex items-center gap-1 text-xs`}
                    >
                      {getSentimentIcon(result.sentiment.score)}
                      {getSentimentLabel(result.sentiment.score)}
                    </Badge>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      Score: {result.sentiment.score} | Comparative: {result.sentiment.comparative.toFixed(3)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Post Content:</h4>
                  <div className="p-3 bg-muted rounded-md text-xs leading-relaxed break-words overflow-hidden">
                    <div className="max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20">
                      {result.postContent}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="font-medium">Author:</span>
                    <p className="text-muted-foreground font-mono break-all">{result.postAuthor}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-medium">Post ID:</span>
                    <p className="text-muted-foreground font-mono break-all text-[10px] leading-tight">{result.postId}</p>
                  </div>
                </div>

                {(result.sentiment.positive.length > 0 || result.sentiment.negative.length > 0) && (
                  <div className="space-y-2">
                    {result.sentiment.positive.length > 0 && (
                      <div>
                        <h5 className="font-medium text-positive mb-1 text-xs">Positive Words:</h5>
                        <div className="flex flex-wrap gap-1">
                          {result.sentiment.positive.map((word, index) => (
                            <Badge key={index} variant="outline" className="text-positive border-positive/30 bg-positive/10 text-[10px] px-1 py-0">
                              {word}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {result.sentiment.negative.length > 0 && (
                      <div>
                        <h5 className="font-medium text-negative mb-1 text-xs">Negative Words:</h5>
                        <div className="flex flex-wrap gap-1">
                          {result.sentiment.negative.map((word, index) => (
                            <Badge key={index} variant="outline" className="text-negative border-negative/30 bg-negative/10 text-[10px] px-1 py-0">
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