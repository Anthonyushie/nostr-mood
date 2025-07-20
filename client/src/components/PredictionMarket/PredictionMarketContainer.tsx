import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, TrendingUp, Users, Clock, DollarSign, CheckCircle } from 'lucide-react';
import MarketCreator from './MarketCreator';
import MarketCard from './MarketCard';
import { useMarket } from '@/hooks/useMarket';
import { AnalysisResult } from '../NostrMoodAnalyzer';

interface PredictionMarketContainerProps {
  analysisResult?: AnalysisResult;
  userPubkey?: string;
  isEnabled?: boolean;
}

const PredictionMarketContainer = ({ 
  analysisResult, 
  userPubkey, 
  isEnabled = true 
}: PredictionMarketContainerProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const {
    markets,
    bets,
    userBets,
    isLoading,
    getMarketsByPostId,
    getBetsByMarketId,
    getUserBetsByMarketId,
    onMarketCreated,
    onBetPlaced,
  } = useMarket(userPubkey);

  // Don't render if prediction markets are disabled
  if (!isEnabled) {
    return null;
  }

  // Show all markets if no analysis result provided (safer check)
  const postMarkets = (analysisResult && analysisResult.postId) ? getMarketsByPostId(analysisResult.postId) : markets;
  const activeMarkets = postMarkets.filter(market => !market.isSettled);
  const settledMarkets = postMarkets.filter(market => market.isSettled);
  
  // Calculate total stats for this post
  const totalVolume = postMarkets.reduce((sum, market) => 
    sum + market.totalYesPool + market.totalNoPool, 0
  );
  
  const totalParticipants = new Set(
    postMarkets.flatMap(market => 
      getBetsByMarketId(market.id).map(bet => bet.userPubkey)
    )
  ).size;

  const userActivePositions = userPubkey ? 
    activeMarkets.filter(market => getUserBetsByMarketId(market.id, userPubkey).length > 0).length : 0;

  return (
    <Card className="mt-4 border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-blue-500/5 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Prediction Markets
                {postMarkets.length > 0 && (
                  <Badge variant="outline" className="ml-2 text-blue-500 border-blue-500/30">
                    {postMarkets.length}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {postMarkets.length > 0 && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mr-2">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {totalVolume} sats
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {totalParticipants}
                    </div>
                    {userActivePositions > 0 && (
                      <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10">
                        {userActivePositions} active
                      </Badge>
                    )}
                  </div>
                )}
                <Button variant="ghost" size="sm">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4 p-4">
            {/* Market Creator - only show for specific posts */}
            {analysisResult && (
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Create prediction markets based on this post's sentiment analysis.
                </p>
                <MarketCreator
                  postId={analysisResult.postId}
                  currentSentiment={analysisResult.sentiment.comparative}
                  onMarketCreated={onMarketCreated}
                  disabled={isLoading}
                />
              </div>
            )}
            
            {/* Show existing markets for standalone mode */}
            {!analysisResult && postMarkets.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No Active Markets</p>
                <p className="text-sm">
                  Lightning-powered prediction markets will appear here once created.
                  Connect to the sentiment analyzer to create new markets.
                </p>
              </div>
            )}

            {/* Active Markets */}
            {activeMarkets.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <h4 className="font-medium">Active Markets</h4>
                  <Badge variant="outline">{activeMarkets.length}</Badge>
                </div>
                {activeMarkets.map(market => (
                  <MarketCard
                    key={market.id}
                    market={market}
                    onBetPlaced={onBetPlaced}
                    userPubkey={userPubkey}
                  />
                ))}
              </div>
            )}

            {/* Settled Markets */}
            {settledMarkets.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <h4 className="font-medium">Settled Markets</h4>
                  <Badge variant="outline">{settledMarkets.length}</Badge>
                </div>
                {settledMarkets.map(market => (
                  <MarketCard
                    key={market.id}
                    market={market}
                    onBetPlaced={onBetPlaced}
                    userPubkey={userPubkey}
                  />
                ))}
              </div>
            )}

            {/* Empty State */}
            {postMarkets.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No prediction markets created for this post yet.</p>
                <p className="text-xs mt-1">Be the first to create a sentiment prediction!</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default PredictionMarketContainer;