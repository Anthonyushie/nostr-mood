import PredictionMarketContainer from '@/components/PredictionMarket/PredictionMarketContainer';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 py-4 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            NostrMood Prediction Markets
          </h1>
          <p className="text-lg text-muted-foreground">
            Lightning-powered sentiment prediction markets on Nostr
          </p>
        </div>
        <PredictionMarketContainer />
      </div>
    </div>
  );
};

export default Index;
