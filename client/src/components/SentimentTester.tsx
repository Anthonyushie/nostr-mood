import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, TestTube } from 'lucide-react';
import Sentiment from 'sentiment';

interface SentimentTestResult {
  text: string;
  score: number;
  comparative: number;
  positive: string[];
  negative: string[];
  wouldWinYes: boolean;
  wouldWinNo: boolean;
}

export default function SentimentTester() {
  const [testText, setTestText] = useState('');
  const [result, setResult] = useState<SentimentTestResult | null>(null);
  const sentiment = new Sentiment();

  const runTest = () => {
    if (!testText.trim()) return;

    const analysis = sentiment.analyze(testText);
    const threshold = 0.6;
    
    setResult({
      text: testText,
      score: analysis.score,
      comparative: analysis.comparative,
      positive: analysis.positive,
      negative: analysis.negative,
      wouldWinYes: analysis.comparative > threshold,
      wouldWinNo: analysis.comparative <= threshold
    });
  };

  const getSentimentIcon = (score: number) => {
    if (score > 0.6) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (score < -0.6) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getSentimentLabel = (score: number): string => {
    if (score > 0.6) return 'Positive';
    if (score < -0.6) return 'Negative';
    return 'Neutral';
  };

  // Example texts for testing
  const examples = [
    "Bitcoin is amazing! I love this technology, it's absolutely fantastic!",
    "This weather is terrible, I hate it so much",
    "The meeting is scheduled for 3pm today",
    "Great work everyone! Excellent progress on the project",
    "This is bad news, really disappointed with the results"
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Sentiment Testing Tool
        </CardTitle>
        <CardDescription>
          Test how sentiment analysis works and predict betting outcomes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Input
            placeholder="Enter text to analyze sentiment..."
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && runTest()}
          />
          <Button onClick={runTest} disabled={!testText.trim()} className="w-full">
            Analyze Sentiment
          </Button>
        </div>

        {/* Quick Examples */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Quick Examples:</p>
          <div className="grid gap-2">
            {examples.map((example, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setTestText(example)}
                className="text-left justify-start h-auto p-2 whitespace-normal"
              >
                "{example}"
              </Button>
            ))}
          </div>
        </div>

        {result && (
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                {getSentimentIcon(result.comparative)}
                Analysis Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Sentiment</p>
                  <Badge variant={result.comparative > 0.6 ? 'default' : result.comparative < -0.6 ? 'destructive' : 'secondary'}>
                    {getSentimentLabel(result.comparative)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Score</p>
                  <p className="text-lg font-bold">{result.comparative.toFixed(3)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Market Prediction (Threshold: 0.6)</p>
                <div className="flex gap-2">
                  <Badge variant={result.wouldWinYes ? 'default' : 'secondary'} className="flex items-center gap-1">
                    {result.wouldWinYes ? '✅' : '❌'} YES Bets {result.wouldWinYes ? 'WIN' : 'LOSE'}
                  </Badge>
                  <Badge variant={result.wouldWinNo ? 'default' : 'secondary'} className="flex items-center gap-1">
                    {result.wouldWinNo ? '✅' : '❌'} NO Bets {result.wouldWinNo ? 'WIN' : 'LOSE'}
                  </Badge>
                </div>
              </div>

              {result.positive.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-green-600">Positive Words:</p>
                  <p className="text-sm">{result.positive.join(', ')}</p>
                </div>
              )}

              {result.negative.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-red-600">Negative Words:</p>
                  <p className="text-sm">{result.negative.join(', ')}</p>
                </div>
              )}

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm">
                  <strong>How to use this:</strong> This is the exact same analysis that determines betting winners. 
                  If the score is above 0.6, YES bets win. If it's 0.6 or below, NO bets win.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}