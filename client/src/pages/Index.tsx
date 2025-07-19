import NostrMoodAnalyzer from '@/components/NostrMoodAnalyzer';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 py-2 px-2">
      <div className="container mx-auto max-w-2xl">
        <NostrMoodAnalyzer />
      </div>
    </div>
  );
};

export default Index;
