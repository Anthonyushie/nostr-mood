import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, MessageCircle, TrendingUp, TrendingDown, Minus, User, TestTube, Settings } from 'lucide-react';
import { SimplePool, Event, nip19 } from 'nostr-tools';
import Sentiment from 'sentiment';
import SWHandler from 'smart-widget-handler';
import PredictionMarketContainer from './PredictionMarket/PredictionMarketContainer';
import NostrShareTest from './NostrShare/NostrShareTest';
import SentimentTester from './SentimentTester';

interface SentimentResult {
  score: number;
  comparative: number;
  calculation: Array<{ [key: string]: number }>;
  tokens: string[];
  words: string[];
  positive: string[];
  negative: string[];
}

export interface AnalysisResult {
  sentiment: SentimentResult;
  postContent: string;
  postAuthor: string;
  postId: string;
}

interface UserProfile {
  pubkey?: string;
  display_name?: string;
  name?: string;
  picture?: string;
  banner?: string;
  nip05?: string;
  lud16?: string;
  lud06?: string;
  website?: string;
  hasWallet?: boolean;
}

const NostrMoodAnalyzer = () => {
  const [postId, setPostId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isWidgetMode, setIsWidgetMode] = useState(false);
  const { toast } = useToast();

  const sentiment = new Sentiment();

  // Initialize YakiHonne Smart Widget Handler
  useEffect(() => {
    // Check if we're running inside an iframe (widget mode)
    const inIframe = window.self !== window.top;
    
    if (inIframe) {
      setIsWidgetMode(true);
      
      // Notify parent that widget is ready
      SWHandler.client.ready();

      // Listen for messages from parent (YakiHonne host)
      const listener = SWHandler.client.listen((data) => {
        console.log('Received message from YakiHonne host:', data);

        if (data.kind === 'user-metadata') {
          setUser(data.data.user);
          toast({
            title: "Connected to YakiHonne",
            description: `Welcome ${data.data.user.display_name || data.data.user.name || 'User'}!`,
          });
        } else if (data.kind === 'nostr-event' && data.data.status === 'success') {
          // Handle signed events if needed
          console.log('Received signed event:', data.data.event);
        } else if (data.kind === 'error') {
          toast({
            title: "Error",
            description: data.data.message || 'An error occurred',
            variant: "destructive",
          });
        }
      });

      // Cleanup listener on unmount
      return () => listener.close();
    }
  }, [toast]);

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

  const shareAnalysis = () => {
    if (!result) return;

    const analysisText = `🔍 NostrMood Analysis Results

📊 Sentiment: ${getSentimentLabel(result.sentiment.score)} (${result.sentiment.score > 0 ? '+' : ''}${result.sentiment.score})
📈 Comparative Score: ${result.sentiment.comparative.toFixed(3)}

${result.sentiment.positive.length > 0 ? `✅ Positive words: ${result.sentiment.positive.join(', ')}` : ''}
${result.sentiment.negative.length > 0 ? `❌ Negative words: ${result.sentiment.negative.join(', ')}` : ''}

📝 Original post: "${result.postContent.slice(0, 150)}${result.postContent.length > 150 ? '...' : ''}"

🔗 Post ID: ${result.postId.slice(0, 16)}...

#NostrMood #SentimentAnalysis #Nostr #Bitcoin`;

    const eventDraft = {
      content: analysisText,
      tags: [
        ['t', 'nostrmood'], 
        ['t', 'sentiment'], 
        ['t', 'analysis'],
        ['t', 'nostr'],
        ['t', 'bitcoin'],
        ['e', result.postId] // Reference the analyzed post
      ],
      kind: 1,
      created_at: Math.floor(Date.now() / 1000)
    };

    console.log('Sharing analysis:', { isWidgetMode, eventDraft });

    // Try YakiHonne Smart Widget first
    if (isWidgetMode) {
      try {
        console.log('Using YakiHonne Smart Widget to share');
        SWHandler.client.requestEventPublish(eventDraft, window.location.ancestorOrigins?.[0] || '*');
        toast({
          title: "Sharing Analysis",
          description: "Requesting YakiHonne to publish your sentiment analysis...",
        });
        return;
      } catch (error) {
        console.error('YakiHonne sharing failed:', error);
      }
    }

    // Fallback to direct Nostr extension
    if (typeof window !== 'undefined' && (window as any).nostr) {
      try {
        console.log('Using browser Nostr extension to share');
        (window as any).nostr.signEvent(eventDraft).then((signedEvent: any) => {
          console.log('Event signed:', signedEvent);
          toast({
            title: "Analysis Shared",
            description: "Your sentiment analysis has been signed and ready to publish!",
          });
        }).catch((error: any) => {
          console.error('Nostr signing failed:', error);
          toast({
            title: "Share Failed",
            description: "Could not sign the event. Please check your Nostr extension.",
            variant: "destructive",
          });
        });
        return;
      } catch (error) {
        console.error('Nostr extension sharing failed:', error);
      }
    }

    // Final fallback - copy to clipboard
    try {
      navigator.clipboard.writeText(analysisText);
      toast({
        title: "Copied to Clipboard",
        description: "Analysis copied! You can paste it manually to share.",
      });
    } catch (error) {
      console.error('Clipboard copy failed:', error);
      toast({
        title: "Share Failed",
        description: "Could not share the analysis. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 p-2">
      <Card className="border-border bg-card shadow-[var(--shadow-card)]">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            NostrMood
          </CardTitle>
          <CardDescription className="text-base md:text-lg">
            {isWidgetMode ? 'YakiHonne Smart Widget - ' : ''}Analyze sentiment of Nostr posts
          </CardDescription>
          {isWidgetMode && user && (
            <div className="flex items-center justify-center gap-2 mt-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Connected as {user.display_name || user.name || 'User'}</span>
            </div>
          )}
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
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={analyzeSentiment}
                disabled={isLoading || !postId.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1 sm:flex-none"
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

                <div className="pt-2 border-t border-border">
                  <Button 
                    onClick={shareAnalysis}
                    className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground"
                    size="sm"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    {isWidgetMode ? 'Share Analysis on Nostr' : 'Copy Analysis Results'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Testing Tools */}
          <div className="flex gap-2 flex-wrap">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <TestTube className="h-4 w-4" />
                  Sentiment Testing Tool
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <TestTube className="h-5 w-5" />
                    Sentiment Testing Tool
                  </DialogTitle>
                  <DialogDescription>
                    Test how sentiment analysis works and predict betting outcomes
                  </DialogDescription>
                </DialogHeader>
                <SentimentTester />
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Nostr Sharing Test
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Nostr Sharing Test
                  </DialogTitle>
                  <DialogDescription>
                    Test Nostr sharing functionality across different platforms and methods
                  </DialogDescription>
                </DialogHeader>
                <NostrShareTest />
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Prediction Markets Integration */}
          {result && (
            <PredictionMarketContainer 
              analysisResult={result}
              userPubkey={user?.pubkey}
              isEnabled={true}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NostrMoodAnalyzer;